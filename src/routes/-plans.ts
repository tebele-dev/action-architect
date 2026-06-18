import express from "express";
import { prisma } from "../prisma.js";
import { generatePlanFromInput } from "../services/llm.js";
import { jwtAuth, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

function mapStep(step: any) {
  return {
    ...step,
    step: step.stepNumber,
  };
}

router.use(jwtAuth);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const plans = await prisma.actionPlan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { steps: true },
    });
    return res.json({
      success: true,
      data: plans.map((plan) => ({
        ...plan,
        steps: plan.steps.map(mapStep),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:planId", async (req: AuthRequest, res) => {
  try {
    const planId = req.params.planId as string;
    const userId = req.user!.id;
    const plan = await prisma.actionPlan.findFirst({
      where: { id: planId, userId },
      include: { steps: true },
    });
    if (!plan) return res.status(404).json({ success: false, error: "Not found" });
    return res.json({
      success: true,
      data: {
        ...plan,
        steps: plan.steps.map(mapStep),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ success: false, error: "Plan name is required." });
    }
    const userId = req.user!.id;
    const plan = await prisma.actionPlan.create({
      data: {
        userId,
        name: name.trim(),
      },
    });
    return res.json({ success: true, data: plan });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:planId", async (req: AuthRequest, res) => {
  try {
    const planId = req.params.planId as string;
    const { name } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ success: false, error: "Plan name is required." });
    }
    const userId = req.user!.id;
    const result = await prisma.actionPlan.updateMany({
      where: { id: planId, userId },
      data: { name: name.trim() },
    });
    if (result.count === 0) {
      return res.status(404).json({ success: false, error: "Plan not found" });
    }
    const updated = await prisma.actionPlan.findFirst({
      where: { id: planId, userId },
    });
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:planId", async (req: AuthRequest, res) => {
  try {
    const planId = req.params.planId as string;
    const userId = req.user!.id;
    const deleted = await prisma.actionPlan.deleteMany({
      where: { id: planId, userId },
    });
    if (deleted.count === 0) {
      return res.status(404).json({ success: false, error: "Plan not found" });
    }
    return res.json({ success: true, data: { id: planId } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/generate", async (req: AuthRequest, res) => {
  try {
    const { input, name } = req.body;
    if (!input) return res.status(400).json({ success: false, error: "Missing input" });
    const userId = req.user!.id;
    const aiResponse = await generatePlanFromInput(input);
    let parsedSteps: any;
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      parsedSteps = JSON.parse(jsonMatch![1]);
    } catch {
      return res.status(500).json({ success: false, error: "LLM returned invalid plan data" });
    }
    const plan = await prisma.actionPlan.create({
      data: {
        userId,
        originalInput: input,
        name: name?.trim() || "Untitled Plan",
      },
    });
    const createdSteps = [];
    if (Array.isArray(parsedSteps)) {
      for (const stepData of parsedSteps) {
        const step = await prisma.step.create({
          data: {
            planId: plan.id,
            stepNumber: Number(stepData.step ?? 0),
            action: String(stepData.action ?? ""),
            why: String(stepData.why ?? ""),
            priority: Number(stepData.priority ?? 1),
          },
        });
        createdSteps.push(mapStep(step));
      }
    }
    return res.json({ success: true, data: { planId: plan.id, steps: createdSteps } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:planId/progress", async (req: AuthRequest, res) => {
  try {
    const planId = req.params.planId as string;
    const userId = req.user!.id;
    const plan = await prisma.actionPlan.findFirst({ where: { id: planId, userId } });
    if (!plan) return res.status(404).json({ success: false, error: "Plan not found" });
    const steps = await prisma.step.findMany({ where: { planId } });
    const totalSteps = steps.length;
    const completedSteps = steps.filter((s) => s.completed).length;
    const totalHours = steps.reduce((acc, s) => acc + (s.hoursSpent || 0), 0);
    const completionPercentage =
      totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
    return res.json({
      success: true,
      data: { totalHours, completionPercentage, completedSteps, totalSteps },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
