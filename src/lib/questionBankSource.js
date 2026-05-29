import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { LEVELS } from "@/lib/adaptiveExam";

const COMPETENCY_SHEET_NAMES = ["01_Competencias", "Competencias"];

const QUESTION_COLUMN_ALIASES = {
  id: ["id_pregunta", "id"],
  difficulty: ["dificultad"],
  competency: ["competencia", "competencia_evaluada"],
  question: ["pregunta", "enunciado"],
  options: ["opciones_de_respuesta", "opciones_respuesta", "respuestas"],
  correctAnswer: ["respuesta_correcta"],
};

const QUESTION_COLUMN_NAMES = {
  id: "ID pregunta",
  difficulty: "Dificultad",
  competency: "Competencia",
  question: "Pregunta",
  options: "Opciones de respuesta",
  correctAnswer: "Respuesta correcta",
};

const CONFIG_COLUMN_ALIASES = {
  code: ["codigo"],
  name: ["competencia_evaluada", "competencia"],
  weight: ["peso", "peso_porcentual"],
  active: ["activa", "activo"],
};

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeContent(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function normalizeForComparison(value) {
  return normalizeContent(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
}

function getColumnValue(row, aliases) {
  const entry = Object.entries(row).find(([header]) => {
    const normalized = normalizeHeader(header);
    return aliases.some((alias) => normalized === alias || normalized.startsWith(`${alias}_`));
  });
  return entry ? entry[1] : "";
}

function splitOptions(rawValue) {
  const raw = normalizeContent(rawValue);
  if (!raw) return [];
  const separator = raw.includes("\n") ? /\n+/ : /\s*\|\s*/;
  return raw.split(separator).map((option) => option.trim()).filter(Boolean);
}

function parseDifficulty(rawValue, level, id) {
  const value = normalizeForComparison(rawValue);
  if (value === "facil") return "Fácil";
  if (value === "dificil") return "Difícil";
  throw new Error(`La pregunta ${id} de ${level} debe indicar dificultad Fácil o Difícil.`);
}

function isActiveValue(rawValue) {
  return ["si", "sí", "true", "activo", "activa", "1", "yes"].includes(normalizeForComparison(rawValue));
}

function parseWeight(rawWeight, code) {
  const value = normalizeContent(rawWeight).replace("%", "").replace(",", ".");
  if (!value) return 0;
  let numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`El peso de la competencia ${code} no es un número válido.`);
  }
  if (numeric > 0 && numeric <= 1) numeric *= 100;
  return numeric;
}

function rowsFromConfigurationSheet(worksheet) {
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });
  const headerIndex = matrix.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return headers.includes("codigo") && headers.includes("competencia_evaluada") && headers.includes("peso") && headers.includes("activa");
  });
  if (headerIndex < 0) {
    throw new Error("La hoja 01_Competencias debe incluir las columnas Código, Competencia evaluada, Peso % y Activa.");
  }
  const headers = matrix[headerIndex];
  return matrix.slice(headerIndex + 1).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? ""]),
  ));
}

function loadCompetencies(workbook) {
  const sheetName = COMPETENCY_SHEET_NAMES.find((name) => workbook.Sheets[name]);
  if (!sheetName) {
    throw new Error("El banco debe contener la hoja 01_Competencias antes de las hojas por nivel.");
  }

  const rows = rowsFromConfigurationSheet(workbook.Sheets[sheetName]);
  const competencies = rows.flatMap((row) => {
    const code = normalizeContent(getColumnValue(row, CONFIG_COLUMN_ALIASES.code)).toUpperCase();
    const name = normalizeContent(getColumnValue(row, CONFIG_COLUMN_ALIASES.name));
    const weightRaw = normalizeContent(getColumnValue(row, CONFIG_COLUMN_ALIASES.weight));
    const activeRaw = normalizeContent(getColumnValue(row, CONFIG_COLUMN_ALIASES.active));

    if (!code && !name && !weightRaw) return [];
    if (!code || !name) {
      throw new Error("Hay una competencia incompleta en 01_Competencias: debe contener código y nombre.");
    }

    return [{
      code,
      name,
      weight: parseWeight(weightRaw, code),
      active: isActiveValue(activeRaw),
    }];
  });

  const duplicatedCodes = competencies
    .map((competency) => competency.code)
    .filter((code, index, allCodes) => allCodes.indexOf(code) !== index);
  if (duplicatedCodes.length) {
    throw new Error(`La hoja 01_Competencias contiene códigos repetidos: ${[...new Set(duplicatedCodes)].join(", ")}.`);
  }

  const activeCompetencies = competencies.filter((competency) => competency.active);
  if (!activeCompetencies.length) {
    throw new Error("Debe existir al menos una competencia activa en 01_Competencias.");
  }
  if (activeCompetencies.length > 4) {
    throw new Error("Para el MVP, el multiple choice admite hasta 4 competencias activas para mantener bloques balanceados.");
  }
  if (activeCompetencies.some((competency) => competency.weight < 10)) {
    throw new Error("Cada competencia activa debe tener un peso mínimo de 10% para poder aparecer de forma consistente en los bloques.");
  }

  const totalWeight = activeCompetencies.reduce((total, competency) => total + competency.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new Error(`La configuración de competencias no es válida: las competencias activas suman ${totalWeight}% y deben sumar 100%.`);
  }

  return { allCompetencies: competencies, activeCompetencies };
}

