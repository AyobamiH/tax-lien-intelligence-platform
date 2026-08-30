import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface OAuthAuthorizationCodeRecord {
  codeHash: string;
  userId: string;
  email: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  scopes: string[];
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OAuthAuthorizationCodeDocument = HydratedDocument<OAuthAuthorizationCodeRecord>;

const oauthAuthorizationCodeSchema = new Schema<OAuthAuthorizationCodeRecord>(
  {
    codeHash: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    clientId: { type: String, required: true },
    redirectUri: { type: String, required: true },
    codeChallenge: { type: String, required: true },
    resource: { type: String, required: true },
    scopes: { type: [String], required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

oauthAuthorizationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthAuthorizationCodeModel: Model<OAuthAuthorizationCodeRecord> =
  mongoose.models.OAuthAuthorizationCode ??
  mongoose.model<OAuthAuthorizationCodeRecord>("OAuthAuthorizationCode", oauthAuthorizationCodeSchema);
