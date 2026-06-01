import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import type { RuntimeEnvironment } from "@tax-lien/types";

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/tax_lien_platform"),
  MONGODB_DB_NAME: z.string().min(1).default("tax_lien_platform"),
  JWT_SECRET: z.string().min(32).optional(),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  SCHEDULER_TICK_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  MAINTENANCE_SCAN_INTERVAL_MS: z.coerce.number().int().positive().default(3_600_000),
  MAINTENANCE_AUTO_REFRESH_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  MAINTENANCE_MAX_DATASETS_PER_RUN: z.coerce.number().int().positive().max(250).default(25),
  MAINTENANCE_MIN_REFRESH_INTERVAL_HOURS: z.coerce.number().int().positive().max(720).default(24),
  MAINTENANCE_FAILURE_SUPPRESSION_HOURS: z.coerce.number().int().positive().max(720).default(24),
  CENSUS_GEOCODER_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  CENSUS_GEOCODER_BASE_URL: z.string().url().default("https://geocoding.geo.census.gov"),
  CENSUS_GEOCODER_BENCHMARK: z.string().min(1).max(80).default("Public_AR_Current"),
  CENSUS_GEOCODER_TIMEOUT_MS: z.coerce.number().int().positive().max(10000).default(3000),
  CENSUS_GEOCODER_MAX_ROWS_PER_JOB: z.coerce.number().int().min(0).max(500).default(25),
  ENRICHMENT_FRESHNESS_WINDOW_DAYS: z.coerce.number().int().positive().max(365).default(30),
});

const developmentJwtSecret = "development-only-change-before-production";

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV === "production" && !parsedEnv.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production.");
}

if (parsedEnv.CENSUS_GEOCODER_ENABLED && !parsedEnv.CENSUS_GEOCODER_BASE_URL.startsWith("https://")) {
  throw new Error("CENSUS_GEOCODER_BASE_URL must use https when Census geocoding is enabled.");
}

export interface ApiConfig {
  nodeEnv: RuntimeEnvironment;
  port: number;
  mongoUri: string;
  mongoDbName: string;
  jwtSecret: string;
  jwtExpiresIn: "1h";
  workerPollIntervalMs: number;
  schedulerTickIntervalMs: number;
  maintenance: {
    scanIntervalMs: number;
    autoRefreshEnabled: boolean;
    maxDatasetsPerRun: number;
    minRefreshIntervalHours: number;
    failureSuppressionHours: number;
  };
  externalEnrichment: {
    freshnessWindowDays: number;
    censusGeocoder: {
      enabled: boolean;
      baseUrl: string;
      benchmark: string;
      timeoutMs: number;
      maxRowsPerJob: number;
    };
  };
}

export const apiConfig: ApiConfig = {
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.API_PORT,
  mongoUri: parsedEnv.MONGODB_URI,
  mongoDbName: parsedEnv.MONGODB_DB_NAME,
  jwtSecret: parsedEnv.JWT_SECRET ?? developmentJwtSecret,
  jwtExpiresIn: "1h",
  workerPollIntervalMs: parsedEnv.WORKER_POLL_INTERVAL_MS,
  schedulerTickIntervalMs: parsedEnv.SCHEDULER_TICK_INTERVAL_MS,
  maintenance: {
    scanIntervalMs: parsedEnv.MAINTENANCE_SCAN_INTERVAL_MS,
    autoRefreshEnabled: parsedEnv.MAINTENANCE_AUTO_REFRESH_ENABLED,
    maxDatasetsPerRun: parsedEnv.MAINTENANCE_MAX_DATASETS_PER_RUN,
    minRefreshIntervalHours: parsedEnv.MAINTENANCE_MIN_REFRESH_INTERVAL_HOURS,
    failureSuppressionHours: parsedEnv.MAINTENANCE_FAILURE_SUPPRESSION_HOURS,
  },
  externalEnrichment: {
    freshnessWindowDays: parsedEnv.ENRICHMENT_FRESHNESS_WINDOW_DAYS,
    censusGeocoder: {
      enabled: parsedEnv.CENSUS_GEOCODER_ENABLED,
      baseUrl: parsedEnv.CENSUS_GEOCODER_BASE_URL,
      benchmark: parsedEnv.CENSUS_GEOCODER_BENCHMARK,
      timeoutMs: parsedEnv.CENSUS_GEOCODER_TIMEOUT_MS,
      maxRowsPerJob: parsedEnv.CENSUS_GEOCODER_MAX_ROWS_PER_JOB,
    },
  },
};
