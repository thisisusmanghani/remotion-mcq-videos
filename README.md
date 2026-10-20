# Let’s Achieve: MCQ Shorts

Turns General Knowledge MCQs into YouTube Shorts styled as a printed exam
paper, and publishes five a day to the
[Let’s Achieve](https://www.youtube.com/channel/UC7JqrO3uDX2UONUF0J81lhw)
channel with GitHub Actions. Built with [Remotion](https://www.remotion.dev).

- `mcqs_data/gk/gk_mcqs.json`: the questions (scraped with `scraper.py`)
- `mcqs_data/published.json`: what has been posted so far
- `src/`: the video (`Composition.tsx`) and text fitting (`quiz-text.ts`)
- `scripts/`: publishing (`publish.js`), SEO metadata (`seo.js`), the
  YouTube upload client and one-time sign-in, and the soundtrack generator
- `public/`: fonts, logos, paper texture and generated audio

How the automation works and how to set it up: [AUTOMATION.md](AUTOMATION.md).

## Commands

```console
npm ci                                   # install
npm run dev                              # preview the video in Remotion Studio
npm run shorts:publish -- --dry-run      # render the next Short without uploading
npm run make:audio                       # regenerate the soundtrack
npm run lint                             # lint and type-check
```
