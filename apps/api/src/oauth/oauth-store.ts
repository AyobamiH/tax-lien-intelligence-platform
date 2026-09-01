import {
  OAuthAuthorizationCodeModel,
  OAuthGrantModel,
  OAuthRefreshTokenModel,
  OAuthRevokedAccessTokenModel,
  type OAuthAuthorizationCodeDocument,
  type OAuthGrantDocument,
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

export interface StoredOAuthGrant {
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
}

export interface OAuthStore {
  createAuthorizationCode(record: StoredAuthorizationCode): Promise<void>;
  findAuthorizationCode(codeHash: string): Promise<StoredAuthorizationCode | null>;
  consumeAuthorizationCode(codeHash: string, now: Date): Promise<boolean>;
  createGrantWithRefreshToken(grant: StoredOAuthGrant, refreshToken: StoredRefreshToken): Promise<void>;
  findGrant(grantId: string): Promise<StoredOAuthGrant | null>;
  findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null>;
  rotateRefreshToken(
    grantId: string,
    currentTokenHash: string,
    successor: StoredRefreshToken,
    now: Date,
  ): Promise<boolean>;
  revokeGrant(grantId: string, now: Date): Promise<void>;
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

function mapGrant(document: OAuthGrantDocument): StoredOAuthGrant {
  return {
    grantId: document.grantId,
    userId: document.userId,
    email: document.email,
    clientId: document.clientId,
    resource: document.resource,
    scopes: [...document.scopes],
    currentRefreshTokenHash: document.currentRefreshTokenHash,
    refreshExpiresAt: document.refreshExpiresAt,
    purgeAt: document.purgeAt,
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

  public async createGrantWithRefreshToken(
    grant: StoredOAuthGrant,
    refreshToken: StoredRefreshToken,
  ): Promise<void> {
    await OAuthRefreshTokenModel.create(refreshToken);
    try {
      await OAuthGrantModel.create(grant);
    } catch (error) {
      await OAuthRefreshTokenModel.deleteOne({ tokenHash: refreshToken.tokenHash }).exec();
      throw error;
    }
  }

  public async findGrant(grantId: string): Promise<StoredOAuthGrant | null> {
    const document = await OAuthGrantModel.findOne({ grantId }).exec();
    return document ? mapGrant(document) : null;
  }

  public async findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null> {
    const document = await OAuthRefreshTokenModel.findOne({ tokenHash }).exec();
    return document ? mapRefreshToken(document) : null;
  }

  public async rotateRefreshToken(
    grantId: string,
    currentTokenHash: string,
    successor: StoredRefreshToken,
    now: Date,
  ): Promise<boolean> {
    await OAuthRefreshTokenModel.create(successor);
    let rotated = false;
    try {
      const result = await OAuthGrantModel.updateOne(
        {
          grantId,
          currentRefreshTokenHash: currentTokenHash,
          revokedAt: { $exists: false },
          refreshExpiresAt: { $gt: now },
        },
        { $set: { currentRefreshTokenHash: successor.tokenHash } },
      ).exec();
      rotated = result.modifiedCount === 1;
      if (!rotated) return false;

      await OAuthRefreshTokenModel.updateOne(
        { tokenHash: currentTokenHash, consumedAt: { $exists: false } },
        { $set: { consumedAt: now } },
      ).exec();
      return true;
    } finally {
      if (!rotated) {
        await OAuthRefreshTokenModel.deleteOne({ tokenHash: successor.tokenHash }).exec();
      }
    }
  }

  public async revokeGrant(grantId: string, now: Date): Promise<void> {
    await OAuthGrantModel.updateOne(
      { grantId, revokedAt: { $exists: false } },
      { $set: { revokedAt: now } },
    ).exec();
    await OAuthRefreshTokenModel.updateMany(
      { familyId: grantId, revokedAt: { $exists: false } },
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