function findConfiguredCompetency(rawValue, competencies, level, id) {
  const value = normalizeForComparison(rawValue);
  const matched = competencies.find((competency) => {
    const code = normalizeForComparison(competency.code);
    const name = normalizeForComparison(competency.name);
    const label = normalizeForComparison(`${competency.code} - ${competency.name}`);
    return value === code || value === name || value === label || value.startsWith(`${code} -`);
  });

  if (!matched) {
    throw new Error(`La pregunta ${id} de ${level} utiliza una competencia que no está activa o no existe en 01_Competencias.`);
  }
  return matched;
}

function resolveCorrectOption(rawAnswer, options, level, id) {
  const answer = normalizeContent(rawAnswer);
  const numericPosition = Number(answer);

  if (Number.isInteger(numericPosition) && numericPosition >= 1 && numericPosition <= options.length) {
    return numericPosition - 1;
  }

  const answerIndex = options.findIndex(
    (option) => normalizeForComparison(option) === normalizeForComparison(answer),
  );

  if (answerIndex < 0) {
    throw new Error(`La respuesta correcta de ${id} (${level}) no coincide con ninguna opción cargada.`);
  }

  return answerIndex;
}

function sheetToQuestions(workbook, level, competencies) {
  const worksheet = workbook.Sheets[level];
  if (!worksheet) {
    throw new Error(`El banco local no contiene la hoja ${level}.`);
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });
  if (!rows.length) return [];

  const headers = Object.keys(rows[0]).map(normalizeHeader);
  const missingColumns = Object.entries(QUESTION_COLUMN_ALIASES)
    .filter(([, aliases]) => !aliases.some((alias) => headers.some((header) => header === alias || header.startsWith(`${alias}_`))))
    .map(([key]) => QUESTION_COLUMN_NAMES[key]);

  if (missingColumns.length) {
    throw new Error(`La hoja ${level} no contiene las columnas requeridas: ${missingColumns.join(", ")}.`);
  }

  return rows.flatMap((row, rowIndex) => {
    const id = normalizeContent(getColumnValue(row, QUESTION_COLUMN_ALIASES.id));
    const difficultyRaw = normalizeContent(getColumnValue(row, QUESTION_COLUMN_ALIASES.difficulty));
    const competencyRaw = normalizeContent(getColumnValue(row, QUESTION_COLUMN_ALIASES.competency));
    const question = normalizeContent(getColumnValue(row, QUESTION_COLUMN_ALIASES.question));
    const options = splitOptions(getColumnValue(row, QUESTION_COLUMN_ALIASES.options));
    const correctAnswer = normalizeContent(getColumnValue(row, QUESTION_COLUMN_ALIASES.correctAnswer));
    const rowHasContent = Boolean(id || difficultyRaw || competencyRaw || question || options.length || correctAnswer);

    if (!rowHasContent) return [];
    if (!id || !difficultyRaw || !competencyRaw || !question || options.length < 2 || !correctAnswer) {
      throw new Error(`La fila ${rowIndex + 2} de la hoja ${level} está incompleta.`);
    }

    const competency = findConfiguredCompetency(competencyRaw, competencies, level, id);
    if (!competency.active) return [];
    return [{
      id: `${level}-${id}`,
      level,
      difficulty: parseDifficulty(difficultyRaw, level, id),
      competency: competency.name,
      competencyCode: competency.code,
      competencyWeight: competency.weight,
      instruction: "Seleccioná la respuesta correcta.",
      question,
      options,
      correctOption: resolveCorrectOption(correctAnswer, options, level, id),
    }];
  });
}

export async function loadQuestionBankForExam(exam) {
  const resourceFile = exam.questionBankFile;
  if (!resourceFile) {
    throw new Error("Este examen no tiene asignado un archivo local de preguntas.");
  }

  const resourcePath = path.join(process.cwd(), "recursos", resourceFile);

  let fileBuffer;
  try {
    fileBuffer = await readFile(resourcePath);
  } catch {
    throw new Error(`No se encontró el banco de preguntas local en recursos/${resourceFile}.`);
  }

  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const { allCompetencies, activeCompetencies } = loadCompetencies(workbook);
  const questionBank = LEVELS.flatMap((level) => sheetToQuestions(workbook, level, allCompetencies));

  if (!questionBank.length) {
    throw new Error("El banco de preguntas local todavía no tiene preguntas cargadas.");
  }

  return { questionBank, competencies: activeCompetencies };
}
