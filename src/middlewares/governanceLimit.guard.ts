import { governanceService } from "../services/governance.service";

// Simple middleware that validates a cheque against daily limit
export async function governanceLimitGuard(req: any, res: any, next: any) {
  try {
    const date = String(req.body?.date || "");
    const amount = Number(req.body?.amount);
    const companyId = req.body?.companyId ? String(req.body.companyId) : "";

    if (!date || !companyId || !Number.isFinite(amount)) {
      return res.status(400).json({ ok: false, error: { code: "MISSING_PARAMS", message: "date, amount and companyId are required" } });
    }

    const result = await governanceService.assertCanIssueCheque({ date, amount, companyId });

    // Attach summary to locals for downstream handlers
    res.locals.governance = result;
    return next();
  } catch (e: any) {
    // Propagate the HttpError to global error handler
    return next(e);
  }
}
