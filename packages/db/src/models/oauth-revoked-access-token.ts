import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface OAuthRevokedAccessTokenRecord {
  tokenId: string;
  expiresAt: Date;
  revokedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OAuthRevokedAccessTokenDocument = HydratedDocument<OAuthRevokedAccessTokenRecord>;

const oauthRevokedAccessTokenSchema = new Schema<OAuthRevokedAccessTokenRecord>(
  {
    tokenId: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

oauthRevokedAccessTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthRevokedAccessTokenModel: Model<OAuthRevokedAccessTokenRecord> =
  mongoose.models.OAuthRevokedAccessToken ??
  mongoose.model<OAuthRevokedAccessTokenRecord>(
    "OAuthRevokedAccessToken",
    oauthRevokedAccessTokenSchema,
  );
