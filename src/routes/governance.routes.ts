import express from "express";
import { governanceService } from "../services/governance.service";

const router = (express as any).Router();

/**
 * GET /api/governance/calendar?month=YYYY-MM&companyId=...
 */
router.get("/calendar", async (req: any, res: any, next: any) => {
  try {
    const month = String(req.query.month || "");
    const companyId = String(req.query.companyId || "");

    if (!month || !companyId) {
      return res.status(400).json({
        ok: false,
        error: { code: "MISSING_PARAMS", message: "month and companyId are required" },
      });
    }

    const data = await governanceService.getMonthCalendar({ companyId, month });
    return res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/governance/day/:date/limit
 * Body: { companyId, limitAmount, reason? }
 */
router.put("/day/:date/limit", async (req: any, res: any, next: any) => {
  try {
    const date = String(req.params.date); // YYYY-MM-DD
    const { companyId, limitAmount, reason } = req.body ?? {};

    const data = await governanceService.setDailyLimit({
      companyId: String(companyId || ""),
      date,
      limitAmount: Number(limitAmount),
    });

    return res.json({
      ok: true,
      data,
      notification: {
        type: "success",
        title: "Limit updated",
        message: `Daily limit saved for ${date}.`,
        code: "DAILY_LIMIT_UPDATED",
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
