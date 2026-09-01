import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import type { RuntimeEnvironment } from "@tax-lien/types";

loadDotenv();

const emptyStringToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SOURCE_REVISION: z.preprocess(
    emptyStringToUndefined,
    z.string().regex(/^[0-9a-f]{40}$/u).optional(),
  ),
  API_PORT: z.coerce.number().int().positive().default(4000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  OPERATIONAL_LOGGING_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/tax_lien_platform"),
  MONGODB_DB_NAME: z.string().min(1).default("tax_lien_platform"),
  JWT_SECRET: z.string().min(32).optional(),
  CORS_ALLOWED_ORIGINS: z.preprocess(emptyStringToUndefined, z.string().optional()),
  SCORING_REQUEST_LIMIT_WINDOW_MS: z.coerce.number().int().positive().max(3_600_000).default(60_000),
  SCORING_REQUEST_LIMIT_MAX: z.coerce.number().int().positive().max(1_000).default(20),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  SCHEDULER_TICK_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  MAINTENANCE_SCAN_INTERVAL_MS: z.coerce.number().int().positive().default(3_600_000),
  MAINTENANCE_AUTO_REFRESH_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  MAINTENANCE_MAX_DATASETS_PER_RUN: z.coerce.number().int().positive().max(250).default(25),
  MAINTENANCE_MIN_REFRESH_INTERVAL_HOURS: z.coerce.number().int().positive().max(720).default(24),
  MAINTENANCE_FAILURE_SUPPRESSION_HOURS: z.coerce.number().int().positive().max(720).default(24),
  FOLLOW_UP_REMINDER_INTERVAL_MS: z.coerce.number().int().positive().default(3_600_000),
  CENSUS_GEOCODER_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  CENSUS_GEOCODER_BASE_URL: z.string().url().default("https://geocoding.geo.census.gov"),
  CENSUS_GEOCODER_BENCHMARK: z.string().min(1).max(80).default("Public_AR_Current"),
  CENSUS_GEOCODER_TIMEOUT_MS: z.coerce.number().int().positive().max(10000).default(3000),
  CENSUS_GEOCODER_MAX_ROWS_PER_JOB: z.coerce.number().int().min(0).max(500).default(25),
  ENRICHMENT_FRESHNESS_WINDOW_DAYS: z.coerce.number().int().positive().max(365).default(30),
  INTELLIGENCE_SERVICE_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  INTELLIGENCE_SERVICE_BASE_URL: z.string().url().default("http://127.0.0.1:8081"),
  INTELLIGENCE_SERVICE_TOKEN: z.preprocess(emptyStringToUndefined, z.string().min(32).optional()),
  INTELLIGENCE_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().max(30000).default(5000),
  INTELLIGENCE_SERVICE_MAX_CONCURRENCY: z.coerce.number().int().positive().max(32).default(8),
  MCP_APP_BASE_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  MCP_OAUTH_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  MCP_OAUTH_ISSUER_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  MCP_OAUTH_RESOURCE_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  MCP_OAUTH_ALLOWED_CLIENT_IDS: z.string().default("https://chatgpt.com/oauth/client.json"),
  MCP_OAUTH_ALLOWED_REDIRECT_URIS: z.string().default("https://chatgpt.com/connector_platform_oauth_redirect"),
  MCP_OAUTH_SCOPE: z.string().trim().min(1).max(120).default("tax_lien:read"),
  MCP_OAUTH_SIGNING_SECRET: z.preprocess(emptyStringToUndefined, z.string().min(32).optional()),
  MCP_OAUTH_AUTHORIZATION_CODE_TTL_SECONDS: z.coerce.number().int().min(60).max(600).default(300),
  MCP_OAUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(3600).default(900),
  MCP_OAUTH_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(3600).max(2_592_000).default(604800),
  MCP_OAUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(3_600_000).default(60_000),
  MCP_OAUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000).default(30),
  EMAIL_DELIVERY_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  EMAIL_FROM_ADDRESS: z.preprocess(emptyStringToUndefined, z.string().email().optional()),
  EMAIL_FROM_NAME: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).max(120).optional(),
  ).default("Tax Lien Intelligence Platform"),
  EMAIL_REPLY_TO: z.preprocess(emptyStringToUndefined, z.string().email().optional()),
  EMAIL_APP_BASE_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  SMTP_HOST: z.preprocess(emptyStringToUndefined, z.string().trim().min(1).optional()),
  SMTP_PORT: z.coerce.number().int().positive().max(65535).default(465),
  SMTP_USERNAME: z.preprocess(emptyStringToUndefined, z.string().trim().min(1).optional()),
  SMTP_PASSWORD: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  SMTP_SECURE: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  SMTP_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().max(60000).default(10000),
  EMAIL_DIGEST_PROCESSING_INTERVAL_MS: z.coerce.number().int().positive().default(86_400_000),
  EMAIL_DIGEST_MAX_USERS_PER_RUN: z.coerce.number().int().positive().max(1000).default(100),
  EMAIL_DIGEST_MAX_ITEMS_PER_BATCH: z.coerce.number().int().positive().max(200).default(50),
});

