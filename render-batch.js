const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");
const path = require("path");
const fs = require("fs");

const start = async () => {
  const startIndex = parseInt(process.env.START_INDEX || "0");
  const endIndex = parseInt(process.env.END_INDEX || "99");

  console.log(`\n🎬 Starting batch render: Videos ${startIndex} to ${endIndex}\n`);

  // Bundle the Remotion project
  console.log("📦 Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.resolve("./src/index.ts"),
    webpackOverride: (config) => config,
  });
  console.log("✓ Bundle complete!\n");

  // Load MCQ data
  const mcqsPath = path.join(process.cwd(), "mcqs_data", "gk", "gk_mcqs.json");
  const mcqs = JSON.parse(fs.readFileSync(mcqsPath, "utf8"));

  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Render each video in the batch
  for (let i = startIndex; i <= endIndex && i < mcqs.length; i++) {
    const mcq = mcqs[i];
    const videoName = `Quiz${i + 1}`;
    
    console.log(`\n[${i + 1}/${mcqs.length}] Rendering ${videoName}...`);
    console.log(`Question: ${mcq.question.substring(0, 60)}...`);

    try {
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: "QuizComposition",
      });

      const outputLocation = path.join(outputDir, `${videoName}.mp4`);

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: "h264",
        outputLocation,
        inputProps: {
          quizData: mcq,
        },
      });

      console.log(`✓ Rendered to ${outputLocation}`);

      // Create JSON file with MCQ data for this video
      const jsonLocation = path.join(outputDir, `${videoName}.json`);
      fs.writeFileSync(jsonLocation, JSON.stringify(mcq, null, 2));
      console.log(`✓ Created ${videoName}.json with MCQ data`);

    } catch (error) {
      console.error(`✗ Failed to render ${videoName}:`, error.message);
      // Continue with next video even if one fails
    }
  }

  console.log("\n✓ Batch rendering complete!");
  console.log(`Rendered ${endIndex - startIndex + 1} videos from index ${startIndex} to ${endIndex}`);
};

start().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
