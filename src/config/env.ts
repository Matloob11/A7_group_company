import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const envSchema = z.object({
  // Supabase credentials are optional for deployments that only serve the frontend
  SUPABASE_URL: z.string().url().optional().default("") ,
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().default(""),
  ADD_AGENT_ACCESS_CODE: z.string().min(6).default("A7-ADMIN-2026"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  // Log validation errors but do not throw so the serverless function can start
  // without Supabase credentials. Missing credentials should be provided via
  // Vercel Environment Variables for full functionality.
  console.warn(
    "Environment validation warnings:",
    result.error.flatten().fieldErrors,
  );
}

export const env = result.success ? result.data : envSchema.parse({});
