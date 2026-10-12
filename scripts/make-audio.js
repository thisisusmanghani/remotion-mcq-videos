// Generates the video's soundtrack from scratch, so it's original and can't
// get a YouTube copyright claim:
//   public/audio/countdown.wav  10 s: stopwatch ticks over a marimba pattern
//   public/audio/reveal.wav      5 s: bell chime and a resolving outro
//
//   node scripts/make-audio.js
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, "..", "public", "audio");

const midiToHz = (note) => 440 * 2 ** ((note - 69) / 12);

// Deterministic noise, so every run produces the same files.
let seed = 12345;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 2147483648 - 1;
};

const marimba = (hz) => (t) =>
  (1 - Math.exp(-t * 800)) *
  (Math.sin(2 * Math.PI * hz * t) * Math.exp(-t * 5) +
    0.25 * Math.sin(2 * Math.PI * hz * 3.93 * t) * Math.exp(-t * 18) +
    0.06 * Math.sin(2 * Math.PI * hz * 9.2 * t) * Math.exp(-t * 40));

const bass = (hz) => (t) =>
  (1 - Math.exp(-t * 200)) *
  Math.sin(2 * Math.PI * hz * t) *
  Math.exp(-t * 1.8);

// Inharmonic partials give a bell rather than a beep.
const bell = (hz) => (t) =>
  (1 - Math.exp(-t * 1500)) *
  [1, 2, 2.76, 5.4].reduce(
    (sum, partial, i) =>
      sum +
      [1, 0.4, 0.3, 0.12][i] *
        Math.sin(2 * Math.PI * hz * partial * t) *
        Math.exp(-t * (2.5 + i * 2)),
    0,
  );

// Low-passed noise sounds like a wooden click and avoids the inter-sample
// peaks that raw white noise causes after YouTube re-encodes the audio.
const tick = (hz) => {
  let smoothed = 0;
  return (t) => {
    smoothed += 0.3 * (noise() - smoothed);
    return (
      Math.exp(-t * 300) *
      (0.55 * Math.sin(2 * Math.PI * hz * t) + 0.8 * smoothed)
    );
  };
};

// Each event is [start seconds, length seconds, gain, voice].
const render = (seconds, events, peak) => {
  const out = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  for (const [start, length, gain, voice] of events) {
    const from = Math.round(start * SAMPLE_RATE);
    const to = Math.min(out.length, from + Math.round(length * SAMPLE_RATE));
    for (let i = from; i < to; i++) {
      out[i] += gain * voice((i - from) / SAMPLE_RATE);
    }
  }
  // Short fade at the very end so the loop back to the start doesn't click.
  const fade = Math.round(0.03 * SAMPLE_RATE);
  for (let i = 0; i < fade; i++) {
    out[out.length - 1 - i] *= i / fade;
  }
  // Gentle soft-clip raises loudness towards YouTube's -14 LUFS without
  // harsh distortion.
  const max = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const drive = 2;
  return out.map(
    (v) => (Math.tanh((drive * v) / max) / Math.tanh(drive)) * peak,
  );
};

const writeWav = (file, samples) => {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) =>
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2),
  );
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM header size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
};

// Countdown: C, Am, F, G, G7, two seconds each, in eighth notes.
const CHORDS = [
  [60, 64, 67, 72],
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [55, 59, 62, 67],
  [55, 59, 62, 65],
];
const PATTERN = [0, 1, 2, 3, 2, 1, 0, 1];
const countdown = [];
CHORDS.forEach((chord, c) => {
  countdown.push([c * 2, 2, 0.42, bass(midiToHz(chord[0] - 12))]);
  PATTERN.forEach((n, i) => {
    countdown.push([c * 2 + i * 0.25, 1.2, 0.26, marimba(midiToHz(chord[n]))]);
  });
});
for (let s = 0; s < 10; s++) {
  countdown.push([s, 0.06, 1.6, tick(s % 2 === 0 ? 3200 : 2400)]);
  // The last three seconds tick twice as fast.
  if (s >= 7) {
    countdown.push([s + 0.5, 0.06, 1.3, tick(2800)]);
  }
}

// Reveal: a bell arpeggio, a C major roll, then a fading C major motif that
// leads back into the countdown's opening chord when the Short loops.
const reveal = [
  [0, 3, 0.5, bell(midiToHz(84))],
  [0.07, 3, 0.4, bell(midiToHz(88))],
  [0.14, 3, 0.35, bell(midiToHz(91))],
  [0.35, 3, 0.5, bass(midiToHz(36))],
  ...[60, 64, 67, 72].map((n, i) => [
    0.35 + i * 0.07,
    2,
    0.35,
    marimba(midiToHz(n)),
  ]),
  ...[72, 76, 79, 76, 79, 84].map((n, i) => [
    1.5 + i * 0.5,
    1.5,
    0.3 * (1 - i * 0.13),
    marimba(midiToHz(n)),
  ]),
];

fs.mkdirSync(OUT_DIR, { recursive: true });
writeWav(path.join(OUT_DIR, "countdown.wav"), render(10, countdown, 0.89));
writeWav(path.join(OUT_DIR, "reveal.wav"), render(5, reveal, 0.89));
