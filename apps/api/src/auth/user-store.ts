import type { UserDocument } from "@tax-lien/db";
import { UserModel } from "@tax-lien/db";

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export interface UserStore {
  createUser(input: CreateUserInput): Promise<StoredUser>;
  findByEmail(email: string): Promise<StoredUser | null>;
  findById(id: string): Promise<StoredUser | null>;
}

function mapUser(document: UserDocument): StoredUser {
  return {
    id: document.id,
    email: document.email,
    passwordHash: document.passwordHash,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export class MongoUserStore implements UserStore {
  public async createUser(input: CreateUserInput): Promise<StoredUser> {
    const document = await UserModel.create(input);
    return mapUser(document);
  }

  public async findByEmail(email: string): Promise<StoredUser | null> {
    const document = await UserModel.findOne({ email }).exec();
    return document ? mapUser(document) : null;
  }

  public async findById(id: string): Promise<StoredUser | null> {
    const document = await UserModel.findById(id).exec();
    return document ? mapUser(document) : null;
  }
}
