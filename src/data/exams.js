const demoQuestions = [
  {
    id: "q1",
    instruction: "Leé el siguiente texto y respondé la pregunta.",
    text: "Remote work has become a defining feature of the modern workplace. What started as a temporary solution during the pandemic has now evolved into a long-term option for many companies and employees. While it offers flexibility and the opportunity to better balance personal and professional life, it also presents challenges. Some people struggle with isolation, lack of motivation, or the difficulty of separating work from personal life. Companies, on the other hand, must find new ways to maintain team cohesion, ensure productivity, and support employee well-being. As technology continues to evolve, remote work is likely to remain a significant part of the future of work, but its success will depend on how well organizations and individuals adapt to this new reality.",
    question: "What is the main idea of the text?",
    options: [
      "Remote work is a temporary solution that will disappear in the future.",
      "Remote work offers benefits and challenges and will remain important in the future.",
      "Companies prefer remote work because it reduces costs.",
      "Technology has eliminated the need for teamwork in the workplace.",
      "Employees are not ready to work from home and struggle to adapt to new technologies and work environments.",
    ],
  },
  {
    id: "q2",
    instruction: "Seleccioná la opción correcta.",
    question: "Choose the correct sentence:",
    options: [
      "She has lived in Córdoba since five years.",
      "She lives in Córdoba for five years ago.",
      "She has lived in Córdoba for five years.",
      "She have lived in Córdoba for five years.",
    ],
  },
  {
    id: "q3",
    instruction: "Leé la situación y elegí la mejor respuesta.",
    question: "A colleague asks: ‘Could you send me the report by Friday?’ What is the most appropriate reply?",
    options: [
      "Yes, I can send it before the deadline.",
      "No report Friday perhaps.",
      "I sending it yesterday.",
      "By Friday was sent.",
    ],
  },
  ...Array.from({ length: 7 }, (_, index) => ({
    id: `q${index + 4}`,
    instruction: "Seleccioná la respuesta que consideres correcta.",
    question: `Pregunta de ejemplo ${index + 4}: elegí la opción adecuada.`,
    options: ["Opción A", "Opción B", "Opción C", "Opción D"],
  })),
];

const examDefinitions = {
  "demo-english": {
    id: "demo-english",
    language: "Inglés",
    multipleChoice: demoQuestions,
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

// IDs falsos para el prototipo. Solo estos códigos habilitan un examen.
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
