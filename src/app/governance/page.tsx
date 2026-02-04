"use client";
import GovernanceCalendar from "@/components/dashboard/GovernanceCalendar";
import BlockingHistory from "@/components/dashboard/BlockingHistory";

const Governance = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Governance</h2>
        <p className="text-muted-foreground">Daily limit calendar and spending guardrails</p>
      </div>
      
      <GovernanceCalendar />
      <BlockingHistory />
    </div>
  );
};

export default Governance;
