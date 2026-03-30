
import { getGovernanceCalendar } from "@/lib/actions/governance";

async function main() {
    console.log("Import successful:", typeof getGovernanceCalendar);
}

main().catch(console.error);
