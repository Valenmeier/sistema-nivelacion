export const LEVELS = [
  "A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2",
  "B2.1", "B2.2", "B2.3", "C1.1", "C1.2", "C1.3",
];

const BLOCK_TYPES = {
  diagnostic: { label: "Diagnóstico inicial", easy: 5, difficult: 5 },
  exploration: { label: "Exploración de nivel superior", easy: 4, difficult: 4 },
  confirmation: { label: "Confirmación", easy: 4, difficult: 4 },
  resolution: { label: "Resolución de dudas", easy: 4, difficult: 4 },
};

export function getBlockConfiguration(blockNumber, phase = "diagnostic") {
  if (blockNumber === 1) return BLOCK_TYPES.diagnostic;
  return BLOCK_TYPES[phase] || BLOCK_TYPES.confirmation;
}

export function moveLevel(level, offset) {
  const index = Math.max(0, LEVELS.indexOf(level));
  const target = Math.min(LEVELS.length - 1, Math.max(0, index + offset));
  return LEVELS[target];
}

function activeCompetencies(competencies) {
  const active = (competencies || []).filter((competency) => competency.active !== false && competency.weight > 0);
  if (!active.length) throw new Error("No existen competencias activas para generar el bloque.");
  return active;
}

function levelValue(level) {
  return LEVELS.indexOf(level);
}

function highestLevel(levels) {
  return levels.reduce((highest, level) => {
    if (!level) return highest;
    if (!highest || levelValue(level) > levelValue(highest)) return level;
    return highest;
  }, null);
}

function isHighestLevel(level) {
  return level === LEVELS[LEVELS.length - 1];
}

function shuffled(items) {
  return [...items]
    .map((item) => ({ item, value: Math.random() }))
    .sort((a, b) => a.value - b.value)
    .map(({ item }) => item);
}

function rotatedTieValue(index, length, blockNumber) {
  const rotationStart = Math.max(0, blockNumber - 1) % length;
  return (index - rotationStart + length) % length;
}

function allocateWeightedSlots(required, competencies, blockNumber) {
  const active = activeCompetencies(competencies);
  const totalWeight = active.reduce((total, competency) => total + competency.weight, 0);
  const allocation = active.map((competency, index) => {
    const rawSlots = (required * competency.weight) / totalWeight;
    return {
      competency,
      index,
      slots: Math.floor(rawSlots),
      remainder: rawSlots - Math.floor(rawSlots),
    };
  });

  let remaining = required - allocation.reduce((total, entry) => total + entry.slots, 0);
  const priority = [...allocation].sort((left, right) => (
    right.remainder - left.remainder ||
    rotatedTieValue(left.index, active.length, blockNumber) - rotatedTieValue(right.index, active.length, blockNumber)
  ));
  let priorityIndex = 0;
  while (remaining > 0) {
    priority[priorityIndex % priority.length].slots += 1;
    priorityIndex += 1;
    remaining -= 1;
  }

  return Object.fromEntries(allocation.map((entry) => [entry.competency.code, entry.slots]));
}

function allocationForBlock(config, competencies, blockNumber) {
  const active = activeCompetencies(competencies);
  const totals = allocateWeightedSlots(config.easy + config.difficult, active, blockNumber);
  const easy = Object.fromEntries(active.map((competency) => [competency.code, Math.floor(totals[competency.code] / 2)]));
  let remainingEasy = config.easy - Object.values(easy).reduce((total, value) => total + value, 0);

  const candidates = [...active].sort((left, right) => {
    const leftOdd = totals[left.code] % 2;
    const rightOdd = totals[right.code] % 2;
    return rightOdd - leftOdd || right.weight - left.weight || left.code.localeCompare(right.code);
  });
  let index = Math.max(0, blockNumber - 1) % candidates.length;
  while (remainingEasy > 0) {
    const competency = candidates[index % candidates.length];
    if (easy[competency.code] < totals[competency.code]) {
      easy[competency.code] += 1;
      remainingEasy -= 1;
    }
    index += 1;
  }

  const difficult = Object.fromEntries(active.map((competency) => [
    competency.code,
    totals[competency.code] - easy[competency.code],
  ]));

  return { easy, difficult };
}

