import express from "express";
import { prisma } from "../prisma";
import { jwtAuth, AuthRequest } from "../middleware/auth";
const router = express.Router();
router.delete("/time-entries/:entryId", jwtAuth, async (req: AuthRequest, res) => {
  try {
    const entryId = Array.isArray(req.params.entryId) ? req.params.entryId[0] : req.params.entryId;
    if (!entryId) {
      return res.status(400).json({ success: false, error: "Entry ID is required" });
    }
    const entry = await prisma.timeEntry.delete({ where: { id: entryId } });
    const entries = await prisma.timeEntry.findMany({ where: { stepId: entry.stepId } });
    const total = entries.reduce((acc, e) => acc + e.hours, 0);
    const step = await prisma.step.update({
      where: { id: entry.stepId },
      data: { hoursSpent: total },
    });
    const app = req.app;
    if ((app as any).io) {
      const planId = step.planId;
      const steps = await prisma.step.findMany({ where: { planId } });
      const totalSteps = steps.length;
      const completedSteps = steps.filter((s) => s.completed).length;
      const totalHours = steps.reduce((acc, s) => acc + (s.hoursSpent || 0), 0);
      const completionPercentage =
        totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
      (app as any).io.to(`plan:${planId}`).emit("progress:update", {
        planId,
        completionPercentage,
        totalHours,
        updatedStep: step,
      });
    }
    return res.json({ success: true, data: entry });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, error: "Time entry not found" });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});
export default router;
