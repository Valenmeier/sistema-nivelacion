import { NextResponse } from "next/server";
import { getCurrentAttemptId } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const attemptId = await getCurrentAttemptId();
  if (!attemptId) {
    return NextResponse.json({ error: "La sesión del examen no es válida." }, { status: 401 });
  }

  const attempt = await getPrisma().attempt.findUnique({
    where: { id: attemptId },
    select: { status: true, stage: true, abandonmentCount: true },
  });

  if (!attempt) {
    return NextResponse.json({ error: "El intento no existe." }, { status: 404 });
  }

  return NextResponse.json({
    status: attempt.status,
    stage: attempt.stage,
    abandonmentCount: attempt.abandonmentCount,
    cancelled: attempt.status === "CANCELLED",
    completed: ["COMPLETED_PENDING_PROCESSING", "PROCESSING", "REPORT_READY"].includes(attempt.status),
  });
}