function selectByAllocation(questionBank, level, difficulty, allocation, competencies, usedIds, blockNumber) {
  const used = new Set(usedIds);
  const selected = [];

  for (const competency of activeCompetencies(competencies)) {
    const required = allocation[competency.code] || 0;
    if (!required) continue;
    const available = shuffled(questionBank.filter((question) => (
      question.level === level &&
      question.difficulty === difficulty &&
      question.competencyCode === competency.code &&
      !used.has(question.id)
    )));

    if (available.length < required) {
      throw new Error(
        `No hay suficientes preguntas ${difficulty.toLowerCase()}s de ${competency.name} en ${level} para formar el bloque ${blockNumber}.`,
      );
    }

    const picked = available.slice(0, required);
    picked.forEach((question) => used.add(question.id));
    selected.push(...picked);
  }

  return selected;
}

export function selectQuestionsForBlock(questionBank, competencies, level, blockNumber, usedIds = [], phase = "diagnostic") {
  const config = getBlockConfiguration(blockNumber, phase);
  const allocation = allocationForBlock(config, competencies, blockNumber);
  const easy = selectByAllocation(questionBank, level, "Fácil", allocation.easy, competencies, usedIds, blockNumber);
  const difficult = selectByAllocation(
    questionBank,
    level,
    "Difícil",
    allocation.difficult,
    competencies,
    [...usedIds, ...easy.map((item) => item.id)],
    blockNumber,
  );
  return shuffled([...easy, ...difficult]);
}

function getScore(questions, answers, competencies) {
  const rows = questions.map((question) => {
    const selectedOption = answers[question.id];
    const correct = selectedOption === question.correctOption;
    return {
      id: question.id,
      level: question.level,
      difficulty: question.difficulty,
      competency: question.competency,
      competencyCode: question.competencyCode,
      selectedOption,
      correctOption: question.correctOption,
      correct,
    };
  });
  const easy = rows.filter((row) => row.difficulty === "Fácil");
  const difficult = rows.filter((row) => row.difficulty === "Difícil");
  const byCompetency = activeCompetencies(competencies).map((competency) => {
    const competencyRows = rows.filter((row) => row.competencyCode === competency.code);
    const correct = competencyRows.filter((row) => row.correct).length;
    return {
      code: competency.code,
      competency: competency.name,
      weight: competency.weight,
      correct,
      total: competencyRows.length,
      percentage: competencyRows.length ? Math.round((correct / competencyRows.length) * 100) : null,
      easyCorrect: competencyRows.filter((row) => row.correct && row.difficulty === "Fácil").length,
      difficultCorrect: competencyRows.filter((row) => row.correct && row.difficulty === "Difícil").length,
    };
  });
  const evaluated = byCompetency.filter((competency) => competency.total > 0);
  const evaluatedWeight = evaluated.reduce((total, competency) => total + competency.weight, 0);
  const weightedPercentage = evaluatedWeight
    ? Math.round(evaluated.reduce((total, competency) => total + ((competency.correct / competency.total) * competency.weight), 0) / evaluatedWeight * 100)
    : 0;

  return {
    total: rows.filter((row) => row.correct).length,
    easyCorrect: easy.filter((row) => row.correct).length,
    easyTotal: easy.length,
    difficultCorrect: difficult.filter((row) => row.correct).length,
    difficultTotal: difficult.length,
    weightedPercentage,
    byCompetency,
    rows,
  };
}

function hasCriticalCompetencyGap(score) {
  return score.byCompetency.some((result) => (
    result.weight >= 20 && result.total > 0 && result.correct === 0
  ));
}

