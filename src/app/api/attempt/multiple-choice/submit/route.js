import { NextResponse } from "next/server";
import { getCurrentAttemptId } from "@/lib/session";
import { submitMultipleChoiceBlock } from "@/server/multipleChoiceService";

export const runtime = "nodejs";

export async function POST(request) {
  const attemptId = await getCurrentAttemptId();
  if (!attemptId) {
    return NextResponse.json({ error: "La sesión del examen no es válida." }, { status: 401 });
  }

  try {
    const { blockId, answers } = await request.json();
    if (!blockId || !answers) {
      return NextResponse.json({ error: "Faltan respuestas del bloque." }, { status: 400 });
    }
    return NextResponse.json(await submitMultipleChoiceBlock(attemptId, blockId, answers));
  } catch (error) {
    console.error("No se pudo confirmar el bloque adaptativo.", error);
    return NextResponse.json(
      { error: error.message || "No se pudo confirmar el bloque." },
      { status: 400 },
    );
  }
}
