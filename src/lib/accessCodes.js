import "server-only";

import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";

export class AccessCodeError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "AccessCodeError";
    this.status = status;
  }
}

export function normalizeAccessCode(rawCode) {
  return String(rawCode || "").trim().toUpperCase();
}

export function hashAccessCode(rawCode) {
  return createHash("sha256").update(normalizeAccessCode(rawCode)).digest("hex");
}

export async function redeemAccessCode(rawCode) {
  const normalized = normalizeAccessCode(rawCode);
  if (!normalized) {
    throw new AccessCodeError("Ingresá un ID de acceso.", 400);
  }

  const prisma = getPrisma();
  const codeHash = hashAccessCode(normalized);

  return prisma.$transaction(async (tx) => {
    const accessCode = await tx.accessCode.findUnique({
      where: { codeHash },
      include: { campaign: true },
    });

    if (!accessCode || accessCode.campaign.status !== "ACTIVE") {
      throw new AccessCodeError("El ID ingresado no corresponde a un examen disponible.", 401);
    }

    const now = new Date();
    const expired = accessCode.expiresAt && accessCode.expiresAt <= now;
    if (expired) {
      await tx.accessCode.update({
        where: { id: accessCode.id },
        data: { status: "EXPIRED" },
      });
      throw new AccessCodeError("Este ID de acceso venció. Contactá a SET Idiomas.", 410);
    }

    if (accessCode.status !== "AVAILABLE") {
      throw new AccessCodeError(
        "Este ID ya fue utilizado o se encuentra bloqueado. Contactá a SET Idiomas si necesitás continuar.",
        409,
      );
    }

    const reserved = await tx.accessCode.updateMany({
      where: { id: accessCode.id, status: "AVAILABLE" },
      data: { status: "STARTED", usedAt: now },
    });

    if (reserved.count !== 1) {
      throw new AccessCodeError("Este ID acaba de ser utilizado en otro intento.", 409);
    }

    return tx.attempt.create({
      data: {
        accessCodeId: accessCode.id,
        campaignId: accessCode.campaignId,
        languageId: accessCode.campaign.languageId,
        configurationId: accessCode.campaign.configurationId,
        status: "REGISTRATION",
        stage: "REGISTRATION",
      },
      select: { id: true },
    });
  });
}