function sustainsLevel(score) {
  const requiredEasy = Math.ceil(score.easyTotal * 0.6);
  return score.weightedPercentage >= 60 && score.easyCorrect >= requiredEasy && !hasCriticalCompetencyGap(score);
}

function exceedsLevel(score) {
  const requiredEasy = Math.ceil(score.easyTotal * 0.75);
  const requiredDifficult = Math.ceil(score.difficultTotal * 0.6);
  return (
    score.weightedPercentage >= 80 &&
    score.easyCorrect >= requiredEasy &&
    score.difficultCorrect >= requiredDifficult &&
    !hasCriticalCompetencyGap(score)
  );
}

function perfectBlock(score) {
  return score.total === score.rows.length;
}

export function summarizeExamHistory(history, competencies) {
  const rows = history.flatMap((result) => result.score?.rows || []);
  const sustainedLevels = history.map((result) => result.sustainedLevel).filter(Boolean);
  const assessedLevels = history.map((result) => result.evaluatedLevel).filter(Boolean);
  const competencyPerformance = activeCompetencies(competencies).map((competency) => {
    const competencyRows = rows.filter((row) => row.competencyCode === competency.code);
    const correct = competencyRows.filter((row) => row.correct).length;
    return {
      code: competency.code,
      competency: competency.name,
      weight: competency.weight,
      correct,
      total: competencyRows.length,
      percentage: competencyRows.length ? Math.round((correct / competencyRows.length) * 100) : null,
    };
  });
  const evaluated = competencyPerformance.filter((competency) => competency.total > 0);
  const evaluatedWeight = evaluated.reduce((total, competency) => total + competency.weight, 0);
  const weightedPercentage = evaluatedWeight
    ? Math.round(evaluated.reduce((total, competency) => total + ((competency.correct / competency.total) * competency.weight), 0) / evaluatedWeight * 100)
    : 0;

  return {
    highestSustainedLevel: highestLevel(sustainedLevels),
    highestAssessedLevel: highestLevel(assessedLevels),
    weightedPercentage,
    competencyPerformance,
  };
}

function explorationResult(base, evaluatedLevel, score, blockNumber) {
  if (isHighestLevel(evaluatedLevel)) {
    return {
      ...base,
      complete: false,
      nextBlock: blockNumber + 1,
      nextPhase: "confirmation",
      nextLevel: evaluatedLevel,
      action: "Alcanza el nivel máximo disponible; realiza un bloque adicional de confirmación.",
    };
  }

  const jump = perfectBlock(score) ? 2 : 1;
  const nextLevel = moveLevel(evaluatedLevel, jump);
  return {
    ...base,
    complete: false,
    nextBlock: blockNumber + 1,
    nextPhase: "exploration",
    nextLevel,
    action: jump === 2
      ? `Dominio completo y ponderado del nivel; explora ${nextLevel} para acortar el diagnóstico.`
      : `Buen desempeño ponderado; explora el subnivel superior ${nextLevel}.`,
  };
}

