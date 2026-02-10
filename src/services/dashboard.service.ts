import { getDashboardMetrics } from "./stats";

export async function fetchDashboardData(companyId?: string) {
  const targetId = companyId || "clx-onyx-001";
  return getDashboardMetrics(targetId);
}