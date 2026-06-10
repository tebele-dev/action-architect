import { Queue } from "bullmq";
import dotenv from "dotenv";
import { getEnvConfig } from "../lib/env.server.js";
dotenv.config();
const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = getEnvConfig();
export const aiQueue = new Queue("ai-generation", {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    ...(REDIS_PASSWORD && { password: REDIS_PASSWORD }),
  },
});
