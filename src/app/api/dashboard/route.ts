import { NextResponse } from "next/server";
import { fetchDashboardData } from "@/services/dashboard.service";

export async function GET() {
  try {
    // later: get companyId from auth/session
    const activeCompanyId = "clx-onyx-001";
    const companyId = activeCompanyId || "clx-onyx-001"; // fallback for testing

    const metrics = await fetchDashboardData(companyId);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { message: "Failed to load dashboard metrics" },
      { status: 500 }
    );
  }
}
