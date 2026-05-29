import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const here = dirname(fileURLToPath(import.meta.url));

const LEVELS = [
  { code: "A1.1", cefrBand: "A1", sortOrder: 1 },
  { code: "A1.2", cefrBand: "A1", sortOrder: 2 },
  { code: "A2.1", cefrBand: "A2", sortOrder: 3 },
  { code: "A2.2", cefrBand: "A2", sortOrder: 4 },
  { code: "B1.1", cefrBand: "B1", sortOrder: 5 },
  { code: "B1.2", cefrBand: "B1", sortOrder: 6 },
  { code: "B2.1", cefrBand: "B2", sortOrder: 7 },
  { code: "B2.2", cefrBand: "B2", sortOrder: 8 },
  { code: "B2.3", cefrBand: "B2", sortOrder: 9 },
  { code: "C1.1", cefrBand: "C1", sortOrder: 10 },
  { code: "C1.2", cefrBand: "C1", sortOrder: 11 },
  { code: "C1.3", cefrBand: "C1", sortOrder: 12 },
];

type SeedQuestion = {
  legacyKey: string;
  level: string;
  difficulty: "EASY" | "HARD";
  competencyCode: string;
  instruction: string;
  passage: string | null;
  statement: string;
  options: Array<{ position: number; text: string; isCorrect: boolean }>;
};

type SeedData = {
  competencies: Array<{ code: string; name: string; weight: number; active: boolean }>;
  questions: SeedQuestion[];
};

