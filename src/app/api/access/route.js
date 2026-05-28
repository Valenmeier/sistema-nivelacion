import { NextResponse } from "next/server";
import { findExamByAccessId } from "@/data/exams";
import { COOKIE_NAME, createExamSession, sessionCookieOptions } from "@/lib/session";

export async function POST(request) {
  const { id } = await request.json();
  const exam = findExamByAccessId(id);

  if (!exam) {
    return NextResponse.json(
      { error: "El ID ingresado no corresponde a un examen disponible." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, createExamSession(exam.id), sessionCookieOptions());
  return response;
}
