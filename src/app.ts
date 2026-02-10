import express from "express";
import cors from "cors";
import governanceRoutes from "./routes/governance.routes";
import { isHttpError } from "./utils/httpError";

const app = (express as any)();

app.use((express as any).json());

//  allow Next frontend
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

//  health check
app.get("/api/health", (_req: any, res: any) => {
  res.json({ ok: true, message: "Backend is running" });
});

// routes
app.use("/api/governance", governanceRoutes);

// error handler
app.use((err: unknown, _req: any, res: any, _next: any) => {
  if (isHttpError(err)) {
    return res.status(err.status).json({
      ok: false,
      error: { code: err.code, message: err.message },
      notification: err.notification,
      details: err.details,
    });
  }
  console.error(err);
  return res.status(500).json({
    ok: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected server error." },
  });
});

export default app;
