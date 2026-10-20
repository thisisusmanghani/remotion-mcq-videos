// Writes current-affairs MCQs from what Pakistan is searching for and reading
// today, so some Shorts ride the day's topics. Each run tops up a small pool
// in mcqs_data/current/current_mcqs.json; publish.js posts them within a week.
//
//   node scripts/current-affairs.js [--dry-run]
//
// Topics come from the public Google Trends and Google News feeds for
// Pakistan. Gemini researches each one with Google Search and writes an MCQ,
// then a second call fact-checks it; only MCQs that pass both are kept.
// Needs GEMINI_API_KEY (free tier: https://aistudio.google.com/app/apikey).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const POOL_PATH = path.join(ROOT, "mcqs_data", "current", "current_mcqs.json");
const STATE_PATH = path.join(ROOT, "mcqs_data", "published.json");

// Gemini 2.5 Flash gets 500 free Google Search requests a day (shared with
// Flash-Lite); a run here uses a handful.
const MODEL = "gemini-2.5-flash";
const API = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const FEEDS = [
  "https://trends.google.com/trending/rss?geo=PK",
  "https://news.google.com/rss?hl=en-PK&gl=PK&ceid=PK:en",
];
// publish.js posts current affairs for up to this many days after writing.
const FRESH_DAYS = 7;
// Two current-affairs slots a day, two days ahead.
const TARGET_FRESH = 4;
const MAX_PER_RUN = 3;
const DAY = 24 * 60 * 60 * 1000;

const LETTERS = ["A", "B", "C", "D"];

// Same id as publish.js, so published MCQs are recognised.
const mcqId = (mcq) =>
  crypto
    .createHash("sha1")
    .update(JSON.stringify([mcq.question, mcq.options]))
    .digest("hex")
    .slice(0, 12);

// The video's fonts cover Latin text and common punctuation; anything else
// (Urdu script, emoji) would render as boxes.
const printable = (text) =>
  /^[\u0020-\u007E\u00A0-\u017F\u2010-\u2027\u2032\u2033\u2212]*$/.test(text);

const decode = (text) =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

// Titles of the feeds' items, plus the news headlines Google Trends attaches
// to each trending search.
const readFeeds = async () => {
  const lines = [];
  for (const url of FEEDS) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const xml = await res.text();
      for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
        const title = decode(
          item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "",
        );
        const news = [
          ...item.matchAll(
            /<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g,
          ),
        ]
          .map((m) => decode(m[1]))
          .slice(0, 2);
        if (title) {
          lines.push(news.length ? `${title} (${news.join("; ")})` : title);
        }
      }
    } catch (err) {
      console.warn(`Could not read ${url}: ${err.message}`);
    }
  }
  return lines.slice(0, 50);
};

const gemini = async (prompt) => {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    });
    const body = await res.text();
    if (res.ok) {
      const candidate = JSON.parse(body).candidates?.[0];
      return {
        text: (candidate?.content?.parts ?? [])
          .map((p) => p.text ?? "")
          .join(""),
        sources: (candidate?.groundingMetadata?.groundingChunks ?? [])
          .map((chunk) => chunk.web?.title)
          .filter(Boolean),
      };
    }
    // Rate limits and server errors pass; a bad key or request won't.
    if ((res.status !== 429 && res.status < 500) || attempt === 3) {
      throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 20000));
  }
};

