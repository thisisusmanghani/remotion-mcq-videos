// Geometry and typography for the 1080x1920 quiz video, styled as a printed
// exam paper with an OMR answer sheet. Everything sits at a fixed position, so
// a long question or option can only shrink its own text; it can never push
// other elements around.
//
// Content stays between y=140 and y≈1540: YouTube Shorts draws its top bar
// above that and the title/channel overlay below it.

export const SERIF_FAMILY = "Tinos";
export const HAND_FAMILY = "Kalam";
export const SERIF_STACK = `${SERIF_FAMILY}, "Times New Roman", serif`;
export const HAND_STACK = `${HAND_FAMILY}, cursive`;

export const CANVAS_WIDTH = 1080;
export const SIDE_MARGIN = 70;
export const CONTENT_WIDTH = CANVAS_WIDTH - 2 * SIDE_MARGIN;

export const HEADER = {
  top: 140,
  logoHeight: 150,
  ruleTop: 318,
};

export const INFO_ROW = {
  top: 352,
  ruleTop: 404,
};

export const QUESTION = {
  // The question is vertically centred inside this zone.
  zoneTop: 436,
  zoneHeight: 364,
  labelWidth: 84,
};

export const TIMER = {
  // Top of the stopwatch body; its crown sits above this.
  top: 838,
  size: 136,
  seconds: 10,
};

export const OPTIONS = {
  top: 1000,
  height: 120,
  gap: 20,
  // Left margin where the examiner's red tick goes; the right edge is
  // covered by YouTube's like/comment buttons.
  tickZone: 80,
  bubbleSize: 80,
  textGap: 30,
  paddingY: 8,
};

export type TextBox = {
  fontFamily: string;
  width: number;
  height: number;
  fontWeight: number;
  lineHeight: number;
  maxFontSize: number;
  minFontSize: number;
};

export const QUESTION_TEXT: TextBox = {
  fontFamily: SERIF_STACK,
  width: CONTENT_WIDTH - QUESTION.labelWidth,
  height: QUESTION.zoneHeight,
  fontWeight: 700,
  lineHeight: 1.25,
  maxFontSize: 68,
  minFontSize: 32,
};

export const OPTION_TEXT: TextBox = {
  fontFamily: SERIF_STACK,
  width:
    CONTENT_WIDTH - OPTIONS.tickZone - OPTIONS.bubbleSize - OPTIONS.textGap,
  height: OPTIONS.height - 2 * OPTIONS.paddingY,
  fontWeight: 400,
  lineHeight: 1.15,
  maxFontSize: 62,
  minFontSize: 22,
};

// Wrapping rules shared by the renderer and the fitting code. `balance` keeps
// the same number of lines as normal wrapping, just evens out line lengths.
export const TEXT_WRAP = {
  textWrap: "balance",
  overflowWrap: "anywhere",
} as const;
