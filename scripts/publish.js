// Renders the next unpublished MCQs as Shorts and uploads them to YouTube,
// scheduled for fixed daily slots. Progress lives in mcqs_data/published.json,
// so every MCQ is posted once, in a fixed shuffled order that keeps topics mixed.
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
const MCQS_PATH = path.join(ROOT, "mcqs_data", "gk", "gk_mcqs.json");
const STATE_PATH = path.join(ROOT, "mcqs_data", "published.json");
const OUT_DIR = path.join(ROOT, "out", "publish");

// Pakistan time (UTC+5, no daylight saving): mid-morning study time, the
// afternoon break, and an hour before the evening peak.
const SLOTS_PKT = ["10:00", "15:00", "20:00"];
const PKT_OFFSET_HOURS = 5;
const LOOKAHEAD_HOURS = 48;
// YouTube must finish processing the video before it goes public.
const MIN_LEAD_MINUTES = 30;
// A slot this close to a Short that is already out or scheduled stays empty.
const MIN_GAP_HOURS = 3;
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

// The slot times (ISO strings) in the lookahead window that are still free.
const freeSlots = (now, state) => {
  const taken = state
    .map((entry) => Date.parse(entry.publishAt ?? entry.publishedAt))
    .filter(Number.isFinite);
  const today = new Date(now + PKT_OFFSET_HOURS * HOUR);
  const slots = [];
  for (let day = 0; day <= LOOKAHEAD_HOURS / 24; day++) {
    for (const slot of SLOTS_PKT) {
      const [hours, minutes] = slot.split(":").map(Number);
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
        slots.push(new Date(time).toISOString());
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

  const mcqs = JSON.parse(fs.readFileSync(MCQS_PATH, "utf8"));
  const state = fs.existsSync(STATE_PATH)
    ? JSON.parse(fs.readFileSync(STATE_PATH, "utf8"))
    : [];
  const done = new Set(state.map((entry) => entry.id));
  const queued = new Set();
  const queue = mcqs
    .map((mcq, index) => ({ mcq, index, id: mcqId(mcq) }))
    .filter(({ mcq, id }) => isUsable(mcq) && !done.has(id))
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    // The data has a few duplicate questions; post each only once.
    .filter(({ id }) => !queued.has(id) && queued.add(id));
  console.log(`${queue.length} MCQs left to publish.`);

  const limit = count ? Number(count) : Infinity;
  const slots = freeSlots(Date.now(), state).slice(0, limit);
  // A dry run always renders one, to test the pipeline.
  if (dryRun && !slots.length) {
    slots.push(null);
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
    for (const { mcq, index, id } of queue) {
      if (scheduled >= slots.length) {
        break;
      }
      console.log(`Rendering MCQ #${index}: ${mcq.question}`);
      const inputProps = { quizData: mcq };
      const file = path.join(OUT_DIR, `${id}.mp4`);
      try {
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
      } catch (err) {
        // Text that can't fit is a property of the MCQ, so skip it for good.
        // Anything else may be transient: fail the run and retry next time.
        if (!/does not fit/.test(err.message)) {
          throw err;
        }
        console.warn(`Skipping MCQ #${index}: its text does not fit.`);
        if (!dryRun) {
          state.push({ id, index, skipped: "text does not fit" });
        }
        continue;
      }

      const publishAt = slots[scheduled];
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
          index,
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
