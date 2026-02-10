import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    
    const { id } = await params;

    
    const doc = await prisma.document.findUnique({
      where: { id: id },
      include: {
        extraction: true,
        journalEntry: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ document: doc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
