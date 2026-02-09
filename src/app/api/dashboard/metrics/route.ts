import { NextResponse } from "next/server";
import { getDashboardMetrics } from "../../../../services/stats";

export async function GET() {
  try {
    const metrics = await getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    return NextResponse.json({ error: "Failed to load metrics" }, { status: 500 });
  }
}
