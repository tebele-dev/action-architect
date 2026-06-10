import express from "express";
import { prisma } from "../prisma.js";
const router = express.Router();
function mapStep(step: any) {
  return {
    ...step,
    step: step.stepNumber,
  };
}
async function broadcastProgress(app: any, planId: string) {
  if (!app?.io) return;
  const steps = await prisma.step.findMany({ where: { planId } });
  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.completed).length;
  const totalHours = steps.reduce((acc, s) => acc + (s.hoursSpent || 0), 0);
  const completionPercentage =
    totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
  app.io
    .to(`plan:${planId}`)
    .emit("progress:update", { planId, completionPercentage, totalHours, updatedStep: steps });
}
router.put("/:stepId", async (req, res) => {
  try {
    const { action, why, priority, hoursSpent, stepNumber } = req.body;
    const data: any = {};
    if (action !== undefined) data.action = action;
    if (why !== undefined) data.why = why;
    if (priority !== undefined) data.priority = Number(priority);
    if (hoursSpent !== undefined) data.hoursSpent = Number(hoursSpent);
    if (stepNumber !== undefined) data.stepNumber = Number(stepNumber);
    const step = await prisma.step.update({ where: { id: req.params.stepId }, data });
    await broadcastProgress(req.app, step.planId);
    return res.json({ success: true, data: mapStep(step) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
router.patch("/:stepId/complete", async (req, res) => {
  try {
    const { completed } = req.body;
    const step = await prisma.step.update({
      where: { id: req.params.stepId },
      data: { completed: Boolean(completed) },
    });
    await broadcastProgress(req.app, step.planId);
    return res.json({ success: true, data: mapStep(step) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/:stepId/time", async (req, res) => {
  try {
    const { hours, date, notes } = req.body;
    const entry = await prisma.timeEntry.create({
      data: {
        stepId: req.params.stepId,
        hours: Number(hours),
        date: date ? new Date(date) : undefined,
        notes,
      },
    });
    const entries = await prisma.timeEntry.findMany({ where: { stepId: req.params.stepId } });
    const total = entries.reduce((acc, e) => acc + e.hours, 0);
    const step = await prisma.step.update({
      where: { id: req.params.stepId },
      data: { hoursSpent: total },
    });
    await broadcastProgress(req.app, step.planId);
    return res.json({ success: true, data: entry });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
export default router;
