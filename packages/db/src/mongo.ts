import mongoose, { type ConnectOptions } from "mongoose";

export interface MongoConnectionConfig {
  uri: string;
  dbName?: string;
  serverSelectionTimeoutMs?: number;
}

export type MongoConnectionState = "disconnected" | "connected" | "connecting" | "disconnecting";

const readyStateLabels: Record<number, MongoConnectionState> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

export function getMongoConnectionState(): MongoConnectionState {
  return readyStateLabels[mongoose.connection.readyState] ?? "disconnected";
}

export async function connectMongo(config: MongoConnectionConfig): Promise<typeof mongoose> {
  const trimmedUri = config.uri.trim();
  if (!trimmedUri) {
    throw new Error("MongoDB URI is required.");
  }

  if (getMongoConnectionState() === "connected") {
    return mongoose;
  }

  const options: ConnectOptions = {
    serverSelectionTimeoutMS: config.serverSelectionTimeoutMs ?? 5000,
  };

  if (config.dbName?.trim()) {
    options.dbName = config.dbName.trim();
  }

  return mongoose.connect(trimmedUri, options);
}

export async function disconnectMongo(): Promise<void> {
  if (getMongoConnectionState() === "disconnected") return;
  await mongoose.disconnect();
}
