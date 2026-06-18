import express from "express";
import { prisma } from "../prisma.js";
import { chatForStep } from "../services/llm.js";
import { jwtAuth, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

router.use(jwtAuth);

router.post("/", async (req: AuthRequest, res) => {
  try {
    const { stepId, message, sessionId } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, error: "Message is required." });
    }
    const userId = req.user!.id;

    let chatSession = null;
    if (sessionId) {
      chatSession = await prisma.chatSession.findUnique({
        where: { id: sessionId, userId },
      });
    }
    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          userId,
          stepId: stepId || undefined,
        },
      });
    }
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "user",
        content: message,
      },
    });

    const step = stepId
      ? await prisma.step.findFirst({
          where: { id: stepId, plan: { userId } },
        })
      : null;
    const stepAction = step?.action ?? "";
    const stepWhy = step?.why ?? "";
    const response = await chatForStep(stepAction, stepWhy, message);

    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "assistant",
        content: response,
      },
    });

    return res.json({ success: true, data: { sessionId: chatSession.id, response } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
