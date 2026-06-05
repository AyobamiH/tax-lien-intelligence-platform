export interface EmailAddress {
  address: string;
  name?: string;
}

export interface EmailMessage {
  to: EmailAddress;
  from: EmailAddress;
  replyTo?: EmailAddress;
  subject: string;
  text: string;
}

export interface EmailSendResult {
  providerMessageId?: string;
}

export interface EmailTransport {
  providerId: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
