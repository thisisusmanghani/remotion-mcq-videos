// Renders the next unpublished MCQs as Shorts and uploads them to YouTube,
// scheduled for fixed daily slots. Progress lives in mcqs_data/published.json,
// so every MCQ is posted once. Each bank is posted in a fixed shuffled order
// that keeps topics mixed.
//
//   node scripts/publish.js [--count N] [--dry-run]
//
// Each run fills the free slots of the next two days: a video is uploaded as
// private and YouTube makes it public at its slot's exact time. So it doesn't
// matter when GitHub starts the run (scheduled runs can be hours late), and
// each Short gets a few hours to itself before the next one appears.
// --count caps how many are scheduled in one run.
//
// Needs YT_CLIENT_ID, YT_CLIENT_SECRET and YT_REFRESH_TOKEN (see AUTOMATION.md).
// --dry-run renders and prints the metadata without uploading anything.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");
const { buildMetadata } = require("./seo");
const { getAccessToken, uploadVideo } = require("./youtube");

const ROOT = path.join(__dirname, "..");
const BANKS = {
  // Today's topics, written by scripts/current-affairs.js; stale after a week.
  current: path.join(ROOT, "mcqs_data", "current", "current_mcqs.json"),
  // Everyday knowledge people look up: crops, food, science, money, documents.
  knowledge: path.join(ROOT, "mcqs_data", "knowledge", "knowledge_mcqs.json"),
  // The reviewed one-paper General Knowledge bank.
  gk: path.join(ROOT, "mcqs_data", "gk", "gk_mcqs.json"),
};
const STATE_PATH = path.join(ROOT, "mcqs_data", "published.json");
const OUT_DIR = path.join(ROOT, "out", "publish");

// Pakistan time (UTC+5, no daylight saving), three hours apart from morning
// study time to the evening peak. Each slot takes the next MCQ from the first
// of its banks that has any left.
const SLOTS_PKT = [
  { time: "09:00", banks: ["knowledge", "gk"] },
  { time: "12:00", banks: ["gk"] },
  { time: "15:00", banks: ["current", "knowledge", "gk"] },
  { time: "18:00", banks: ["gk"] },
  { time: "21:00", banks: ["current", "knowledge", "gk"] },
];
const CURRENT_FRESH_DAYS = 7;
const PKT_OFFSET_HOURS = 5;
const LOOKAHEAD_HOURS = 48;
// YouTube must finish processing the video before it goes public.
const MIN_LEAD_MINUTES = 30;
// A slot this close to a Short that is already out or scheduled stays empty.
const MIN_GAP_HOURS = 2.5;
const HOUR = 60 * 60 * 1000;

const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};

// "2026-10-13 15:00 PKT", for the logs.
const pkt = (iso) => {
  const local = new Date(Date.parse(iso) + PKT_OFFSET_HOURS * HOUR);
  return `${local.toISOString().slice(0, 16).replace("T", " ")} PKT`;
};

// The slots ({ time: ISO string, banks }) in the lookahead window that are
// still free.
const freeSlots = (now, state) => {
  const taken = state
    .map((entry) => Date.parse(entry.publishAt ?? entry.publishedAt))
    .filter(Number.isFinite);
  const today = new Date(now + PKT_OFFSET_HOURS * HOUR);
  const slots = [];
  for (let day = 0; day <= LOOKAHEAD_HOURS / 24; day++) {
    for (const { time: clock, banks } of SLOTS_PKT) {
      const [hours, minutes] = clock.split(":").map(Number);
      const time = Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() + day,
        hours - PKT_OFFSET_HOURS,
        minutes,
      );
      if (
        time >= now + MIN_LEAD_MINUTES * 60 * 1000 &&
        time <= now + LOOKAHEAD_HOURS * HOUR &&
        taken.every((t) => Math.abs(t - time) >= MIN_GAP_HOURS * HOUR)
      ) {
        slots.push({ time: new Date(time).toISOString(), banks });
      }
    }
  }
  return slots;
};

// Derived from the content, so editing the data file doesn't shift it.
const mcqId = (mcq) =>
  crypto
    .createHash("sha1")
    .update(JSON.stringify([mcq.question, mcq.options]))
    .digest("hex")
    .slice(0, 12);

// Only reviewed MCQs: the answer was checked and an explanation written.
// Flagged ones (`skip`) are wrong, ambiguous or out of date.
const isUsable = (mcq) =>
  typeof mcq.explanation === "string" &&
  mcq.explanation.length > 0 &&
  !mcq.skip &&
  Array.isArray(mcq.options) &&
  mcq.options.length === 4 &&
  Number.isInteger(mcq.correctAnswer) &&
  mcq.correctAnswer >= 0 &&
  mcq.correctAnswer < mcq.options.length;

// Curiosity topics (records, sport, animals, space, inventions) got 5 to 15
// times the views of dry trivia (days, abbreviations, headquarters), so the
// GK queue starts with them and leaves the dry ones for last.
const DRY =
  /\b(observed|celebrated|stands? for|abbreviation|headquarters?|secretariat|news agency|airlines?|sea ?port|port of|secretary.?general|theme)\b/i;
const CURIOUS =
  /\b(fastest|largest|biggest|tallest|longest|smallest|highest|deepest|oldest|hottest|coldest|heaviest|invent\w*|discover\w*|records?|cricket|world cup|olympics?|football|hockey|squash|planets?|moon|space|animals?|birds?|fish|insects?|snakes?|tiger|lion|elephant|human body|blood|bones?|heart|brain|volcano\w*|earthquake|desert|waterfall)\b/i;
