import { getEnvConfig } from "./env.server";
export function getServerConfig() {
  const envConfig = getEnvConfig();
  return {
    nodeEnv: envConfig.NODE_ENV,
    port: envConfig.PORT,
    databaseUrl: envConfig.DATABASE_URL,
    jwtSecret: envConfig.JWT_SECRET,
  };
}
