export const MAX_INGRESS_BODY_BYTES = 1_048_576;

export type GatewayRoute = "health" | "readiness" | "oauth_discovery" | "oauth" | "mcp";

const routeMethods = new Map<string, { route: GatewayRoute; methods: ReadonlySet<string> }>([
  ["/healthz", { route: "health", methods: new Set(["GET"]) }],
  ["/readyz", { route: "readiness", methods: new Set(["GET"]) }],
  ["/.well-known/oauth-protected-resource", { route: "oauth_discovery", methods: new Set(["GET"]) }],
  ["/.well-known/oauth-protected-resource/mcp", { route: "oauth_discovery", methods: new Set(["GET"]) }],
  ["/.well-known/oauth-authorization-server", { route: "oauth_discovery", methods: new Set(["GET"]) }],
  ["/oauth/authorize", { route: "oauth", methods: new Set(["GET", "POST"]) }],
  ["/oauth/token", { route: "oauth", methods: new Set(["POST"]) }],
  ["/oauth/revoke", { route: "oauth", methods: new Set(["POST"]) }],
  ["/mcp", { route: "mcp", methods: new Set(["POST"]) }],
  ["/mcp/", { route: "mcp", methods: new Set(["POST"]) }],
]);

export function classifyGatewayRequest(method: string, pathname: string): GatewayRoute | null {
  const policy = routeMethods.get(pathname);
  if (!policy || !policy.methods.has(method.toUpperCase())) return null;
  return policy.route;
}

export function exceedsIngressBodyLimit(contentLength: string | null): boolean {
  if (contentLength === null) return false;
  const parsed = Number(contentLength);
  return !Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_INGRESS_BODY_BYTES;
}

export type BoundedRequestBody =
  | { accepted: true; body: ArrayBuffer | null }
  | { accepted: false; body: null };

export async function readBoundedRequestBody(
  request: Request,
  maximumBytes = MAX_INGRESS_BODY_BYTES,
): Promise<BoundedRequestBody> {
  if (!request.body) return { accepted: true, body: null };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel("ingress_body_limit_exceeded");
      return { accepted: false, body: null };
    }
    chunks.push(value);
  }

  const body = new ArrayBuffer(totalBytes);
  const view = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) {
    view.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { accepted: true, body };
}

export function isCanonicalOrigin(requestOrigin: string, configuredOrigin: string): boolean {
  try {
    const configured = new URL(configuredOrigin);
    return (
      configured.protocol === "https:" &&
      configured.pathname === "/" &&
      configured.search === "" &&
      configured.hash === "" &&
      configured.origin === requestOrigin
    );
  } catch {
    return false;
  }
}

export function buildForwardedHeaders(requestHeaders: Headers, url: URL): Headers {
  const headers = new Headers(requestHeaders);
  const cloudflareClient = requestHeaders.get("cf-connecting-ip");
  headers.set("x-forwarded-for", cloudflareClient ?? "127.0.0.1");
  headers.set("x-forwarded-proto", "https");
  headers.set("x-forwarded-host", url.host);
  return headers;
}
