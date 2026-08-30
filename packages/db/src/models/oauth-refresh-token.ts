import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface OAuthRefreshTokenRecord {
  tokenHash: string;
  familyId: string;
  userId: string;
  email: string;
  clientId: string;
  resource: string;
  scopes: string[];
  expiresAt: Date;
  consumedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OAuthRefreshTokenDocument = HydratedDocument<OAuthRefreshTokenRecord>;

const oauthRefreshTokenSchema = new Schema<OAuthRefreshTokenRecord>(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    familyId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    clientId: { type: String, required: true },
    resource: { type: String, required: true },
    scopes: { type: [String], required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
    revokedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

oauthRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthRefreshTokenModel: Model<OAuthRefreshTokenRecord> =
  mongoose.models.OAuthRefreshToken ??
  mongoose.model<OAuthRefreshTokenRecord>("OAuthRefreshToken", oauthRefreshTokenSchema);