export function evaluateCompletedBlock({
  blockNumber,
  phase = blockNumber === 1 ? "diagnostic" : "confirmation",
  evaluatedLevel,
  questions,
  answers,
  history = [],
  competencies,
}) {
  const score = getScore(questions, answers, competencies);
  const supported = sustainsLevel(score);
  const base = {
    blockNumber,
    phase,
    evaluatedLevel,
    score,
    sustainedLevel: supported ? evaluatedLevel : null,
  };
  const priorSummary = summarizeExamHistory(history, competencies);

  if (blockNumber === 1 || phase === "diagnostic") {
    if (score.weightedPercentage < 30) {
      return {
        ...base,
        complete: false,
        nextBlock: 2,
        nextPhase: "confirmation",
        nextLevel: moveLevel(evaluatedLevel, -2),
        action: "Evalúa dos subniveles inferiores por rendimiento ponderado insuficiente.",
      };
    }
    if (score.weightedPercentage < 50) {
      return {
        ...base,
        complete: false,
        nextBlock: 2,
        nextPhase: "confirmation",
        nextLevel: moveLevel(evaluatedLevel, -1),
        action: "Evalúa el subnivel inferior por rendimiento ponderado bajo.",
      };
    }
    if (exceedsLevel(score)) {
      return explorationResult(base, evaluatedLevel, score, blockNumber);
    }
    return {
      ...base,
      complete: false,
      nextBlock: 2,
      nextPhase: "confirmation",
      nextLevel: evaluatedLevel,
      action: hasCriticalCompetencyGap(score)
        ? "Mantiene el nivel para revisar una competencia relevante sin evidencia suficiente."
        : "Mantiene el nivel para confirmar el diagnóstico ponderado.",
    };
  }

  if (phase === "exploration") {
    if (exceedsLevel(score)) {
      return explorationResult(base, evaluatedLevel, score, blockNumber);
    }
    if (supported) {
      return {
        ...base,
        complete: false,
        nextBlock: blockNumber + 1,
        nextPhase: "confirmation",
        nextLevel: evaluatedLevel,
        action: "Sostiene el nivel explorado según la ponderación configurada; realiza confirmación.",
      };
    }
    if (score.weightedPercentage >= 60 && hasCriticalCompetencyGap(score)) {
      return {
        ...base,
        complete: false,
        nextBlock: blockNumber + 1,
        nextPhase: "resolution",
        nextLevel: evaluatedLevel,
        action: "El promedio ponderado es suficiente, pero falta evidencia en una competencia relevante; realiza resolución.",
      };
    }
    const fallbackLevel = moveLevel(evaluatedLevel, -1);
    return {
      ...base,
      complete: false,
      nextBlock: blockNumber + 1,
      nextPhase: "confirmation",
      nextLevel: fallbackLevel,
      action: `No sostiene ${evaluatedLevel}; verifica el nivel intermedio ${fallbackLevel}.`,
    };
  }

  if (phase === "confirmation") {
    if (supported) {
      return {
        ...base,
        complete: true,
        recommendedLevel: evaluatedLevel,
        confidence: exceedsLevel(score) ? "alta" : "media-alta",
        action: "Confirma el nivel evaluado según la ponderación y las competencias activas.",
      };
    }
    if (score.weightedPercentage >= 60 && hasCriticalCompetencyGap(score)) {
      return {
        ...base,
        complete: false,
        nextBlock: blockNumber + 1,
        nextPhase: "resolution",
        nextLevel: evaluatedLevel,
        action: "Solicita un bloque adicional porque una competencia relevante quedó sin demostrar.",
      };
    }
    return {
      ...base,
      complete: false,
      nextBlock: blockNumber + 1,
      nextPhase: "resolution",
      nextLevel: moveLevel(evaluatedLevel, -1),
      action: "Solicita un bloque adicional en el nivel inferior por resultado ponderado insuficiente.",
    };
  }

  const priorSupported = priorSummary.highestSustainedLevel;
  if (supported) {
    return {
      ...base,
      complete: true,
      recommendedLevel: evaluatedLevel,
      confidence: "media",
      action: "Resuelve la duda sosteniendo el nivel según las competencias ponderadas.",
    };
  }

  if (priorSupported) {
    return {
      ...base,
      complete: true,
      recommendedLevel: priorSupported,
      confidence: "media-baja",
      action: "Recomienda el último nivel sostenido por falta de evidencia ponderada suficiente.",
    };
  }

  if (evaluatedLevel !== LEVELS[0]) {
    return {
      ...base,
      complete: false,
      nextBlock: blockNumber + 1,
      nextPhase: "resolution",
      nextLevel: moveLevel(evaluatedLevel, -1),
      action: "Aún no existe un nivel sostenido; continúa evaluando el subnivel inferior.",
    };
  }

  return {
    ...base,
    complete: true,
    recommendedLevel: LEVELS[0],
    confidence: "baja",
    action: "No obtiene evidencia ponderada suficiente; recomienda validación docente desde el nivel inicial.",
  };
}
