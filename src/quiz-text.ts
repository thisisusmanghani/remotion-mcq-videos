import { measureText } from "@remotion/layout-utils";
import { OPTION_TEXT, QUESTION_TEXT, TextBox } from "./layout";

export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer?: number;
};

// Scraped questions come with long "_____________" blanks, invisible
// characters and, in a few cases, the answer already marked with a ✓.
export const cleanText = (text: string): string =>
  text
    .replace(/[\u200B-\u200F\u2060\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\u2713/g, "")
    .replace(/\s*_{2,}\s*/g, " _____ ")
    .replace(/\s+([?.,:;!])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

export const cleanQuiz = (quiz: QuizQuestion): QuizQuestion => ({
  ...quiz,
  question: cleanText(quiz.question),
  options: quiz.options.map(cleanText),
});

// Measuring word by word ignores kerning across spaces; keep a small margin.
const WIDTH_SAFETY = 0.98;

// Greedy word wrap, the same way the browser breaks lines. No
// validateFontIsLoaded: Tinos shares Times New Roman's metrics, which that
// check mistakes for a fallback font. Callers wait for fontsLoaded instead.
const countLines = (words: string[], fontSize: number, box: TextBox) => {
  const measure = (text: string) =>
    measureText({
      text,
      fontFamily: box.fontFamily,
      fontSize,
      fontWeight: box.fontWeight,
    }).width;

  const maxWidth = box.width * WIDTH_SAFETY;
  const space = measure(" ");
  let lines = 1;
  let lineWidth = 0;
  for (const word of words) {
    const wordWidth = measure(word);
    if (wordWidth > maxWidth) {
      return Infinity;
    }
    if (lineWidth === 0) {
      lineWidth = wordWidth;
    } else if (lineWidth + space + wordWidth <= maxWidth) {
      lineWidth += space + wordWidth;
    } else {
      lines++;
      lineWidth = wordWidth;
    }
  }
  return lines;
};

// Largest font size at which the text fits inside the box, or null if it
// doesn't fit even at the minimum size.
export const fitFontSize = (text: string, box: TextBox): number | null => {
  const words = text.split(" ").filter(Boolean);
  for (let size = box.maxFontSize; size >= box.minFontSize; size--) {
    const maxLines = Math.floor(box.height / (size * box.lineHeight));
    if (maxLines >= 1 && countLines(words, size, box) <= maxLines) {
      return size;
    }
  }
  return null;
};

export type FittedText = {
  questionFontSize: number;
  // All options share one size so the four cards look consistent.
  optionFontSize: number;
};

// Fonts must be loaded before calling this. Throws if the text can't fit, so
// the batch render skips that video instead of publishing clipped text.
export const fitQuizText = (quiz: QuizQuestion): FittedText => {
  const questionFontSize = fitFontSize(quiz.question, QUESTION_TEXT);
  const optionFontSizes = quiz.options.map((o) => fitFontSize(o, OPTION_TEXT));
  if (questionFontSize === null || optionFontSizes.includes(null)) {
    throw new Error(
      `Quiz text does not fit even at the minimum font size: ${JSON.stringify(quiz)}`,
    );
  }
  return {
    questionFontSize,
    optionFontSize: Math.min(...(optionFontSizes as number[])),
  };
};
