import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";

const COOKIE_NAME = "set_nivelacion_session";
const ONE_DAY = 60 * 60 * 24;
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET es obligatorio en producción.");
}
const secret = process.env.SESSION_SECRET || "solo-desarrollo-cambiar-antes-de-publicar";

function sign(payload) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createExamSession(attemptId) {
  const payload = Buffer.from(
    JSON.stringify({ attemptId, expiresAt: Date.now() + ONE_DAY * 1000 }),
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

export async function getCurrentAttemptId() {
  const cookieStore = await cookies();
  const session = readToken(cookieStore.get(COOKIE_NAME)?.value);
  return session?.attemptId || null;
}

export async function getCurrentAttempt() {
  const attemptId = await getCurrentAttemptId();
  if (!attemptId) return null;

  return getPrisma().attempt.findUnique({
    where: { id: attemptId },
    include: {
      language: true,
      startLevel: true,
      multipleChoiceResultLevel: true,
      student: true,
    },
  });
}

export async function getCurrentExam() {
  const attemptId = await getCurrentAttemptId();
  if (!attemptId) return null;

  const attempt = await getPrisma().attempt.findUnique({
    where: { id: attemptId },
    include: {
      language: true,
      student: true,
      multipleChoiceResultLevel: {
        include: {
          writingPrompts: {
            where: { active: true },
            orderBy: { version: "desc" },
            take: 1,
          },
          oralPrompts: {
            where: { active: true },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!attempt) return null;

  const writing = attempt.multipleChoiceResultLevel?.writingPrompts?.[0] || null;
  const audio = attempt.multipleChoiceResultLevel?.oralPrompts?.[0] || null;

  return {
    id: attempt.id,
    language: attempt.language.name,
    status: attempt.status,
    stage: attempt.stage,
    student: attempt.student,
    writing: writing && {
      id: writing.id,
      prompt: writing.prompt,
      evaluationNote: writing.evaluationNote,
      minWords: writing.minWords,
      maxWords: writing.maxWords,
    },
    audio: audio && {
      id: audio.id,
      prompt: audio.prompt,
      minSeconds: audio.minSeconds,
      maxSeconds: audio.maxSeconds,
    },
  };
}

export { COOKIE_NAME };
