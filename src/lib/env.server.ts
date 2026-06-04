import process from "node:process";
export interface EnvConfig {
  NODE_ENV: "development" | "staging" | "production";
  PORT: number;
  DATABASE_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string | undefined;
  SOCKET_SERVER_URL: string;
  CORS_ORIGIN: string;
  VITE_API_BASE_URL: string;
  JWT_SECRET: string;
  GUEST_USER_EMAIL: string;
  GUEST_USER_NAME: string;
  GUEST_USER_PASSWORD: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  OPENAI_FALLBACK_MODEL: string;
}
function validateRequiredEnvVars(): void {
  const required = ["DATABASE_URL", "JWT_SECRET", "OPENAI_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(", ")}`;
    console.error(`\n❌ ${message}\n`);
    throw new Error(message);
  }
}
export function getEnvConfig(): EnvConfig {
  validateRequiredEnvVars();
  const PORT = Number(process.env.PORT || 3000);
  const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
  const NODE_ENV = (process.env.NODE_ENV || "development") as
    | "development"
    | "staging"
    | "production";
  if (NODE_ENV === "production" && process.env.JWT_SECRET === "replace-with-32-char-secret") {
    throw new Error("JWT_SECRET must be changed from default value in production");
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32 && NODE_ENV === "production") {
    console.warn(
      "⚠️  JWT_SECRET is less than 32 characters. Recommended minimum is 32 characters.",
    );
  }
  return {
    NODE_ENV,
    PORT,
    DATABASE_URL: process.env.DATABASE_URL!,
    REDIS_HOST: process.env.REDIS_HOST || "localhost",
    REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
    SOCKET_SERVER_URL: process.env.SOCKET_SERVER_URL || "http://localhost:3000",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || "http://localhost:3000",
    JWT_SECRET: process.env.JWT_SECRET!,
    GUEST_USER_EMAIL: process.env.GUEST_USER_EMAIL || "guest@action-architect.local",
    GUEST_USER_NAME: process.env.GUEST_USER_NAME || "Guest User",
    GUEST_USER_PASSWORD: process.env.GUEST_USER_PASSWORD || "guest-password",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4",
    OPENAI_FALLBACK_MODEL: process.env.OPENAI_FALLBACK_MODEL || "gpt-3.5-turbo",
  };
}
export function getEnvConfigUnsafe(): Partial<EnvConfig> {
  return {
    NODE_ENV: (process.env.NODE_ENV || "development") as any,
    PORT: Number(process.env.PORT || 3000),
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: Number(process.env.REDIS_PORT || 6379),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    SOCKET_SERVER_URL: process.env.SOCKET_SERVER_URL,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    GUEST_USER_EMAIL: process.env.GUEST_USER_EMAIL,
    GUEST_USER_NAME: process.env.GUEST_USER_NAME,
    GUEST_USER_PASSWORD: process.env.GUEST_USER_PASSWORD,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_FALLBACK_MODEL: process.env.OPENAI_FALLBACK_MODEL,
  };
}
