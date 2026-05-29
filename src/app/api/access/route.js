import { NextResponse } from "next/server";
import { AccessCodeError, redeemAccessCode } from "@/lib/accessCodes";
import { COOKIE_NAME, createExamSession, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { id } = await request.json();
    const attempt = await redeemAccessCode(id);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, createExamSession(attempt.id), sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof AccessCodeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("No se pudo validar el código de acceso.", error);
    return NextResponse.json(
      { error: "No se pudo ingresar al examen en este momento." },
      { status: 500 },
    );
  }
}
