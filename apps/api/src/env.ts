import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  BOOKING_TOKEN_SECRET: z.string().min(32),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Sharad Utsav <onboarding@resend.dev>"),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  ADMIN_PASSCODE: z.string().min(6).optional(),
});

export const env = EnvSchema.parse(process.env);

export const webOrigins = env.WEB_ORIGIN.split(",").map((origin) => origin.trim());
export const webOrigin = webOrigins[0];
