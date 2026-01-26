const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");
const path = require("path");
const fs = require("fs");

const start = async () => {
  const compositionIds = [
    "Quiz4"
  ];

  const bundleLocation = await bundle({
    entryPoint: path.resolve("./src/index.ts"),
    webpackOverride: (config) => config,
  });

  // Load MCQ data
  const mcqsPath = path.join(process.cwd(), "mcqs_data", "gk", "gk_mcqs.json");
  const mcqs = JSON.parse(fs.readFileSync(mcqsPath, "utf8"));

  for (const compositionId of compositionIds) {
    console.log(`\nRendering ${compositionId}...`);
    
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
    });

    const outputLocation = path.join(
      process.cwd(),
      "output",
      `${compositionId}.mp4`
    );

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation,
    });

    console.log(`✓ Rendered ${compositionId} to ${outputLocation}`);
    
    // Create JSON file with MCQ data for this video
    const quizNumber = parseInt(compositionId.match(/Quiz(\d+)/)[1]) - 1;
    const mcq = mcqs[quizNumber];
    const jsonLocation = path.join(process.cwd(), "output", `${compositionId}.json`);
    fs.writeFileSync(jsonLocation, JSON.stringify(mcq, null, 2));
    console.log(`✓ Created ${compositionId}.json with MCQ data`);
  }

  console.log("\n✓ All videos rendered successfully!");
};

start();