function hashAccessCode(value: string) {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

function promptForLevel(levelCode: string) {
  if (levelCode.startsWith("A")) {
    return {
      writing: {
        prompt: "Escribí en inglés un texto breve sobre vos, tus actividades cotidianas y una situación en la que te gustaría usar el idioma.",
        evaluationNote: "Tu texto será evaluado en base a claridad, vocabulario y estructuras acordes al nivel.",
        minWords: 60,
        maxWords: 100,
      },
      oral: {
        prompt: "Grabá un audio en inglés presentándote y explicando por qué querés aprender el idioma.",
        minSeconds: 30,
        maxSeconds: 60,
      },
    };
  }
  if (levelCode.startsWith("B1")) {
    return {
      writing: {
        prompt: "Escribí en inglés sobre una experiencia importante que hayas vivido, explicando qué ocurrió, qué aprendiste y cómo influyó en tus decisiones actuales.",
        evaluationNote: "Tu texto será evaluado en base a contenido, organización, vocabulario y gramática.",
        minWords: 140,
        maxWords: 190,
      },
      oral: {
        prompt: "Grabá un audio en inglés explicando por qué querés estudiar el idioma, qué situaciones te gustaría resolver y qué experiencia previa tenés usándolo.",
        minSeconds: 60,
        maxSeconds: 120,
      },
    };
  }
  return {
    writing: {
      prompt: "Escribí en inglés un texto argumentativo sobre cómo la tecnología cambia la comunicación profesional, presentando tu opinión y ejemplos concretos.",
      evaluationNote: "Tu texto será evaluado en base a precisión, organización, amplitud léxica y desarrollo argumentativo.",
      minWords: 190,
      maxWords: 260,
    },
    oral: {
      prompt: "Grabá un audio en inglés desarrollando una opinión sobre un cambio reciente en educación o trabajo y defendiendo tu postura con ejemplos.",
      minSeconds: 90,
      maxSeconds: 180,
    },
  };
}

async function main() {
  const data: SeedData = JSON.parse(
    await readFile(join(here, "seed-data", "question-bank.json"), "utf8"),
  );

  const language = await prisma.language.upsert({
    where: { code: "en" },
    update: { name: "Inglés", active: true },
    create: { code: "en", name: "Inglés" },
  });

  const levelByCode = new Map<string, { id: string }>();
  for (const level of LEVELS) {
    const stored = await prisma.level.upsert({
      where: { languageId_code: { languageId: language.id, code: level.code } },
      update: { cefrBand: level.cefrBand, sortOrder: level.sortOrder, active: true },
      create: { ...level, languageId: language.id },
      select: { id: true },
    });
    levelByCode.set(level.code, stored);
  }

  const competencyByCode = new Map<string, { id: string; weight: number }>();
  for (const competency of data.competencies) {
    const stored = await prisma.competency.upsert({
      where: { languageId_code: { languageId: language.id, code: competency.code } },
      update: { name: competency.name, active: competency.active },
      create: {
        languageId: language.id,
        code: competency.code,
        name: competency.name,
        active: competency.active,
      },
      select: { id: true },
    });
    competencyByCode.set(competency.code, { ...stored, weight: competency.weight });
  }

  const configuration = await prisma.assessmentConfiguration.upsert({
    where: { languageId_version: { languageId: language.id, version: 1 } },
    update: {
      name: "Configuración inicial de nivelación",
      status: "ACTIVE",
      publishedAt: new Date(),
    },
    create: {
      languageId: language.id,
      version: 1,
      name: "Configuración inicial de nivelación",
      status: "ACTIVE",
      publishedAt: new Date(),
    },
  });

  for (const competency of data.competencies) {
    const stored = competencyByCode.get(competency.code);
    if (!stored) throw new Error(`Competencia no encontrada: ${competency.code}`);
    await prisma.configurationCompetency.upsert({
      where: {
        configurationId_competencyId: {
          configurationId: configuration.id,
          competencyId: stored.id,
        },
      },
      update: { weight: competency.weight, active: competency.active },
      create: {
        configurationId: configuration.id,
        competencyId: stored.id,
        weight: competency.weight,
        active: competency.active,
      },
    });
  }

  for (const level of LEVELS) {
    const levelRow = levelByCode.get(level.code);
    if (!levelRow) throw new Error(`Nivel no encontrado: ${level.code}`);
    const task = promptForLevel(level.code);

    const existingWriting = await prisma.writingPrompt.findFirst({
      where: { languageId: language.id, levelId: levelRow.id, version: 1 },
    });
    if (existingWriting) {
      await prisma.writingPrompt.update({
        where: { id: existingWriting.id },
        data: { ...task.writing, active: true },
      });
    } else {
      await prisma.writingPrompt.create({
        data: {
          languageId: language.id,
          levelId: levelRow.id,
          version: 1,
          active: true,
          ...task.writing,
        },
      });
    }

    const existingOral = await prisma.oralPrompt.findFirst({
      where: { languageId: language.id, levelId: levelRow.id, version: 1 },
    });
    if (existingOral) {
      await prisma.oralPrompt.update({
        where: { id: existingOral.id },
        data: { ...task.oral, active: true },
      });
    } else {
      await prisma.oralPrompt.create({
        data: {
          languageId: language.id,
          levelId: levelRow.id,
          version: 1,
          active: true,
          ...task.oral,
        },
      });
    }
  }

  for (const seedQuestion of data.questions) {
    const level = levelByCode.get(seedQuestion.level);
    const competency = competencyByCode.get(seedQuestion.competencyCode);
    if (!level || !competency) throw new Error(`No se pudo asociar ${seedQuestion.legacyKey}.`);

    const question = await prisma.question.upsert({
      where: { legacyKey: seedQuestion.legacyKey },
      update: {
        languageId: language.id,
        levelId: level.id,
        competencyId: competency.id,
        difficulty: seedQuestion.difficulty,
        instruction: seedQuestion.instruction,
        passage: seedQuestion.passage,
        statement: seedQuestion.statement,
        active: true,
      },
      create: {
        legacyKey: seedQuestion.legacyKey,
        languageId: language.id,
        levelId: level.id,
        competencyId: competency.id,
        difficulty: seedQuestion.difficulty,
        instruction: seedQuestion.instruction,
        passage: seedQuestion.passage,
        statement: seedQuestion.statement,
        active: true,
      },
    });

    await prisma.questionOption.deleteMany({ where: { questionId: question.id } });
    await prisma.questionOption.createMany({
      data: seedQuestion.options.map((option) => ({ ...option, questionId: question.id })),
    });
  }

  const organization = await prisma.organization.upsert({
    where: { name: "SET Idiomas" },
    update: { active: true },
    create: { name: "SET Idiomas" },
  });

  const campaign = await prisma.campaign.findFirst({
    where: { organizationId: organization.id, name: "Convocatoria demo Inglés" },
  }) ?? await prisma.campaign.create({
    data: {
      organizationId: organization.id,
      languageId: language.id,
      configurationId: configuration.id,
      name: "Convocatoria demo Inglés",
      type: "INDIVIDUAL",
      status: "ACTIVE",
      allocatedPlaces: 1,
    },
  });

  const demoCodeHash = hashAccessCode("SET-DEMO-001");
  const existingDemoCode = await prisma.accessCode.findUnique({
    where: { codeHash: demoCodeHash },
    select: { id: true },
  });
  if (existingDemoCode) {
    // Solo para desarrollo: re-sembrar el código demo limpia su intento anterior.
    await prisma.attempt.deleteMany({ where: { accessCodeId: existingDemoCode.id } });
  }

  await prisma.accessCode.upsert({
    where: { codeHash: demoCodeHash },
    update: { campaignId: campaign.id, codeHint: "SET-DEMO-001", status: "AVAILABLE", usedAt: null },
    create: {
      campaignId: campaign.id,
      codeHash: demoCodeHash,
      codeHint: "SET-DEMO-001",
      status: "AVAILABLE",
    },
  });

  console.log(`Seed listo: ${data.questions.length} preguntas, ${LEVELS.length} niveles y código demo SET-DEMO-001.`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
