import {
  OAuthAuthorizationCodeModel,
  OAuthRefreshTokenModel,
  OAuthRevokedAccessTokenModel,
  type OAuthAuthorizationCodeDocument,
  type OAuthRefreshTokenDocument,
} from "@tax-lien/db";

export interface StoredAuthorizationCode {
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
}

export interface StoredRefreshToken {
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
}

export interface OAuthStore {
  createAuthorizationCode(record: StoredAuthorizationCode): Promise<void>;
  findAuthorizationCode(codeHash: string): Promise<StoredAuthorizationCode | null>;
  consumeAuthorizationCode(codeHash: string, now: Date): Promise<boolean>;
  createRefreshToken(record: StoredRefreshToken): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null>;
  consumeRefreshToken(tokenHash: string, now: Date): Promise<boolean>;
  revokeRefreshTokenFamily(familyId: string, now: Date): Promise<void>;
  revokeAccessToken(tokenId: string, expiresAt: Date, now: Date): Promise<void>;
  isAccessTokenRevoked(tokenId: string): Promise<boolean>;
}

function mapAuthorizationCode(document: OAuthAuthorizationCodeDocument): StoredAuthorizationCode {
  return {
    codeHash: document.codeHash,
    userId: document.userId,
    email: document.email,
    clientId: document.clientId,
    redirectUri: document.redirectUri,
    codeChallenge: document.codeChallenge,
    resource: document.resource,
    scopes: [...document.scopes],
    expiresAt: document.expiresAt,
    ...(document.consumedAt ? { consumedAt: document.consumedAt } : {}),
  };
}

function mapRefreshToken(document: OAuthRefreshTokenDocument): StoredRefreshToken {
  return {
    tokenHash: document.tokenHash,
    familyId: document.familyId,
    userId: document.userId,
    email: document.email,
    clientId: document.clientId,
    resource: document.resource,
    scopes: [...document.scopes],
    expiresAt: document.expiresAt,
    ...(document.consumedAt ? { consumedAt: document.consumedAt } : {}),
    ...(document.revokedAt ? { revokedAt: document.revokedAt } : {}),
  };
}

export class MongoOAuthStore implements OAuthStore {
  public async createAuthorizationCode(record: StoredAuthorizationCode): Promise<void> {
    await OAuthAuthorizationCodeModel.create(record);
  }

  public async findAuthorizationCode(codeHash: string): Promise<StoredAuthorizationCode | null> {
    const document = await OAuthAuthorizationCodeModel.findOne({ codeHash }).exec();
    return document ? mapAuthorizationCode(document) : null;
  }

  public async consumeAuthorizationCode(codeHash: string, now: Date): Promise<boolean> {
    const result = await OAuthAuthorizationCodeModel.updateOne(
      { codeHash, consumedAt: { $exists: false }, expiresAt: { $gt: now } },
      { $set: { consumedAt: now } },
    ).exec();
    return result.modifiedCount === 1;
  }

  public async createRefreshToken(record: StoredRefreshToken): Promise<void> {
    await OAuthRefreshTokenModel.create(record);
  }

  public async findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null> {
    const document = await OAuthRefreshTokenModel.findOne({ tokenHash }).exec();
    return document ? mapRefreshToken(document) : null;
  }

  public async consumeRefreshToken(tokenHash: string, now: Date): Promise<boolean> {
    const result = await OAuthRefreshTokenModel.updateOne(
      {
        tokenHash,
        consumedAt: { $exists: false },
        revokedAt: { $exists: false },
        expiresAt: { $gt: now },
      },
      { $set: { consumedAt: now } },
    ).exec();
    return result.modifiedCount === 1;
  }

  public async revokeRefreshTokenFamily(familyId: string, now: Date): Promise<void> {
    await OAuthRefreshTokenModel.updateMany(
      { familyId, revokedAt: { $exists: false } },
      { $set: { revokedAt: now } },
    ).exec();
  }

  public async revokeAccessToken(tokenId: string, expiresAt: Date, now: Date): Promise<void> {
    await OAuthRevokedAccessTokenModel.updateOne(
      { tokenId },
      { $setOnInsert: { tokenId, expiresAt, revokedAt: now } },
      { upsert: true },
    ).exec();
  }

  public async isAccessTokenRevoked(tokenId: string): Promise<boolean> {
    return Boolean(await OAuthRevokedAccessTokenModel.exists({ tokenId }));
  }
}
