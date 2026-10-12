// Renders the next unpublished MCQs as Shorts and uploads them to YouTube.
// Progress lives in mcqs_data/published.json, so every MCQ is posted once, in a
// fixed shuffled order that keeps topics mixed.
//
//   node scripts/publish.js [--count N] [--dry-run]
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

const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};

// Derived from the content, so editing the data file doesn't shift it.
const mcqId = (mcq) =>
  crypto
    .createHash("sha1")
    .update(JSON.stringify([mcq.question, mcq.options]))
    .digest("hex")
    .slice(0, 12);

const isUsable = (mcq) =>
  Array.isArray(mcq.options) &&
  mcq.options.length === 4 &&
  Number.isInteger(mcq.correctAnswer) &&
  mcq.correctAnswer >= 0 &&
  mcq.correctAnswer < mcq.options.length;

const main = async () => {
  const count = Number(argValue("--count") ?? process.env.COUNT ?? 1);
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

  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "src", "index.ts"),
    webpackOverride: (config) => config,
  });
  const accessToken = dryRun ? null : await getAccessToken(credentials);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let published = 0;
  try {
    for (const { mcq, index, id } of queue) {
      if (published >= count) {
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

      const metadata = buildMetadata(mcq);
      if (dryRun) {
        console.log(`Rendered ${file}\n${JSON.stringify(metadata, null, 2)}`);
      } else {
        const video = await uploadVideo({ accessToken, filePath: file, metadata });
        state.push({
          id,
          index,
          videoId: video.id,
          title: metadata.snippet.title,
          publishedAt: new Date().toISOString(),
        });
        console.log(
          `Published https://youtube.com/shorts/${video.id} ${metadata.snippet.title}`,
        );
      }
      published++;
    }
  } finally {
    if (!dryRun) {
      fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
    }
  }
  console.log(`${dryRun ? "Rendered" : "Published"} ${published} Short(s).`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
