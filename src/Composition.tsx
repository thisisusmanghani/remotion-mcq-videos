import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontsLoaded } from "./fonts";
import {
  CANVAS_WIDTH,
  CONTENT_WIDTH,
  EXPLANATION_TEXT,
  HAND_STACK,
  HEADER,
  INFO_ROW,
  OPTIONS,
  OPTION_TEXT,
  QUESTION,
  QUESTION_TEXT,
  REVEAL,
  SERIF_STACK,
  SIDE_MARGIN,
  TEXT_WRAP,
  TIMER,
} from "./layout";
import { FittedText, QuizQuestion, cleanQuiz, fitQuizText } from "./quiz-text";

const BRAND = {
  name: "LET’S ACHIEVE",
  paper: "ONE PAPER MCQs PRACTICE",
  exams: "PPSC • FPSC • Test Preparation",
  subject: "General Knowledge",
};

const INK = "#1d1d1b";
const RED_PEN = "#c0262d";
const BLUE_PEN = "#1f3f93";
const GRAPHITE = "#262626";
const PAPER = "#f3ede0";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// Text sizes depend on the loaded fonts, so hold the frame until they're known.
const useFittedText = (quiz: QuizQuestion): FittedText | null => {
  const [handle] = useState(() => delayRender("Fitting quiz text"));
  const [fitted, setFitted] = useState<FittedText | null>(null);

  useEffect(() => {
    fontsLoaded
      .then(() => setFitted(fitQuizText(quiz)))
      .catch((err) => cancelRender(err));
  }, [quiz]);

  useEffect(() => {
    if (fitted) {
      continueRender(handle);
    }
  }, [fitted, handle]);

  return fitted;
};

// Back-and-forth pencil strokes that cover a bubble when drawn in full.
const scribblePath = (size: number) => {
  const points: string[] = [];
  for (let y = 2, i = 0; y <= size; y += 7, i++) {
    const x = i % 2 === 0 ? 0 : size;
    points.push(`${i === 0 ? "M" : "L"} ${x} ${y + (i % 2) * 5}`);
  }
  return points.join(" ");
};

const Paper: React.FC = () => (
  <Img
    src={staticFile("textures/paper.jpg")}
    style={{
      position: "absolute",
      width: "100%",
      height: "100%",
      objectFit: "cover",
    }}
  />
);

const Rule: React.FC<{ top: number; thickness: number }> = ({
  top,
  thickness,
}) => (
  <div
    style={{
      position: "absolute",
      top,
      left: SIDE_MARGIN,
      width: CONTENT_WIDTH,
      height: thickness,
      background: INK,
    }}
  />
);

const Header: React.FC = () => (
  <>
    <Img
      src={staticFile("PPSC_Logo.png")}
      style={{
        position: "absolute",
        top: HEADER.top,
        left: SIDE_MARGIN,
        height: HEADER.logoHeight,
      }}
    />
    <Img
      src={staticFile("FPSC_Logo.png")}
      style={{
        position: "absolute",
        top: HEADER.top,
        right: SIDE_MARGIN,
        height: HEADER.logoHeight,
      }}
    />
    <div
      style={{
        position: "absolute",
        top: HEADER.top,
        width: "100%",
        height: HEADER.logoHeight,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        color: INK,
        lineHeight: 1,
      }}
    >
      <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: 2 }}>
        {BRAND.name}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 3 }}>
        {BRAND.paper}
      </div>
      <div style={{ fontSize: 26 }}>{BRAND.exams}</div>
    </div>
    {/* Double rule under the letterhead, as on a printed question paper */}
    <Rule top={HEADER.ruleTop} thickness={5} />
    <Rule top={HEADER.ruleTop + 11} thickness={2} />
  </>
);

