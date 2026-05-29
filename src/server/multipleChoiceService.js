import "server-only";

import {
  evaluateCompletedBlock,
  selectQuestionsForBlock,
} from "@/lib/adaptiveExam";
import { getPrisma } from "@/lib/prisma";

const TO_DB_PHASE = {
  diagnostic: "DIAGNOSTIC",
  exploration: "EXPLORATION",
  confirmation: "CONFIRMATION",
  resolution: "RESOLUTION",
};

const FROM_DB_PHASE = {
  DIAGNOSTIC: "diagnostic",
  EXPLORATION: "exploration",
  CONFIRMATION: "confirmation",
  RESOLUTION: "resolution",
};

function asAlgorithmQuestion(question) {
  const options = [...question.options].sort(
    (left, right) => left.position - right.position,
  );
  const correctOption = options.find((option) => option.isCorrect)?.position;
  if (correctOption === undefined) {
    throw new Error(
      `La pregunta ${question.legacyKey || question.id} no tiene una respuesta correcta configurada.`,
    );
  }

  return {
    id: question.id,
    level: question.level.code,
    difficulty: question.difficulty === "EASY" ? "Fácil" : "Difícil",
    competency: question.competency.name,
    competencyCode: question.competency.code,
    instruction: question.instruction,
    text: question.passage,
    question: question.statement,
    options: options.map((option) => option.text),
    correctOption,
  };
}

function asPublicBlock(block) {
  const questions = [...block.questions]
    .sort((left, right) => left.position - right.position)
    .map(({ question }) => {
      const safe = asAlgorithmQuestion(question);
      delete safe.correctOption;
      delete safe.level;
      delete safe.difficulty;
      delete safe.competency;
      delete safe.competencyCode;
      return safe;
    });

  return {
    id: block.id,
    blockNumber: block.blockNumber,
    questions,
  };
}

async function loadAttemptWithConfiguration(prisma, attemptId) {
  return prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      startLevel: true,
      configuration: {
        include: {
          competencies: {
            where: { active: true },
            include: { competency: true },
          },
        },
      },
    },
  });
}

function algorithmCompetencies(attempt) {
  const competencies = attempt.configuration.competencies.map((entry) => ({
    code: entry.competency.code,
    name: entry.competency.name,
    weight: entry.weight,
    active: entry.active && entry.competency.active,
  }));

  const active = competencies.filter((competency) => competency.active);
  if (!active.length) {
    throw new Error("La configuración no posee competencias activas.");
  }
  if (active.length > 4) {
    throw new Error(
      "La configuración excede el máximo de cuatro competencias activas.",
    );
  }
  if (active.some((competency) => competency.weight < 10)) {
    throw new Error(
      "Cada competencia activa debe tener un peso mínimo de 10%.",
    );
  }

  const totalWeight = active.reduce(
    (sum, competency) => sum + competency.weight,
    0,
  );
  if (totalWeight !== 100) {
    throw new Error(
      "La configuración activa de competencias no suma exactamente 100%.",
    );
  }
  return competencies;
}

async function loadQuestionBank(prisma, languageId) {
  const questions = await prisma.question.findMany({
    where: { languageId, active: true },
    include: {
      level: true,
      competency: true,
      options: { orderBy: { position: "asc" } },
    },
  });
  return questions.map(asAlgorithmQuestion);
}

async function loadStoredBlock(prisma, blockId) {
  return prisma.attemptBlock.findUnique({
    where: { id: blockId },
    include: {
      evaluatedLevel: true,
      questions: {
        include: {
          question: {
            include: {
              level: true,
              competency: true,
              options: { orderBy: { position: "asc" } },
            },
          },
          selectedOption: true,
        },
        orderBy: { position: "asc" },
      },
    },
  });
}

async function createBlock({
  prisma,
  attempt,
  competencies,
  questionBank,
  blockNumber,
  phase,
  levelCode,
  usedIds = [],
}) {
  const selectedQuestions = selectQuestionsForBlock(
    questionBank,
    competencies,
    levelCode,
    blockNumber,
    usedIds,
    phase,
  );

  const level = await prisma.level.findFirst({
    where: { languageId: attempt.languageId, code: levelCode },
    select: { id: true },
  });

  if (!level) {
    throw new Error(`No existe el nivel ${levelCode} en la base de datos.`);
  }

  try {
    const block = await prisma.attemptBlock.create({
      data: {
        attemptId: attempt.id,
        blockNumber,
        phase: TO_DB_PHASE[phase],
        evaluatedLevelId: level.id,
        questions: {
          create: selectedQuestions.map((question, position) => ({
            questionId: question.id,
            position,
          })),
        },
      },
      select: { id: true },
    });

    return loadStoredBlock(prisma, block.id);
  } catch (error) {
    if (error?.code === "P2002") {
      const existingBlock = await prisma.attemptBlock.findUnique({
        where: {
          attemptId_blockNumber: {
            attemptId: attempt.id,
            blockNumber,
          },
        },
        select: { id: true },
      });

      if (existingBlock) {
        return loadStoredBlock(prisma, existingBlock.id);
      }
    }

    throw error;
  }
}

