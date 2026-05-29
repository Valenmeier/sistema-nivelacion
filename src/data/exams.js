const examDefinitions = {
  "demo-english": {
    id: "demo-english",
    language: "Inglés",
    // Para agregar otro idioma, creá otro Excel en /recursos y asigná aquí su archivo.
    questionBankFile: "Plantilla_Banco_Preguntas_Dinamicas.xlsx",
    writing: {
      prompt: "Escribí un texto de entre 180 y 220 palabras sobre una experiencia importante que hayas vivido, explicando qué ocurrió, qué aprendiste y cómo esa experiencia influyó en tus decisiones actuales. Asegurate de desarrollar tus ideas con claridad y usar ejemplos concretos.",
      evaluationNote: "Tu texto será evaluado en base a contenido, organización, vocabulario y gramática.",
      minWords: 180,
      maxWords: 220,
    },
    audio: {
      prompt: "Grabá un audio de 1 a 2 minutos explicando por qué querés estudiar el idioma, qué situaciones te gustaría poder resolver y qué experiencia previa tenés usándolo. Intentá hablar con claridad y desarrollar tus ideas con ejemplos concretos.",
      minSeconds: 60,
      maxSeconds: 120,
    },
  },
};

// IDs falsos para el prototipo. En producción, cada ID se asociará a su idioma/examen.
const accessIds = {
  "SET-DEMO-001": "demo-english",
  "VALEN-PRUEBA": "demo-english",
};

export function findExamByAccessId(rawId) {
  const id = rawId?.trim().toUpperCase();
  const examId = accessIds[id];
  return examId ? examDefinitions[examId] : null;
}

export function getExamById(examId) {
  return examDefinitions[examId] ?? null;
}
