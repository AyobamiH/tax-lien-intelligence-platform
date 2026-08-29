export type OAuthErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "unauthorized_client"
  | "unsupported_grant_type"
  | "invalid_scope"
  | "server_error";

export class OAuthError extends Error {
  public constructor(
    public readonly code: OAuthErrorCode,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}
