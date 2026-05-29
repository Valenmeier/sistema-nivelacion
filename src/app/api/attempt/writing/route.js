import { NextResponse } from "next/server";
import { getCurrentAttemptId } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export async function POST(request) {
  const attemptId = await getCurrentAttemptId();
  if (!attemptId) {
    return NextResponse.json({ error: "La sesión del examen no es válida." }, { status: 401 });
  }

  const { promptId, response: rawResponse } = await request.json();
  const response = String(rawResponse || "").trim();
  if (!promptId || !response) {
    return NextResponse.json({ error: "Escribí una respuesta antes de continuar." }, { status: 400 });
  }

  const prisma = getPrisma();
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      status: true,
      stage: true,
      multipleChoiceResultLevelId: true,
    },
  });
  if (!attempt || attempt.status === "CANCELLED") {
    return NextResponse.json({ error: "El intento no está disponible." }, { status: 409 });
  }
  if (!["WRITING", "AUDIO"].includes(attempt.stage)) {
    return NextResponse.json({ error: "La producción escrita no está habilitada en esta etapa." }, { status: 409 });
  }

  const prompt = await prisma.writingPrompt.findFirst({
    where: {
      id: promptId,
      levelId: attempt.multipleChoiceResultLevelId || undefined,
      active: true,
    },
    select: { id: true },
  });
  if (!prompt) {
    return NextResponse.json({ error: "La consigna escrita no corresponde a este intento." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.writingSubmission.upsert({
      where: { attemptId },
      update: { promptId, response, wordCount: countWords(response) },
      create: { attemptId, promptId, response, wordCount: countWords(response) },
    }),
    prisma.attempt.update({
      where: { id: attemptId },
      data: { stage: "AUDIO" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
