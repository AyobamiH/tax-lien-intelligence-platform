import { z } from "zod";
import { toValidationError } from "../errors/error-handler.js";

const passwordSchema = z
  .string()
  .min(12)
  .max(256)
  .regex(/[A-Za-z]/)
  .regex(/[0-9]/);

export const registerSchema = z.object({
  email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(256),
});

export type RegisterPayload = z.infer<typeof registerSchema>;
export type LoginPayload = z.infer<typeof loginSchema>;

export function parseRequestBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw toValidationError();
  }

  return parsed.data;
}
