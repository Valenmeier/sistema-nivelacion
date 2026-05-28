import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getExamById } from "@/data/exams";

const COOKIE_NAME = "set_nivelacion_session";
const ONE_DAY = 60 * 60 * 24;
const secret = process.env.SESSION_SECRET || "solo-desarrollo-cambiar-antes-de-publicar";

function sign(payload) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createExamSession(examId) {
  const payload = Buffer.from(
    JSON.stringify({ examId, expiresAt: Date.now() + ONE_DAY * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_DAY,
  };
}

function readToken(token) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const validSignature = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(validSignature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.expiresAt > Date.now() ? data : null;
  } catch {
    return null;
  }
}

export async function getCurrentExam() {
  const cookieStore = await cookies();
  const session = readToken(cookieStore.get(COOKIE_NAME)?.value);
  return session ? getExamById(session.examId) : null;
}

export { COOKIE_NAME };
