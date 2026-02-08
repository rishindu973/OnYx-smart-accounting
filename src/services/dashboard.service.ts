import { getDashboardMetrics } from "./stats";

export async function fetchDashboardData(companyId?: string) {
  return getDashboardMetrics(companyId);
}