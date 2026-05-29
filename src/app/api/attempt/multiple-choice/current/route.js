import { NextResponse } from "next/server";
import { getCurrentAttemptId } from "@/lib/session";
import { getOrCreateMultipleChoiceBlock } from "@/server/multipleChoiceService";

export const runtime = "nodejs";

export async function GET() {
  const attemptId = await getCurrentAttemptId();
  if (!attemptId) {
    return NextResponse.json({ error: "La sesión del examen no es válida." }, { status: 401 });
  }

  try {
    return NextResponse.json(await getOrCreateMultipleChoiceBlock(attemptId));
  } catch (error) {
    console.error("No se pudo preparar el bloque adaptativo.", error);
    return NextResponse.json(
      { error: error.message || "No se pudo preparar el bloque de preguntas." },
      { status: 500 },
    );
  }
}
