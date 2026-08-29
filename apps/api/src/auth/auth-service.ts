import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AuthSuccessResponse, AuthUserResponse, AuthenticatedPrincipal } from "@tax-lien/types";
import { ApiError } from "../errors/api-error.js";
import type { LoginPayload, RegisterPayload } from "./validation.js";
import type { StoredUser, UserStore } from "./user-store.js";

export interface AuthServiceConfig {
  jwtSecret: string;
  jwtExpiresIn: "1h";
  passwordSaltRounds: number;
}

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  type: "access";
}

export class AuthService {
  private readonly userStore: UserStore;
  private readonly config: AuthServiceConfig;

  public constructor(userStore: UserStore, config: AuthServiceConfig) {
    this.userStore = userStore;
    this.config = config;
  }

  public async register(payload: RegisterPayload): Promise<AuthSuccessResponse> {
    const existingUser = await this.userStore.findByEmail(payload.email);
    if (existingUser) {
      throw new ApiError(409, "auth_email_already_registered", "An account already exists for this email.");
    }

    const passwordHash = await bcrypt.hash(payload.password, this.config.passwordSaltRounds);
    const user = await this.userStore.createUser({
      email: payload.email,
      passwordHash,
    });

    return this.authSuccess(user);
  }

  public async login(payload: LoginPayload): Promise<AuthSuccessResponse> {
    const user = await this.verifyCredentials(payload);
    return this.authSuccess(user);
  }

  public async authenticateUser(payload: LoginPayload): Promise<AuthUserResponse> {
    return toAuthUserResponse(await this.verifyCredentials(payload));
  }

  private async verifyCredentials(payload: LoginPayload): Promise<StoredUser> {
    const user = await this.userStore.findByEmail(payload.email);
    if (!user) {
      throw new ApiError(401, "auth_invalid_credentials", "Email or password is incorrect.");
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      throw new ApiError(401, "auth_invalid_credentials", "Email or password is incorrect.");
    }

    return user;
  }

  public verifyToken(token: string): AuthenticatedPrincipal {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret);
      if (!isAccessTokenPayload(decoded)) {
        throw new ApiError(401, "auth_invalid_token", "Authentication token is invalid.");
      }

      return {
        userId: decoded.sub,
        email: decoded.email,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, "auth_token_expired", "Authentication token has expired.");
      }

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(401, "auth_invalid_token", "Authentication token is invalid.");
    }
  }

  public async getCurrentUser(userId: string): Promise<AuthUserResponse> {
    const user = await this.userStore.findById(userId);
    if (!user) {
      throw new ApiError(401, "auth_user_not_found", "Authenticated user no longer exists.");
    }

    return toAuthUserResponse(user);
  }

  private authSuccess(user: StoredUser): AuthSuccessResponse {
    return {
      token: this.issueToken(user),
      user: toAuthUserResponse(user),
    };
  }

  private issueToken(user: StoredUser): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      type: "access",
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn,
    });
  }
}

export function toAuthUserResponse(user: StoredUser): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function isAccessTokenPayload(decoded: string | JwtPayload): decoded is AccessTokenPayload {
  return (
    typeof decoded !== "string" &&
    typeof decoded.sub === "string" &&
    typeof decoded.email === "string" &&
    decoded.type === "access"
  );
}