const InfoRow: React.FC<{ subject: string }> = ({ subject }) => (
  <>
    <div
      style={{
        position: "absolute",
        top: INFO_ROW.top,
        left: SIDE_MARGIN,
        width: CONTENT_WIDTH,
        display: "flex",
        justifyContent: "space-between",
        fontSize: 30,
        lineHeight: 1,
        color: INK,
      }}
    >
      <span>
        <b>Subject:</b> {subject}
      </span>
      <span>
        <b>Time:</b> {TIMER.seconds} Seconds
      </span>
    </div>
    <Rule top={INFO_ROW.ruleTop} thickness={2} />
  </>
);

const Question: React.FC<{ text: string; fontSize: number }> = ({
  text,
  fontSize,
}) => (
  <div
    style={{
      position: "absolute",
      top: QUESTION.zoneTop,
      left: SIDE_MARGIN,
      width: CONTENT_WIDTH,
      height: QUESTION.zoneHeight,
      display: "flex",
      alignItems: "center",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        fontSize,
        fontWeight: QUESTION_TEXT.fontWeight,
        lineHeight: QUESTION_TEXT.lineHeight,
        color: INK,
      }}
    >
      <div style={{ width: QUESTION.labelWidth, flexShrink: 0 }}>Q.</div>
      <div style={{ ...TEXT_WRAP, width: QUESTION_TEXT.width, flexShrink: 0 }}>
        {text}
      </div>
    </div>
  </div>
);

const Stopwatch: React.FC<{ revealFrame: number }> = ({ revealFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = Math.min(frame / fps, TIMER.seconds);
  const shown = Math.ceil(TIMER.seconds - elapsed);
  const urgent = shown <= 3;
  const size = TIMER.size;
  const c = size / 2;
  const crown = 30;

  // Elapsed time as a pie slice, clockwise from 12 o'clock.
  const sweep = (elapsed / TIMER.seconds) * 2 * Math.PI;
  const pieRadius = c - 10;
  const pie =
    sweep <= 0
      ? ""
      : sweep >= 2 * Math.PI - 0.001
        ? `M ${c} ${c - pieRadius} A ${pieRadius} ${pieRadius} 0 1 1 ${c - 0.01} ${c - pieRadius} Z`
        : `M ${c} ${c} L ${c} ${c - pieRadius} A ${pieRadius} ${pieRadius} 0 ${sweep > Math.PI ? 1 : 0} 1 ${c + pieRadius * Math.sin(sweep)} ${c - pieRadius * Math.cos(sweep)} Z`;

  // A small mechanical kick on every whole second.
  const kick = interpolate(frame % fps, [0, 3, 6], [-4, 2, 0], clamp);
  const exit = interpolate(
    frame,
    [revealFrame, revealFrame + 5],
    [1, 0],
    clamp,
  );

  return (
    <div
      style={{
        position: "absolute",
        top: TIMER.top - crown,
        left: (CANVAS_WIDTH - size) / 2,
        width: size,
        height: size + crown,
        opacity: exit,
        transform: `rotate(${kick}deg)`,
        transformOrigin: `50% ${crown + c}px`,
      }}
    >
      <svg width={size} height={size + crown}>
        <g transform={`translate(0 ${crown})`}>
          <rect x={c - 11} y={-20} width={22} height={16} fill={INK} />
          <rect x={c - 22} y={-30} width={44} height={11} rx={3} fill={INK} />
          <rect
            x={c - 7}
            y={-14}
            width={14}
            height={12}
            fill={INK}
            transform={`rotate(42 ${c} ${c})`}
          />
          <circle
            cx={c}
            cy={c}
            r={c - 4}
            fill="none"
            stroke={INK}
            strokeWidth={6}
          />
          <path d={pie} fill={RED_PEN} fillOpacity={0.16} />
          {Array.from({ length: TIMER.seconds }, (_, i) => {
            const a = (i / TIMER.seconds) * 2 * Math.PI;
            return (
              <line
                key={i}
                x1={c + (c - 13) * Math.sin(a)}
                y1={c - (c - 13) * Math.cos(a)}
                x2={c + (c - 22) * Math.sin(a)}
                y2={c - (c - 22) * Math.cos(a)}
                stroke={INK}
                strokeWidth={3}
              />
            );
          })}
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          top: crown,
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 58,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: urgent ? RED_PEN : INK,
          lineHeight: 1,
        }}
      >
        {shown}
      </div>
    </div>
  );
};