const developmentJwtSecret = "development-only-change-before-production";

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV === "production" && !parsedEnv.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production.");
}

if (parsedEnv.CENSUS_GEOCODER_ENABLED && !parsedEnv.CENSUS_GEOCODER_BASE_URL.startsWith("https://")) {
  throw new Error("CENSUS_GEOCODER_BASE_URL must use https when Census geocoding is enabled.");
}

if (parsedEnv.INTELLIGENCE_SERVICE_ENABLED && !parsedEnv.INTELLIGENCE_SERVICE_TOKEN) {
  throw new Error("INTELLIGENCE_SERVICE_TOKEN is required when the intelligence service is enabled.");
}

if (
  parsedEnv.NODE_ENV === "production" &&
  parsedEnv.MCP_APP_BASE_URL &&
  !parsedEnv.MCP_APP_BASE_URL.startsWith("https://")
) {
  throw new Error("MCP_APP_BASE_URL must use https in production.");
}

if (
  parsedEnv.MCP_OAUTH_ENABLED &&
  (!parsedEnv.MCP_OAUTH_ISSUER_URL ||
    !parsedEnv.MCP_OAUTH_RESOURCE_URL ||
    !parsedEnv.MCP_OAUTH_SIGNING_SECRET)
) {
  throw new Error(
    "MCP_OAUTH_ISSUER_URL, MCP_OAUTH_RESOURCE_URL, and MCP_OAUTH_SIGNING_SECRET are required when MCP OAuth is enabled.",
  );
}

if (
  parsedEnv.NODE_ENV === "production" &&
  parsedEnv.MCP_OAUTH_ENABLED &&
  (!parsedEnv.MCP_OAUTH_ISSUER_URL?.startsWith("https://") ||
    !parsedEnv.MCP_OAUTH_RESOURCE_URL?.startsWith("https://"))
) {
  throw new Error("MCP OAuth issuer and resource URLs must use https in production.");
}

const oauthAllowedClientIds = parsedEnv.MCP_OAUTH_ALLOWED_CLIENT_IDS.split(",").map((value) => value.trim()).filter(Boolean);
const oauthAllowedRedirectUris = parsedEnv.MCP_OAUTH_ALLOWED_REDIRECT_URIS.split(",").map((value) => value.trim()).filter(Boolean);

if (parsedEnv.MCP_OAUTH_ENABLED) {
  const issuer = new URL(parsedEnv.MCP_OAUTH_ISSUER_URL as string);
  const resource = new URL(parsedEnv.MCP_OAUTH_RESOURCE_URL as string);
  if (
    issuer.pathname !== "/" ||
    issuer.search ||
    issuer.hash ||
    resource.origin !== issuer.origin ||
    resource.pathname.replace(/\/$/, "") !== "/mcp" ||
    resource.search ||
    resource.hash
  ) {
    throw new Error("MCP OAuth must use an origin-only issuer and the same origin's /mcp resource URL.");
  }
  if (oauthAllowedClientIds.length === 0 || oauthAllowedRedirectUris.length === 0) {
    throw new Error("MCP OAuth requires non-empty exact client and redirect URI allowlists.");
  }
  for (const value of [...oauthAllowedClientIds, ...oauthAllowedRedirectUris]) {
    const url = new URL(value);
    if (parsedEnv.NODE_ENV === "production" && url.protocol !== "https:") {
      throw new Error("MCP OAuth client identifiers and redirect URIs must use https in production.");
    }
  }
}

