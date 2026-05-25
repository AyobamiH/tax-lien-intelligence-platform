import { apiConfig } from "../config/env.js";
import { AuthService } from "./auth-service.js";
import { MongoUserStore } from "./user-store.js";

export function createAuthService(): AuthService {
  return new AuthService(new MongoUserStore(), {
    jwtSecret: apiConfig.jwtSecret,
    jwtExpiresIn: apiConfig.jwtExpiresIn,
    passwordSaltRounds: 12,
  });
}
