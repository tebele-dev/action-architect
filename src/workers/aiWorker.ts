import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
import { generatePlanFromInput } from "../services/openai";
import { prisma } from "../prisma";
import { ioClientNotify } from "../workers/notifyClient";
import { getEnvConfig } from "../lib/env.server";
dotenv.config();
const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = getEnvConfig();
const connection = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  ...(REDIS_PASSWORD && { password: REDIS_PASSWORD }),
  maxRetriesPerRequest: null,
});
const worker = new Worker(
  "ai-generation",
  async (job: Job) => {
    try {
      const { userId, input } = job.data as {
        userId: string;
        input: string;
      };
      const aiText = await generatePlanFromInput(input);
      const parsed = JSON.parse(aiText);
      const plan = await prisma.actionPlan.create({
        data: {
          userId,
          originalInput: input,
        },
      });
      const stepsData = Array.isArray(parsed) ? parsed : [];
      for (const s of stepsData) {
        await prisma.step.create({
          data: {
            planId: plan.id,
            stepNumber: Number(s.step ?? 0),
            action: String(s.action ?? s.task ?? ""),
            why: String(s.why ?? ""),
            priority: Number(s.priority ?? 1),
          },
        });
      }
      await ioClientNotify("user:" + userId, "ai:plan:generated", { planId: plan.id });
      return { planId: plan.id };
    } catch (err) {
      console.error("Job processing error:", err);
      throw err;
    }
  },
  {
    connection: connection as any,
    concurrency: 2,
    settings: {
      backoffStrategy: (attemptsMade: number, _type?: string, _err?: Error) => {
        const delay = Math.min(Math.pow(2, attemptsMade) * 1000, 60000);
        return delay;
      },
    },
  },
);
worker.on("failed", (job, err) => {
  if (job) {
    console.error(`AI job ${job.id} failed after ${job.attemptsMade} attempts`, err?.message);
  } else {
    console.error("AI job failed (no job reference)", err?.message);
  }
});
