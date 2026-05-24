import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import type { RuntimeEnvironment } from "@tax-lien/types";

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/tax_lien_platform"),
  MONGODB_DB_NAME: z.string().min(1).default("tax_lien_platform"),
  JWT_SECRET: z.string().min(32).default("development-only-change-before-production"),
});

const parsedEnv = envSchema.parse(process.env);

export interface ApiConfig {
  nodeEnv: RuntimeEnvironment;
  port: number;
  mongoUri: string;
  mongoDbName: string;
  jwtSecret: string;
}

export const apiConfig: ApiConfig = {
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.API_PORT,
  mongoUri: parsedEnv.MONGODB_URI,
  mongoDbName: parsedEnv.MONGODB_DB_NAME,
  jwtSecret: parsedEnv.JWT_SECRET,
};
