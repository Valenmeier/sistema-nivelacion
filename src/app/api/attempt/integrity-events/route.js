import { NextResponse } from "next/server";
import { getCurrentAttemptId } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request) {
  const attemptId = await getCurrentAttemptId();
  if (!attemptId) {
    return NextResponse.json({ error: "La sesión del examen no es válida." }, { status: 401 });
  }

  const { eventKey, eventType } = await request.json();
  if (!eventKey || !eventType) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  const prisma = getPrisma();
  const state = await prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findUnique({
      where: { id: attemptId },
      select: { status: true, stage: true, abandonmentCount: true },
    });
    if (!attempt) return null;

    if (attempt.status !== "IN_PROGRESS" || attempt.stage === "FINISHED") {
      return attempt;
    }

    const existingEvent = await tx.integrityEvent.findUnique({
      where: { attemptId_clientEventKey: { attemptId, clientEventKey: String(eventKey) } },
    });
    if (existingEvent) return attempt;

    await tx.integrityEvent.create({
      data: {
        attemptId,
        clientEventKey: String(eventKey).slice(0, 80),
        eventType: String(eventType).slice(0, 40),
      },
    });

    const nextCount = attempt.abandonmentCount + 1;
    return tx.attempt.update({
      where: { id: attemptId },
      data: nextCount >= 2
        ? {
            abandonmentCount: nextCount,
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancellationReason: "ABANDONMENT_LIMIT",
          }
        : { abandonmentCount: nextCount },
      select: { status: true, stage: true, abandonmentCount: true },
    });
  });

  if (!state) {
    return NextResponse.json({ error: "El intento no existe." }, { status: 404 });
  }

  return NextResponse.json({
    ...state,
    cancelled: state.status === "CANCELLED",
  });
}
