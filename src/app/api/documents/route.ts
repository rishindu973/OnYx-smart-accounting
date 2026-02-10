import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const companyId = "clx-onyx-001";

    const docs = await prisma.document.findMany({
      where: { companyId },
      include: {
        extraction: true,
        journalEntry: true,
      },
      orderBy: { id: "desc" },
      take: 50,
    });

    return NextResponse.json({ documents: docs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