const emailDeliveryEnabled =
  parsedEnv.EMAIL_DELIVERY_ENABLED && Boolean(parsedEnv.EMAIL_FROM_ADDRESS && parsedEnv.SMTP_HOST);

const allowedCorsOrigins =
  parsedEnv.CORS_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

export interface ApiConfig {
  nodeEnv: RuntimeEnvironment;
  sourceRevision?: string;
  port: number;
  trustProxyHops: number;
  operationalLoggingEnabled: boolean;
  mongoUri: string;
  mongoDbName: string;
  jwtSecret: string;
  jwtExpiresIn: "1h";
  cors: {
    allowedOrigins: string[];
  };
  rateLimits: {
    scoringRequests: {
      windowMs: number;
      maxRequests: number;
    };
  };
  workerPollIntervalMs: number;
  schedulerTickIntervalMs: number;
  maintenance: {
    scanIntervalMs: number;
    autoRefreshEnabled: boolean;
    maxDatasetsPerRun: number;
    minRefreshIntervalHours: number;
    failureSuppressionHours: number;
  };
  followUps: {
    reminderIntervalMs: number;
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
  intelligence: {
    enabled: boolean;
    baseUrl: string;
    serviceToken?: string;
    timeoutMs: number;
    maxConcurrency: number;
  };
  mcp: {
    appBaseUrl?: string;
    oauth: {
      enabled: boolean;
      issuerUrl: string;
      resourceUrl: string;
      allowedClientIds: string[];
      allowedRedirectUris: string[];
      scope: string;
      signingSecret: string;
      authorizationCodeTtlSeconds: number;
      accessTokenTtlSeconds: number;
      refreshTokenTtlSeconds: number;
      rateLimit: {
        windowMs: number;
        maxRequests: number;
      };
    };
  };
  email: {
    enabled: boolean;
    provider: "smtp";
    fromAddress?: string;
    fromName: string;
    replyTo?: string;
    appBaseUrl?: string;
    smtp: {
      host?: string;
      port: number;
      username?: string;
      password?: string;
      secure: boolean;
      connectionTimeoutMs: number;
    };
    digest: {
      processingIntervalMs: number;
      maxUsersPerRun: number;
      maxItemsPerBatch: number;
    };
  };
}

export const apiConfig: ApiConfig = {
  nodeEnv: parsedEnv.NODE_ENV,
  ...(parsedEnv.SOURCE_REVISION ? { sourceRevision: parsedEnv.SOURCE_REVISION } : {}),
  port: parsedEnv.API_PORT,
  trustProxyHops: parsedEnv.TRUST_PROXY_HOPS,
  operationalLoggingEnabled: parsedEnv.OPERATIONAL_LOGGING_ENABLED,
  mongoUri: parsedEnv.MONGODB_URI,
  mongoDbName: parsedEnv.MONGODB_DB_NAME,
  jwtSecret: parsedEnv.JWT_SECRET ?? developmentJwtSecret,
  jwtExpiresIn: "1h",
  cors: {
    allowedOrigins: allowedCorsOrigins,
  },
  rateLimits: {
    scoringRequests: {
      windowMs: parsedEnv.SCORING_REQUEST_LIMIT_WINDOW_MS,
      maxRequests: parsedEnv.SCORING_REQUEST_LIMIT_MAX,
    },
  },
  workerPollIntervalMs: parsedEnv.WORKER_POLL_INTERVAL_MS,
  schedulerTickIntervalMs: parsedEnv.SCHEDULER_TICK_INTERVAL_MS,
  maintenance: {
    scanIntervalMs: parsedEnv.MAINTENANCE_SCAN_INTERVAL_MS,
    autoRefreshEnabled: parsedEnv.MAINTENANCE_AUTO_REFRESH_ENABLED,
    maxDatasetsPerRun: parsedEnv.MAINTENANCE_MAX_DATASETS_PER_RUN,
    minRefreshIntervalHours: parsedEnv.MAINTENANCE_MIN_REFRESH_INTERVAL_HOURS,
    failureSuppressionHours: parsedEnv.MAINTENANCE_FAILURE_SUPPRESSION_HOURS,
  },
  followUps: {
    reminderIntervalMs: parsedEnv.FOLLOW_UP_REMINDER_INTERVAL_MS,
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
  intelligence: {
    enabled: parsedEnv.INTELLIGENCE_SERVICE_ENABLED,
    baseUrl: parsedEnv.INTELLIGENCE_SERVICE_BASE_URL,
    ...(parsedEnv.INTELLIGENCE_SERVICE_TOKEN
      ? { serviceToken: parsedEnv.INTELLIGENCE_SERVICE_TOKEN }
      : {}),
    timeoutMs: parsedEnv.INTELLIGENCE_SERVICE_TIMEOUT_MS,
    maxConcurrency: parsedEnv.INTELLIGENCE_SERVICE_MAX_CONCURRENCY,
  },
  mcp: {
    ...(parsedEnv.MCP_APP_BASE_URL ? { appBaseUrl: parsedEnv.MCP_APP_BASE_URL } : {}),
    oauth: {
      enabled: parsedEnv.MCP_OAUTH_ENABLED,
      issuerUrl: parsedEnv.MCP_OAUTH_ISSUER_URL?.replace(/\/$/, "") ?? "",
      resourceUrl: parsedEnv.MCP_OAUTH_RESOURCE_URL?.replace(/\/$/, "") ?? "",
      allowedClientIds: oauthAllowedClientIds,
      allowedRedirectUris: oauthAllowedRedirectUris,
      scope: parsedEnv.MCP_OAUTH_SCOPE,
      signingSecret: parsedEnv.MCP_OAUTH_SIGNING_SECRET ?? "",
      authorizationCodeTtlSeconds: parsedEnv.MCP_OAUTH_AUTHORIZATION_CODE_TTL_SECONDS,
      accessTokenTtlSeconds: parsedEnv.MCP_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenTtlSeconds: parsedEnv.MCP_OAUTH_REFRESH_TOKEN_TTL_SECONDS,
      rateLimit: {
        windowMs: parsedEnv.MCP_OAUTH_RATE_LIMIT_WINDOW_MS,
        maxRequests: parsedEnv.MCP_OAUTH_RATE_LIMIT_MAX,
      },
    },
  },
  email: {
    enabled: emailDeliveryEnabled,
    provider: "smtp",
    ...(parsedEnv.EMAIL_FROM_ADDRESS ? { fromAddress: parsedEnv.EMAIL_FROM_ADDRESS } : {}),
    fromName: parsedEnv.EMAIL_FROM_NAME,
    ...(parsedEnv.EMAIL_REPLY_TO ? { replyTo: parsedEnv.EMAIL_REPLY_TO } : {}),
    ...(parsedEnv.EMAIL_APP_BASE_URL ? { appBaseUrl: parsedEnv.EMAIL_APP_BASE_URL } : {}),
    smtp: {
      ...(parsedEnv.SMTP_HOST ? { host: parsedEnv.SMTP_HOST } : {}),
      port: parsedEnv.SMTP_PORT,
      ...(parsedEnv.SMTP_USERNAME ? { username: parsedEnv.SMTP_USERNAME } : {}),
      ...(parsedEnv.SMTP_PASSWORD ? { password: parsedEnv.SMTP_PASSWORD } : {}),
      secure: parsedEnv.SMTP_SECURE,
      connectionTimeoutMs: parsedEnv.SMTP_CONNECTION_TIMEOUT_MS,
    },
    digest: {
      processingIntervalMs: parsedEnv.EMAIL_DIGEST_PROCESSING_INTERVAL_MS,
      maxUsersPerRun: parsedEnv.EMAIL_DIGEST_MAX_USERS_PER_RUN,
      maxItemsPerBatch: parsedEnv.EMAIL_DIGEST_MAX_ITEMS_PER_BATCH,
    },
  },
};
