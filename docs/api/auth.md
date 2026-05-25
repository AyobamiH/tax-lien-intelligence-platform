# Auth API

Phase 2 introduces the first real application boundary: account creation, login,
JWT issuance, authenticated user lookup, and safe error handling.

## Security Model

- Passwords are hashed before storage.
- Plaintext passwords and password hashes are never returned by the API.
- JWTs are signed with `JWT_SECRET`.
- Production startup requires `JWT_SECRET`; the development fallback is not a
  production credential.
- Authenticated routes derive user identity from the verified token.
- Future user-owned resources must use the authenticated identity rather than a
  client-supplied `userId`.

## `POST /auth/register`

Creates a user account and returns an access token.

### Request

```json
{
  "email": "owner@example.com",
  "password": "StrongPass123"
}
```

Validation:

- `email` must be a valid email address.
- `password` must be 12-256 characters.
- `password` must contain at least one letter and one number.

### Response `201`

```json
{
  "token": "jwt-access-token",
  "user": {
    "id": "user-id",
    "email": "owner@example.com",
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  }
}
```

### Duplicate Email `409`

```json
{
  "error": {
    "code": "auth_email_already_registered",
    "message": "An account already exists for this email."
  }
}
```

## `POST /auth/login`

Authenticates an existing user and returns an access token.

### Request

```json
{
  "email": "owner@example.com",
  "password": "StrongPass123"
}
```

### Response `200`

```json
{
  "token": "jwt-access-token",
  "user": {
    "id": "user-id",
    "email": "owner@example.com",
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  }
}
```

### Invalid Credentials `401`

```json
{
  "error": {
    "code": "auth_invalid_credentials",
    "message": "Email or password is incorrect."
  }
}
```

The API intentionally uses the same error for missing account and wrong password
so it does not disclose which emails are registered.

## `GET /auth/me`

Returns the authenticated user.

### Request

```text
Authorization: Bearer <jwt-access-token>
```

### Response `200`

```json
{
  "user": {
    "id": "user-id",
    "email": "owner@example.com",
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  }
}
```

### Missing Token `401`

```json
{
  "error": {
    "code": "auth_missing_token",
    "message": "Authentication token is required."
  }
}
```

### Malformed Header `401`

```json
{
  "error": {
    "code": "auth_invalid_header",
    "message": "Authorization header must use Bearer token format."
  }
}
```

### Invalid Token `401`

```json
{
  "error": {
    "code": "auth_invalid_token",
    "message": "Authentication token is invalid."
  }
}
```

### Expired Token `401`

```json
{
  "error": {
    "code": "auth_token_expired",
    "message": "Authentication token has expired."
  }
}
```

## Shared Error Behavior

Invalid request payloads return:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Request payload is invalid."
  }
}
```

Malformed JSON returns:

```json
{
  "error": {
    "code": "invalid_json",
    "message": "Request body must be valid JSON."
  }
}
```