// Once time is up: the answer in red pen, then a one-line explanation in blue
// ballpoint, like a tutor's note.
const HandwrittenAnswer: React.FC<{
  letter: string;
  explanation?: string;
  explanationFontSize: number | null;
  revealFrame: number;
}> = ({ letter, explanation, explanationFontSize, revealFrame }) => {
  const frame = useCurrentFrame();
  if (frame < revealFrame) {
    return null;
  }
  const write = interpolate(
    frame,
    [revealFrame + 2, revealFrame + 16],
    [0, 1],
    clamp,
  );
  const underline = interpolate(
    frame,
    [revealFrame + 14, revealFrame + 22],
    [0, 1],
    clamp,
  );
  const note = interpolate(
    frame,
    [revealFrame + 24, revealFrame + 36],
    [0, 1],
    clamp,
  );

  return (
    <div
      style={{
        position: "absolute",
        top: REVEAL.top,
        left: SIDE_MARGIN,
        width: CONTENT_WIDTH,
        height: REVEAL.answerHeight + EXPLANATION_TEXT.height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          height: REVEAL.answerHeight,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <div style={{ position: "relative", transform: "rotate(-3deg)" }}>
          <div
            style={{
              fontFamily: HAND_STACK,
              fontWeight: 700,
              fontSize: 64,
              lineHeight: 1.1,
              color: RED_PEN,
              clipPath: `inset(-20% ${(1 - write) * 100}% -20% -5%)`,
            }}
          >
            Ans: ({letter})
          </div>
          <svg
            width="100%"
            height={24}
            viewBox="0 0 100 24"
            preserveAspectRatio="none"
            style={{ position: "absolute", left: 0, bottom: -10 }}
          >
            <path
              d="M 2 14 C 30 8, 60 18, 98 9"
              fill="none"
              stroke={RED_PEN}
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - underline}
            />
          </svg>
        </div>
      </div>
      {explanation && explanationFontSize ? (
        <div
          style={{
            ...TEXT_WRAP,
            height: EXPLANATION_TEXT.height,
            width: EXPLANATION_TEXT.width,
            fontFamily: HAND_STACK,
            fontWeight: EXPLANATION_TEXT.fontWeight,
            fontSize: explanationFontSize,
            lineHeight: EXPLANATION_TEXT.lineHeight,
            textAlign: "center",
            color: BLUE_PEN,
            opacity: note,
            transform: `translateY(${(1 - note) * 10}px)`,
          }}
        >
          {explanation}
        </div>
      ) : null}
    </div>
  );
};

const OptionRow: React.FC<{
  index: number;
  text: string;
  fontSize: number;
  isCorrect: boolean;
  revealFrame: number;
}> = ({ index, text, fontSize, isCorrect, revealFrame }) => {
  const frame = useCurrentFrame();

  const appear = interpolate(
    frame,
    [6 + index * 4, 12 + index * 4],
    [0, 1],
    clamp,
  );
  const shade = isCorrect
    ? interpolate(frame, [revealFrame, revealFrame + 10], [0, 1], clamp)
    : 0;
  const tick = isCorrect
    ? interpolate(frame, [revealFrame + 8, revealFrame + 16], [0, 1], clamp)
    : 0;
  const bubble = OPTIONS.bubbleSize;

  return (
    <div
      style={{
        position: "absolute",
        top: OPTIONS.top + index * (OPTIONS.height + OPTIONS.gap),
        left: SIDE_MARGIN,
        width: CONTENT_WIDTH,
        height: OPTIONS.height,
        opacity: appear,
      }}
    >
      {/* OMR bubble, shaded in pencil for the correct answer */}
      <div
        style={{
          position: "absolute",
          left: OPTIONS.tickZone,
          top: (OPTIONS.height - bubble) / 2,
          width: bubble,
          height: bubble,
        }}
      >
        <svg width={bubble} height={bubble} style={{ position: "absolute" }}>
          <defs>
            <clipPath id={`bubble-${index}`}>
              <circle cx={bubble / 2} cy={bubble / 2} r={bubble / 2 - 5} />
            </clipPath>
          </defs>
          {shade > 0 ? (
            <path
              d={scribblePath(bubble)}
              clipPath={`url(#bubble-${index})`}
              fill="none"
              stroke={GRAPHITE}
              strokeWidth={12}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - shade}
            />
          ) : null}
          <circle
            cx={bubble / 2}
            cy={bubble / 2}
            r={bubble / 2 - 3}
            fill="none"
            stroke={INK}
            strokeWidth={4}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 38,
            fontWeight: 700,
            lineHeight: 1,
            color: shade > 0.6 ? PAPER : INK,
          }}
        >
          {LETTERS[index]}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: OPTIONS.tickZone + bubble + OPTIONS.textGap,
          top: OPTIONS.paddingY,
          width: OPTION_TEXT.width,
          height: OPTION_TEXT.height,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            ...TEXT_WRAP,
            width: "100%",
            fontSize,
            fontWeight: OPTION_TEXT.fontWeight,
            lineHeight: OPTION_TEXT.lineHeight,
            color: INK,
          }}
        >
          {text}
        </div>
      </div>
      {isCorrect ? (
        <svg
          width={OPTIONS.tickZone}
          height={OPTIONS.tickZone}
          viewBox="0 0 90 90"
          style={{
            position: "absolute",
            left: -8,
            top: (OPTIONS.height - OPTIONS.tickZone) / 2,
          }}
        >
          <path
            d="M 12 50 L 34 72 L 80 14"
            fill="none"
            stroke={RED_PEN}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - tick}
          />
        </svg>
      ) : null}
    </div>
  );
};

