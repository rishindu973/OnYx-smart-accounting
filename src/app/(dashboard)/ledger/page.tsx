import VirtualLedger from "@/components/dashboard/VirtualLedger";
import { getLedgerLines } from "@/lib/actions/ledger";

export const dynamic = "force-dynamic";

const Ledger = async () => {
  const ledgerData = await getLedgerLines();
  return <VirtualLedger initialData={ledgerData} />;
};

export default Ledger;