import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface OAuthGrantRecord {
  grantId: string;
  userId: string;
  email: string;
  clientId: string;
  resource: string;
  scopes: string[];
  currentRefreshTokenHash: string;
  refreshExpiresAt: Date;
  purgeAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OAuthGrantDocument = HydratedDocument<OAuthGrantRecord>;

const oauthGrantSchema = new Schema<OAuthGrantRecord>(
  {
    grantId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    clientId: { type: String, required: true },
    resource: { type: String, required: true },
    scopes: { type: [String], required: true },
    currentRefreshTokenHash: { type: String, required: true },
    refreshExpiresAt: { type: Date, required: true },
    purgeAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

oauthGrantSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthGrantModel: Model<OAuthGrantRecord> =
  mongoose.models.OAuthGrant ?? mongoose.model<OAuthGrantRecord>("OAuthGrant", oauthGrantSchema);
