import express from "express";
import { prisma } from "../prisma.js";
import { generatePlanFromInput } from "../services/openai.js";
import { getGuestUser } from "../utils/guestUser.js";
const router = express.Router();
function mapStep(step: any) {
  return {
    ...step,
    step: step.stepNumber,
  };
}
router.post("/generate", async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, error: "Missing input" });
    const user = await getGuestUser();
    const aiResponse = await generatePlanFromInput(input);
    let parsedSteps: any;
    try {
      parsedSteps = JSON.parse(aiResponse);
    } catch {
      return res.status(500).json({ success: false, error: "OpenAI returned invalid plan data" });
    }
    const plan = await prisma.actionPlan.create({
      data: { userId: user.id, originalInput: input },
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
router.get("/", async (_req, res) => {
  try {
    const user = await getGuestUser();
    const plans = await prisma.actionPlan.findMany({
      where: { userId: user.id },
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
router.get("/:planId", async (req, res) => {
  try {
    const plan = await prisma.actionPlan.findUnique({
      where: { id: req.params.planId },
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
router.get("/:planId/progress", async (req, res) => {
  try {
    const planId = req.params.planId;
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
