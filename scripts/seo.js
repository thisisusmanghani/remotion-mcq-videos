// Builds the YouTube title, description and tags for one MCQ from plain
// templates: no API key needed, and the metadata always matches the video.

const CHANNEL = "Let's Achieve";
const LETTERS = ["A", "B", "C", "D", "E", "F"];

const BASE_TAGS = [
  "PPSC MCQs",
  "FPSC MCQs",
  "one paper MCQs",
  "general knowledge",
  "GK MCQs",
  "GK quiz",
  "Pakistan GK",
  "PPSC preparation",
  "FPSC preparation",
  "NTS MCQs",
  "competitive exams",
  "MCQs with answers",
];

// Capitalised words that say nothing about the topic.
const STOP_WORDS = new Set([
  "which",
  "what",
  "who",
  "whom",
  "whose",
  "when",
  "where",
  "why",
  "how",
  "the",
  "this",
  "that",
  "these",
  "those",
  "it",
  "is",
  "in",
  "of",
  "none",
  "all",
  "both",
  "above",
]);

// YouTube rejects < and > in titles and descriptions; scraped text also has
// invisible format characters, ✓ marks and long "_____" blanks.
const plain = (text) =>
  text
    .replace(/\p{Cf}/gu, "")
    .replace(/✓/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s*_{2,}\s*/g, " ___ ")
    .replace(/\s+([?.,:;!])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

const MAX_TITLE = 100;

const buildTitle = (question) => {
  for (const suffix of [" | PPSC & FPSC MCQs", " | PPSC MCQs", " #PPSC", ""]) {
    if (question.length + suffix.length <= MAX_TITLE) {
      return question + suffix;
    }
  }
  return `${question.slice(0, MAX_TITLE - 1).replace(/\s+\S*$/, "")}…`;
};

// Runs of capitalised words ("Downing Street", "British PM") make the best
// tags; a leading "Which"/"The" is dropped.
const keyPhrases = (text) =>
  (text.match(/[A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)*/g) ?? [])
    .map((phrase) => {
      const words = phrase.split(/\s+/);
      while (words.length && STOP_WORDS.has(words[0].toLowerCase())) {
        words.shift();
      }
      return words.join(" ");
    })
    .filter((phrase) => phrase.length > 2);

const buildTags = (question, answer) => {
  const keywords = [...new Set(keyPhrases(`${question} ${answer}`))];
  // YouTube allows 500 characters of tags in total, separators included.
  const tags = [];
  let length = 0;
  for (const tag of [...keywords.slice(0, 8), ...BASE_TAGS]) {
    if (length + tag.length + 3 > 480) {
      break;
    }
    tags.push(tag);
    length += tag.length + 3;
  }
  return tags;
};

const buildMetadata = (mcq) => {
  const question = plain(mcq.question);
  const options = mcq.options.map(plain);
  const letter = LETTERS[mcq.correctAnswer];
  const answer = options[mcq.correctAnswer];

  const description = [
    question,
    "",
    ...options.map((option, i) => `(${LETTERS[i]}) ${option}`),
    "",
    "⏱️ You have 10 seconds. Comment your answer before the reveal!",
    "",
    `Daily one-paper MCQs for PPSC, FPSC, NTS, KPPSC, SPSC and other competitive exams in Pakistan. Subscribe to ${CHANNEL} for a new General Knowledge MCQ every day.`,
    "",
    `✅ Answer: (${letter}) ${answer}`,
    ...(mcq.explanation ? [`💡 ${plain(mcq.explanation)}`] : []),
    "",
    "#PPSC #FPSC #MCQs #GeneralKnowledge #OnePaperMCQs #shorts",
  ].join("\n");

  return {
    snippet: {
      title: buildTitle(question),
      description,
      tags: buildTags(question, answer),
      categoryId: "27", // Education
      defaultLanguage: "en",
    },
    status: {
      privacyStatus: "public",
      selfDeclaredMadeForKids: false,
    },
  };
};

module.exports = { buildMetadata };
