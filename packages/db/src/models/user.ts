import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface UserRecord {
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<UserRecord>;

const userSchema = new Schema<UserRecord>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const UserModel: Model<UserRecord> =
  mongoose.models.User ?? mongoose.model<UserRecord>("User", userSchema);
