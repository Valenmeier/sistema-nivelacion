import { NextResponse } from "next/server";
import { getCurrentAttemptId } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request) {
  const attemptId = await getCurrentAttemptId();
  if (!attemptId) {
    return NextResponse.json({ error: "La sesión del examen no es válida." }, { status: 401 });
  }

  const payload = await request.json();
  const fullName = String(payload.fullName || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const startLevelCode = String(payload.startLevel || "").trim();

  if (!fullName || !email || !startLevelCode) {
    return NextResponse.json({ error: "Completá los datos solicitados." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ingresá un correo electrónico válido." }, { status: 400 });
  }

  const prisma = getPrisma();
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.status === "CANCELLED") {
    return NextResponse.json({ error: "El intento no está disponible." }, { status: 409 });
  }
  if (!["REGISTRATION", "POLICY"].includes(attempt.stage)) {
    return NextResponse.json({ error: "Los datos iniciales ya no pueden modificarse una vez iniciado el examen." }, { status: 409 });
  }

  const startLevel = await prisma.level.findFirst({
    where: { languageId: attempt.languageId, code: startLevelCode, active: true },
    select: { id: true },
  });
  if (!startLevel) {
    return NextResponse.json({ error: "La opción inicial seleccionada no es válida." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    let studentId = attempt.studentId;
    if (studentId) {
      await tx.student.update({ where: { id: studentId }, data: { fullName, email } });
    } else {
      const student = await tx.student.create({ data: { fullName, email } });
      studentId = student.id;
    }

    await tx.attempt.update({
      where: { id: attemptId },
      data: { studentId, startLevelId: startLevel.id, stage: "POLICY" },
    });
  });

  return NextResponse.json({ ok: true });
}