// Gemini can't combine Search with a JSON schema, so the JSON comes back as
// text, sometimes inside a code fence.
const parseJson = (text, open, close) => {
  const start = text.indexOf(open);
  const end = text.lastIndexOf(close);
  if (start < 0 || end < start) {
    throw new Error(`No JSON in reply: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text.slice(start, end + 1));
};

const AVOID =
  "deaths, disasters, accidents, crimes, terrorism, wars or military clashes; partisan politics, elections or allegations; religious or sectarian controversy; celebrity gossip; anything unconfirmed, disputed or likely to change within days";

const writePrompt = (
  today,
  feed,
  recent,
  count,
) => `Today is ${today}. You write current-affairs MCQs for "Let's Achieve", a YouTube Shorts quiz channel for Pakistani students and job seekers preparing for PPSC and FPSC exams.

This is what Pakistan is searching for and reading today:
${feed.map((line) => `- ${line}`).join("\n")}

Topics already covered recently (pick different ones):
${recent.length ? recent.map((topic) => `- ${topic}`).join("\n") : "- none"}

Pick up to ${count} topics from the list above, or other important news from the past 7 days, that make good quiz questions. Research each one with Google Search and write one MCQ per topic.

Good topics are factual and interesting to a general Pakistani audience: appointments to major posts, sports results and records, science, space and technology launches, economic and infrastructure milestones, international summits and agreements, awards, notable firsts, and international days this week.
Never pick: ${AVOID}.

Rules for each MCQ:
- The question is at most 120 characters, in simple English, and names the month and year (for example "In October 2026, ...") so it stays correct later.
- Four short options (at most 40 characters each), exactly one clearly correct, with plausible distractors. Never "All of the above" or "None of these".
- The explanation is one sentence of at most 100 characters stating the confirmed fact and its date.
- Only events that have already happened: nothing scheduled, planned or expected.
- Use only facts confirmed by your search results. Plain English letters only: no Urdu script, no emoji.

Reply with only a JSON array, and [] if nothing qualifies:
[{"topic": "short topic name", "question": "...", "options": ["...", "...", "...", "..."], "answer": "A", "explanation": "..."}]`;

const checkPrompt = (
  today,
  mcq,
) => `Today is ${today}. Fact-check this quiz question for a Pakistani exam-preparation channel, using Google Search.

Question: ${mcq.question}
${mcq.options.map((option, i) => `${LETTERS[i]}) ${option}`).join("\n")}
Proposed answer: ${LETTERS[mcq.correctAnswer]}
Explanation: ${mcq.explanation}

Reply with only JSON: {"verdict": "correct" | "incorrect" | "unsure", "answer": "A" | "B" | "C" | "D", "note": "one short reason"}.
Say "correct" only if reliable sources confirm the proposed answer and the explanation, the event has already happened, no other option is also correct, and the topic is not about ${AVOID}.`;

// Same limits the video layout and the reviewed banks use.
const problems = (mcq) => {
  const found = [];
  const texts = [mcq.question, ...mcq.options, mcq.explanation];
  if (mcq.question.length > 120) found.push("question too long");
  if (mcq.options.length !== 4) found.push("needs 4 options");
  if (mcq.options.some((option) => !option || option.length > 60)) {
    found.push("option empty or too long");
  }
  if (new Set(mcq.options.map((o) => o.toLowerCase())).size !== 4) {
    found.push("duplicate options");
  }
  if (
    mcq.options.some((o) =>
      /all of the above|none of (these|the above)/i.test(o),
    )
  ) {
    found.push("all/none option");
  }
  if (!Number.isInteger(mcq.correctAnswer)) found.push("no answer");
  if (mcq.explanation.length < 25 || mcq.explanation.length > 130) {
    found.push("explanation length");
  }
  if (!texts.every(printable)) found.push("characters the fonts can't draw");
  return found;
};

const main = async () => {
  const dryRun = process.argv.includes("--dry-run");
  if (!process.env.GEMINI_API_KEY) {
    console.log(
      "GEMINI_API_KEY is not set, so no current-affairs MCQs were written.",
    );
    return;
  }
  const now = Date.now();
  const pool = fs.existsSync(POOL_PATH)
    ? JSON.parse(fs.readFileSync(POOL_PATH, "utf8"))
    : [];
  const published = new Set(
    (fs.existsSync(STATE_PATH)
      ? JSON.parse(fs.readFileSync(STATE_PATH, "utf8"))
      : []
    ).map((entry) => entry.id),
  );
  const fresh = pool.filter(
    (mcq) =>
      now - Date.parse(mcq.createdAt) < FRESH_DAYS * DAY &&
      !published.has(mcqId(mcq)),
  );
  const wanted = Math.min(MAX_PER_RUN, TARGET_FRESH - fresh.length);
  if (wanted <= 0 && !dryRun) {
    console.log(
      `${fresh.length} fresh current-affairs MCQs are waiting; none needed.`,
    );
    return;
  }

  const today = new Date(now + 5 * 60 * 60 * 1000).toUTCString().slice(5, 16);
  const feed = await readFeeds();
  if (!feed.length) {
    console.log("The trend feeds were empty; trying again next run.");
    return;
  }
  const recent = pool
    .filter((mcq) => now - Date.parse(mcq.createdAt) < 30 * DAY)
    .map((mcq) => mcq.topic);

  const draft = await gemini(
    writePrompt(today, feed, recent, Math.max(wanted, 1)),
  );
  const drafts = parseJson(draft.text, "[", "]");
  console.log(`Gemini drafted ${drafts.length} MCQ(s).`);

  const kept = [];
  for (const item of drafts) {
    const mcq = {
      question: String(item.question ?? "").trim(),
      options: (item.options ?? []).map((option) => String(option).trim()),
      correctAnswer: LETTERS.indexOf(
        String(item.answer ?? "")
          .trim()
          .toUpperCase(),
      ),
      explanation: String(item.explanation ?? "").trim(),
      category: "Current Affairs",
      topic: String(item.topic ?? "").trim(),
    };
    if (mcq.correctAnswer < 0) mcq.correctAnswer = undefined;
    const issues = problems(mcq);
    if (issues.length) {
      console.log(`Dropped (${issues.join(", ")}): ${mcq.question}`);
      continue;
    }
    const check = await gemini(checkPrompt(today, mcq));
    let verdict;
    try {
      verdict = parseJson(check.text, "{", "}");
    } catch {
      verdict = { verdict: "unsure", note: "unreadable reply" };
    }
    if (
      verdict.verdict !== "correct" ||
      LETTERS.indexOf(String(verdict.answer).toUpperCase()) !==
        mcq.correctAnswer
    ) {
      console.log(
        `Dropped (fact-check: ${verdict.verdict}, ${verdict.note}): ${mcq.question}`,
      );
      continue;
    }
    kept.push({
      ...mcq,
      createdAt: new Date(now).toISOString(),
      sources: [...new Set(check.sources)].slice(0, 5),
    });
    console.log(
      `Kept: ${mcq.question} -> ${LETTERS[mcq.correctAnswer]}) ${mcq.options[mcq.correctAnswer]}`,
    );
  }

  if (dryRun) {
    console.log(JSON.stringify(kept, null, 2));
    return;
  }
  fs.mkdirSync(path.dirname(POOL_PATH), { recursive: true });
  fs.writeFileSync(
    POOL_PATH,
    `${JSON.stringify([...pool, ...kept], null, 2)}\n`,
  );
  console.log(`Added ${kept.length} current-affairs MCQ(s) to the pool.`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