const interest = (mcq) => {
  if (DRY.test(mcq.question)) {
    return 2;
  }
  return CURIOUS.test(`${mcq.question} ${mcq.explanation}`) ? 0 : 1;
};

// Order within a bank: newest news first; GK by interest; the rest shuffled.
const compare = {
  current: (a, b) => Date.parse(b.mcq.createdAt) - Date.parse(a.mcq.createdAt),
  gk: (a, b) => interest(a.mcq) - interest(b.mcq),
};

const loadQueue = (bank, file, done) => {
  if (!fs.existsSync(file)) {
    return [];
  }
  const queued = new Set();
  return (
    JSON.parse(fs.readFileSync(file, "utf8"))
      .map((mcq, index) => ({ mcq, index, id: mcqId(mcq), bank }))
      .filter(({ mcq, id }) => isUsable(mcq) && !done.has(id))
      .filter(
        ({ mcq }) =>
          bank !== "current" ||
          Date.now() - Date.parse(mcq.createdAt) <
            CURRENT_FRESH_DAYS * 24 * HOUR,
      )
      .sort((a, b) => (compare[bank]?.(a, b) ?? 0) || (a.id < b.id ? -1 : 1))
      // The data has a few duplicate questions; post each only once.
      .filter(({ id }) => !queued.has(id) && queued.add(id))
  );
};

const render = async (serveUrl, mcq, file) => {
  const inputProps = { quizData: mcq };
  const composition = await selectComposition({
    serveUrl,
    id: "QuizComposition",
    inputProps,
  });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: file,
    inputProps,
  });
};

const main = async () => {
  const count = argValue("--count") || process.env.COUNT;
  const dryRun =
    process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";
  const credentials = {
    clientId: process.env.YT_CLIENT_ID,
    clientSecret: process.env.YT_CLIENT_SECRET,
    refreshToken: process.env.YT_REFRESH_TOKEN,
  };
  if (!dryRun && !Object.values(credentials).every(Boolean)) {
    console.log(
      "YouTube credentials are not set (YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN), so nothing was published. See AUTOMATION.md.",
    );
    return;
  }

  const state = fs.existsSync(STATE_PATH)
    ? JSON.parse(fs.readFileSync(STATE_PATH, "utf8"))
    : [];
  const done = new Set(state.map((entry) => entry.id));
  const queues = Object.fromEntries(
    Object.entries(BANKS).map(([bank, file]) => [
      bank,
      loadQueue(bank, file, done),
    ]),
  );
  console.log(
    `MCQs left to publish: ${Object.entries(queues)
      .map(([bank, queue]) => `${queue.length} ${bank}`)
      .join(", ")}.`,
  );

  const limit = count ? Number(count) : Infinity;
  const slots = freeSlots(Date.now(), state).slice(0, limit);
  // A dry run always renders one, to test the pipeline.
  if (dryRun && !slots.length) {
    slots.push({ time: null, banks: SLOTS_PKT[0].banks });
  }
  if (!slots.length) {
    console.log(`The next ${LOOKAHEAD_HOURS} hours are already scheduled.`);
    return;
  }

  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "src", "index.ts"),
    webpackOverride: (config) => config,
  });
  const accessToken = dryRun ? null : await getAccessToken(credentials);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let scheduled = 0;
  try {
    for (const slot of slots) {
      let item = null;
      // Text that can't fit is a property of the MCQ, so skip it for good and
      // give the slot to the next one. Anything else may be transient: fail
      // the run and retry next time.
      while (!item) {
        const bank = slot.banks.find((name) => queues[name].length);
        if (!bank) {
          break;
        }
        const next = queues[bank].shift();
        console.log(
          `Rendering ${bank} MCQ #${next.index}: ${next.mcq.question}`,
        );
        next.file = path.join(OUT_DIR, `${next.id}.mp4`);
        try {
          await render(serveUrl, next.mcq, next.file);
          item = next;
        } catch (err) {
          if (!/does not fit/.test(err.message)) {
            throw err;
          }
          console.warn(
            `Skipping ${bank} MCQ #${next.index}: its text does not fit.`,
          );
          if (!dryRun) {
            state.push({
              id: next.id,
              bank,
              index: next.index,
              skipped: "text does not fit",
            });
          }
        }
      }
      if (!item) {
        console.log("No reviewed MCQs left for this slot.");
        break;
      }

      const { mcq, index, id, bank, file } = item;
      const publishAt = slot.time;
      const metadata = buildMetadata(mcq, publishAt);
      if (dryRun) {
        console.log(`Rendered ${file}\n${JSON.stringify(metadata, null, 2)}`);
      } else {
        const video = await uploadVideo({
          accessToken,
          filePath: file,
          metadata,
        });
        state.push({
          id,
          bank,
          index,
          category: mcq.category ?? "General Knowledge",
          videoId: video.id,
          title: metadata.snippet.title,
          publishAt,
          uploadedAt: new Date().toISOString(),
        });
        console.log(
          `Scheduled https://youtube.com/shorts/${video.id} for ${pkt(publishAt)}: ${metadata.snippet.title}`,
        );
      }
      scheduled++;
    }
  } finally {
    if (!dryRun) {
      fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
    }
  }
  console.log(`${dryRun ? "Rendered" : "Scheduled"} ${scheduled} Short(s).`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