export const QuizComposition: React.FC<{ quizData: QuizQuestion }> = ({
  quizData,
}) => {
  const { fps } = useVideoConfig();
  const quiz = useMemo(() => cleanQuiz(quizData), [quizData]);
  const fitted = useFittedText(quiz);
  const revealFrame = TIMER.seconds * fps;

  return (
    <AbsoluteFill style={{ fontFamily: SERIF_STACK }}>
      <Paper />

      {/* Original soundtrack from scripts/make-audio.js: ticking countdown,
          then a chime at the reveal */}
      <Sequence durationInFrames={revealFrame}>
        <Audio src={staticFile("audio/countdown.wav")} />
      </Sequence>
      <Sequence from={revealFrame}>
        <Audio src={staticFile("audio/reveal.wav")} />
      </Sequence>

      {/* Multiply makes ink and logos sit in the paper like print */}
      <AbsoluteFill style={{ mixBlendMode: "multiply" }}>
        <Header />
        <InfoRow subject={quiz.category ?? BRAND.subject} />
        {fitted ? (
          <>
            <Question text={quiz.question} fontSize={fitted.questionFontSize} />
            <Stopwatch revealFrame={revealFrame} />
            {quiz.correctAnswer !== undefined ? (
              <HandwrittenAnswer
                letter={LETTERS[quiz.correctAnswer]}
                explanation={quiz.explanation}
                explanationFontSize={fitted.explanationFontSize}
                revealFrame={revealFrame}
              />
            ) : null}
            {quiz.options.map((option, index) => (
              <OptionRow
                key={index}
                index={index}
                text={option}
                fontSize={fitted.optionFontSize}
                isCorrect={index === quiz.correctAnswer}
                revealFrame={revealFrame}
              />
            ))}
          </>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
