import { NextResponse } from "next/server";
import { getCurrentAttemptId } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const attemptId = await getCurrentAttemptId();
  if (!attemptId) {
    return NextResponse.json({ error: "La sesión del examen no es válida." }, { status: 401 });
  }

  const prisma = getPrisma();
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });

  if (!attempt?.studentId || !attempt.startLevelId) {
    return NextResponse.json({ error: "Primero completá tus datos de estudiante." }, { status: 409 });
  }
  if (attempt.status === "CANCELLED") {
    return NextResponse.json({ error: "El intento fue cancelado." }, { status: 409 });
  }
  if (attempt.status !== "REGISTRATION" || attempt.stage !== "POLICY") {
    return NextResponse.json({ error: "El examen ya fue iniciado para este intento." }, { status: 409 });
  }

  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      policyAcceptedAt: attempt.policyAcceptedAt || new Date(),
      startedAt: attempt.startedAt || new Date(),
      status: "IN_PROGRESS",
      stage: "MULTIPLE_CHOICE",
    },
  });

  return NextResponse.json({ ok: true });
}
