# Authentication Architecture

## Scope

Phase 2 adds the authentication and tenancy foundation for the Tax Lien
Intelligence Platform.

Implemented:

- user model;
- registration endpoint;
- login endpoint;
- password hashing;
- JWT issuance;
- JWT verification middleware;
- protected `GET /auth/me`;
- request validation;
- global API error handling;
- auth integration tests.

Not implemented:

- refresh tokens;
- role-based access control;
- user profile editing;
- password reset;
- email verification;
- tenant-owned parcel/dataset/watchlist models.

## User Model

The `UserModel` lives in `packages/db`.

Stored fields:

- `email`;
- `passwordHash`;
- `createdAt`;
- `updatedAt`.

The API returns safe user responses only:

- `id`;
- `email`;
- `createdAt`;
- `updatedAt`.

Password hashes are not returned by auth endpoints.

## Auth Service Boundary

The API auth service owns:

- registration logic;
- duplicate email checks;
- password hashing;
- credential validation;
- JWT signing;
- JWT verification;
- current-user lookup.

The route layer handles HTTP shape and delegates auth behavior to the service.

## JWT Boundary

Access tokens include:

- subject (`sub`) as the user id;
- email;
- token type `access`;
- expiration.

The middleware verifies the token and attaches the authenticated principal to the
request as `request.auth`.

Future user-owned routes must use `request.auth.userId` as the ownership source.
They must not accept trusted ownership from request bodies.

## Environment Boundary

`JWT_SECRET` is optional in development and test so the repo remains easy to run
locally.

In production, API startup fails if `JWT_SECRET` is missing. The development
fallback must never be treated as production-safe.

## Validation Boundary

Auth request payloads are validated with `zod`.

Registration requires:

- valid email;
- password length of 12-256 characters;
- at least one letter;
- at least one number.

Login requires:

- valid email;
- non-empty password.

Invalid payloads return stable safe errors.

## Error Boundary

The API now has a global error handler.

It handles:

- domain/API errors;
- validation failures;
- malformed JSON;
- unexpected server errors.

Production-style responses must not leak stack traces, password hashes, raw
database errors, or secrets.

## Tenancy Foundation

Phase 2 does not add parcel, dataset, score, or watchlist models. It establishes
the authenticated identity boundary those future models will use.

Future user-owned data must:

- include `userId`;
- derive user ownership from `request.auth.userId`;
- reject cross-user access;
- include tests for isolation.

## Testing Coverage

Auth integration tests cover:

- successful registration;
- password hash not returned;
- duplicate email rejection;
- successful login;
- invalid password rejection;
- invalid payload rejection;
- malformed JSON rejection;
- protected route without token;
- protected route with valid token;
- malformed auth header;
- invalid token;
- expired token.

## Drift Risks

Do not add user-owned routes that bypass `request.auth`.

Do not add client-supplied `userId` as trusted input.

Do not add refresh tokens, RBAC, or profile systems until they are explicitly in
scope.
