import { randomUUID } from "node:crypto";
import net, { type Socket } from "node:net";
import { hostname } from "node:os";
import tls, { type TLSSocket } from "node:tls";
import type { ApiConfig } from "../config/env.js";
import type { EmailMessage, EmailSendResult, EmailTransport } from "./email-transport.js";

type SmtpSocket = Socket | TLSSocket;

export class SmtpEmailTransport implements EmailTransport {
  public readonly providerId = "smtp";
  private readonly config: ApiConfig["email"]["smtp"];

  public constructor(config: ApiConfig["email"]["smtp"]) {
    this.config = config;
  }

  public async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.config.host) {
      throw new Error("SMTP host is not configured.");
    }

    const socket = await connectSmtpSocket(this.config);
    const session = new SmtpSession(socket);

    try {
      await session.expect([220]);
      await sendCommand(session, `EHLO ${hostname() || "localhost"}`, [250]);

      if (this.config.username && this.config.password) {
        const authPayload = Buffer.from(`\u0000${this.config.username}\u0000${this.config.password}`, "utf8").toString(
          "base64",
        );
        await sendCommand(session, `AUTH PLAIN ${authPayload}`, [235]);
      }

      await sendCommand(session, `MAIL FROM:<${message.from.address}>`, [250]);
      await sendCommand(session, `RCPT TO:<${message.to.address}>`, [250, 251]);
      await sendCommand(session, "DATA", [354]);

      const providerMessageId = `${randomUUID()}@tax-lien-platform.local`;
      await writeSmtpData(session, formatSmtpMessage(message, providerMessageId));
      await sendCommand(session, "QUIT", [221]);

      return { providerMessageId };
    } finally {
      socket.destroy();
    }
  }
}

async function connectSmtpSocket(config: ApiConfig["email"]["smtp"]): Promise<SmtpSocket> {
  if (!config.host) {
    throw new Error("SMTP host is not configured.");
  }

  return new Promise((resolve, reject) => {
    const onConnect = (): void => {
      socket.removeListener("error", reject);
      socket.removeListener("timeout", onTimeout);
      resolve(socket);
    };
    const onTimeout = (): void => {
      socket.destroy();
      reject(new Error("SMTP connection timed out."));
    };
    const socket: SmtpSocket = config.secure
      ? tls.connect({ host: config.host, port: config.port, servername: config.host }, onConnect)
      : net.connect({ host: config.host, port: config.port }, onConnect);

    socket.setTimeout(config.connectionTimeoutMs);
    socket.once("error", reject);
    socket.once("timeout", onTimeout);
  });
}

async function sendCommand(session: SmtpSession, command: string, expectedCodes: number[]): Promise<string> {
  const response = session.expect(expectedCodes);
  session.writeLine(command);
  return response;
}

async function writeSmtpData(session: SmtpSession, body: string): Promise<string> {
  const response = session.expect([250]);
  session.write(`${dotStuff(body)}\r\n.\r\n`);
  return response;
}

class SmtpSession {
  private buffer = "";
  private readonly waiters: Array<{
    expectedCodes: number[];
    resolve: (response: string) => void;
    reject: (error: Error) => void;
  }> = [];

  public constructor(private readonly socket: SmtpSocket) {
    this.socket.on("data", (chunk) => {
      this.buffer += chunk.toString("utf8");
      this.flushWaiters();
    });
    this.socket.on("error", (error) => {
      this.rejectAll(error instanceof Error ? error : new Error("SMTP socket error."));
    });
    this.socket.on("timeout", () => {
      this.rejectAll(new Error("SMTP response timed out."));
    });
  }

  public expect(expectedCodes: number[]): Promise<string> {
    return new Promise((resolve, reject) => {
      this.waiters.push({ expectedCodes, resolve, reject });
      this.flushWaiters();
    });
  }

  public writeLine(line: string): void {
    this.write(`${line}\r\n`);
  }

  public write(value: string): void {
    this.socket.write(value);
  }

  private flushWaiters(): void {
    const waiter = this.waiters[0];
    if (!waiter) {
      return;
    }

    const response = readCompleteSmtpResponse(this.buffer);
    if (!response) {
      return;
    }

    this.buffer = response.remaining;
    this.waiters.shift();

    if (!waiter.expectedCodes.includes(response.code)) {
      waiter.reject(new Error(`SMTP server returned ${response.code}: ${response.text}`));
      return;
    }

    waiter.resolve(response.text);
  }

  private rejectAll(error: Error): void {
    while (this.waiters.length > 0) {
      this.waiters.shift()?.reject(error);
    }
  }
}

function readCompleteSmtpResponse(buffer: string): { code: number; text: string; remaining: string } | null {
  const lines = buffer.split(/\r?\n/);
  const completeLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    completeLines.push(line);
    const match = /^(\d{3})([ -])/.exec(line);
    if (match?.[2] === " ") {
      const consumed = completeLines.join("\r\n").length + 2;
      return {
        code: Number(match[1]),
        text: completeLines.join("\n"),
        remaining: buffer.slice(consumed),
      };
    }
  }

  return null;
}

function formatSmtpMessage(message: EmailMessage, providerMessageId: string): string {
  const headers = [
    `Message-ID: <${providerMessageId}>`,
    `Date: ${new Date().toUTCString()}`,
    `From: ${formatAddress(message.from)}`,
    `To: ${formatAddress(message.to)}`,
    ...(message.replyTo ? [`Reply-To: ${formatAddress(message.replyTo)}`] : []),
    `Subject: ${sanitizeHeader(message.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
  ];

  return `${headers.join("\r\n")}\r\n\r\n${message.text}`;
}

function formatAddress(address: { address: string; name?: string }): string {
  if (!address.name) {
    return `<${address.address}>`;
  }

  return `"${sanitizeHeader(address.name).replaceAll('"', '\\"')}" <${address.address}>`;
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function dotStuff(value: string): string {
  return value
    .replace(/\r?\n/g, "\r\n")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}
