import process from "node:process";
export interface EnvConfig {
  NODE_ENV: "development" | "staging" | "production";
  BACKEND_PORT: number;
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
  LLM_API_KEY: string;
  LLM_MODEL: string;
  LLM_FALLBACK_MODEL: string;
  LLM_API_URL: string;
}

function validateRequiredEnvVars(): void {
  const required = ["DATABASE_URL", "JWT_SECRET", "LLM_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0)
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

export function getEnvConfig(): EnvConfig {
  validateRequiredEnvVars();

  return {
    NODE_ENV: (process.env.NODE_ENV || "development") as "development" | "staging" | "production",
    BACKEND_PORT: Number(process.env.PORT || 3000),
    DATABASE_URL: process.env.DATABASE_URL!,
    REDIS_HOST: process.env.REDIS_HOST || "localhost",
    REDIS_PORT: Number(process.env.REDIS_PORT || 6379),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
    SOCKET_SERVER_URL: process.env.SOCKET_SERVER_URL || "http://localhost:3000",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || "http://localhost:3000",
    JWT_SECRET: process.env.JWT_SECRET!,
    GUEST_USER_EMAIL: process.env.GUEST_USER_EMAIL || "guest@action-architect.local",
    GUEST_USER_NAME: process.env.GUEST_USER_NAME || "Guest User",
    GUEST_USER_PASSWORD: process.env.GUEST_USER_PASSWORD || "guest-password",
    LLM_API_KEY: process.env.LLM_API_KEY!,
    LLM_MODEL: process.env.LLM_MODEL || "deepseek-v4-pro",
    LLM_FALLBACK_MODEL: process.env.LLM_FALLBACK_MODEL || "deepseek-v4-flash",
    LLM_API_URL: process.env.LLM_API_URL || "https://api.deepseek.com/chat/completions",
  };
}
