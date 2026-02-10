import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  // Prisma doesn't expose DATABASE_URL directly, so we query the DB itself.
  const info = await db.$queryRaw<
    Array<{ db_now: Date; current_db: string; current_user: string }>
  >`select now() as db_now, current_database() as current_db, current_user as current_user`;

  const companies = await db.company.count();
  const journalEntries = await db.journalEntry.count();
  const extracted = await db.extractedInformation.count();

  return NextResponse.json({
    connection: info?.[0],
    counts: { companies, journalEntries, extracted },
  });
}