export async function getOrCreateMultipleChoiceBlock(attemptId) {
  const prisma = getPrisma();
  const attempt = await loadAttemptWithConfiguration(prisma, attemptId);
  if (!attempt) throw new Error("El intento no existe.");
  if (attempt.status === "CANCELLED") return { cancelled: true };
  if (attempt.stage !== "MULTIPLE_CHOICE") {
    return { completed: Boolean(attempt.multipleChoiceResultLevelId) };
  }
  if (!attempt.startLevel) {
    throw new Error("El intento no tiene un nivel inicial seleccionado.");
  }

  const openBlock = await prisma.attemptBlock.findFirst({
    where: { attemptId, completedAt: null },
    orderBy: { blockNumber: "desc" },
    select: { id: true },
  });
  if (openBlock) {
    return {
      block: asPublicBlock(await loadStoredBlock(prisma, openBlock.id)),
    };
  }

  const lastCompletedBlock = await prisma.attemptBlock.findFirst({
    where: { attemptId, completedAt: { not: null } },
    orderBy: { blockNumber: "desc" },
    select: { resultJson: true },
  });

  const competencies = algorithmCompetencies(attempt);
  const questionBank = await loadQuestionBank(prisma, attempt.languageId);

  // Recupera una transición interrumpida: el bloque confirmado ya quedó persistido,
  // pero la creación del siguiente bloque o el cambio a escritura no alcanzó a completarse.
  if (lastCompletedBlock?.resultJson) {
    const lastResult = lastCompletedBlock.resultJson;
    if (lastResult.complete) {
      const finalLevel = await prisma.level.findFirst({
        where: {
          languageId: attempt.languageId,
          code: lastResult.recommendedLevel,
        },
        select: { id: true },
      });
      if (!finalLevel)
        throw new Error(
          "No se pudo recuperar el nivel final del multiple choice.",
        );
      await prisma.attempt.update({
        where: { id: attemptId },
        data: { multipleChoiceResultLevelId: finalLevel.id, stage: "WRITING" },
      });
      return { completed: true };
    }

    const previouslyUsedIds = await prisma.attemptBlockQuestion.findMany({
      where: { block: { attemptId } },
      select: { questionId: true },
    });
    const recoveredBlock = await createBlock({
      prisma,
      attempt,
      competencies,
      questionBank,
      blockNumber: lastResult.nextBlock,
      phase: lastResult.nextPhase,
      levelCode: lastResult.nextLevel,
      usedIds: previouslyUsedIds.map((entry) => entry.questionId),
    });
    return { block: asPublicBlock(recoveredBlock) };
  }

  const block = await createBlock({
    prisma,
    attempt,
    competencies,
    questionBank,
    blockNumber: 1,
    phase: "diagnostic",
    levelCode: attempt.startLevel.code,
  });

  return { block: asPublicBlock(block) };
}

export async function submitMultipleChoiceBlock(
  attemptId,
  blockId,
  submittedAnswers,
) {
  const prisma = getPrisma();
  const attempt = await loadAttemptWithConfiguration(prisma, attemptId);
  if (!attempt) throw new Error("El intento no existe.");
  if (attempt.status === "CANCELLED") return { cancelled: true };
  if (attempt.stage !== "MULTIPLE_CHOICE") {
    return { completed: Boolean(attempt.multipleChoiceResultLevelId) };
  }

  const block = await loadStoredBlock(prisma, blockId);
  if (!block || block.attemptId !== attemptId || block.completedAt) {
    throw new Error(
      "El bloque ya fue confirmado o no pertenece a este intento.",
    );
  }

  const questions = block.questions.map(({ question }) =>
    asAlgorithmQuestion(question),
  );
  const answers = {};
  const optionUpdates = [];

  for (const entry of block.questions) {
    const selectedPosition = Number(submittedAnswers?.[entry.questionId]);
    const selectedOption = entry.question.options.find(
      (option) => option.position === selectedPosition,
    );
    if (!selectedOption) {
      throw new Error(
        "Respondé todas las preguntas antes de confirmar el bloque.",
      );
    }

    answers[entry.questionId] = selectedPosition;
    optionUpdates.push(
      prisma.attemptBlockQuestion.update({
        where: {
          blockId_questionId: {
            blockId: block.id,
            questionId: entry.questionId,
          },
        },
        data: { selectedOptionId: selectedOption.id, answeredAt: new Date() },
      }),
    );
  }

  const historyRows = await prisma.attemptBlock.findMany({
    where: { attemptId, completedAt: { not: null } },
    orderBy: { blockNumber: "asc" },
    select: { resultJson: true },
  });
  const history = historyRows
    .map((stored) => stored.resultJson)
    .filter(Boolean);
  const competencies = algorithmCompetencies(attempt);
  const result = evaluateCompletedBlock({
    blockNumber: block.blockNumber,
    phase: FROM_DB_PHASE[block.phase],
    evaluatedLevel: block.evaluatedLevel.code,
    questions,
    answers,
    history,
    competencies,
  });

  await prisma.$transaction([
    ...optionUpdates,
    prisma.attemptBlock.update({
      where: { id: block.id },
      data: {
        scoreJson: result.score,
        resultJson: result,
        sustained: Boolean(result.sustainedLevel),
        completedAt: new Date(),
      },
    }),
  ]);

  if (result.complete) {
    const finalLevel = await prisma.level.findFirst({
      where: { languageId: attempt.languageId, code: result.recommendedLevel },
      select: { id: true },
    });
    if (!finalLevel)
      throw new Error(
        "No se pudo resolver el nivel final del multiple choice.",
      );

    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        multipleChoiceResultLevelId: finalLevel.id,
        stage: "WRITING",
      },
    });

    return { completed: true };
  }

  const questionBank = await loadQuestionBank(prisma, attempt.languageId);
  const previouslyUsedIds = await prisma.attemptBlockQuestion.findMany({
    where: { block: { attemptId } },
    select: { questionId: true },
  });

  const nextBlock = await createBlock({
    prisma,
    attempt,
    competencies,
    questionBank,
    blockNumber: result.nextBlock,
    phase: result.nextPhase,
    levelCode: result.nextLevel,
    usedIds: previouslyUsedIds.map((entry) => entry.questionId),
  });

  return { block: asPublicBlock(nextBlock) };
}
