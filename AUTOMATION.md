# Automatic publishing

Five Shorts a day go public on YouTube, three hours apart from 09:00 to 21:00
Pakistan time, so each one gets a few hours to itself before the next. GitHub
Actions keeps the next two days uploaded and scheduled.

The MCQs come from three banks:

- **current**, `mcqs_data/current/current_mcqs.json`. Each run,
  `scripts/current-affairs.js` reads Google Trends and Google News for Pakistan
  and has Gemini research a few safe, factual topics with Google Search, write
  an MCQ for each and fact-check it in a second call. These go in the 15:00 and
  21:00 slots and are dropped if they haven't been posted within a week.
- **knowledge**, `mcqs_data/knowledge/knowledge_mcqs.json`: everyday things
  people look up, such as rice types, crops, solar power, money and documents.
- **gk**, `mcqs_data/gk/gk_mcqs.json`: the reviewed one-paper General Knowledge
  bank, with curiosity topics first because they draw far more views.

Each slot takes the next MCQ from the first of its banks that has one left. For
each empty slot, a run:

1. picks that MCQ. Only reviewed MCQs are used: their answer was checked and an
   `explanation` written. Ones flagged with `skip` (wrong, ambiguous or out of
   date) are never posted,
2. renders it with the exam-paper design, with its category as the subject,
3. writes the title, description and tags from the question (`scripts/seo.js`),
4. uploads it to YouTube as private, scheduled to go public at the slot's time,
5. records it in `mcqs_data/published.json`, so nothing is posted twice.

YouTube publishes at the exact minute. GitHub often starts scheduled runs hours
late, but that only changes when a video is uploaded, not when it appears.

Each run also:

- **Files every Short into a playlist** named after its category, such as
  "Agriculture MCQs" or "Current Affairs MCQs". It creates a playlist the
  first time a category appears and remembers it in `mcqs_data/playlists.json`.
- **Records each recent Short's views** in `published.json`, and logs the
  average views per category so you can see which topics work.

Both need the sign-in from step 2 below, with its "Manage your YouTube account"
permission. An older upload-only sign-in still publishes, but these two steps
are skipped until you sign in again.

## One-time setup (about 10 minutes)

YouTube only accepts uploads that the channel owner has approved once. After
that, everything runs on its own.

1. **Google Cloud Console** (console.cloud.google.com), in the project that has
   your OAuth client:
   - *APIs & Services → Library*: make sure **YouTube Data API v3** is enabled.
   - *OAuth consent screen* (newer consoles: *Google Auth Platform → Audience*):
     set the publishing status to **In production**. In "Testing", Google
     expires the sign-in after 7 days and uploads stop.
   - *Credentials*: download the JSON of your **Desktop app** OAuth client, or
     create one (*Create credentials → OAuth client ID → Desktop app*).
2. **On your computer**, in this repo:
   ```
   npm ci
   npm run youtube:auth -- path/to/client_secret.json
   ```
   Sign in with the Google account that owns the channel. Google warns that the
   app isn't verified: choose *Advanced → Go to …*. The terminal then prints
   three values.
3. **GitHub**: repo → *Settings → Secrets and variables → Actions → New
   repository secret*. Add `YT_CLIENT_ID`, `YT_CLIENT_SECRET` and
   `YT_REFRESH_TOKEN` with those values.

To check it straight away: *Actions → Publish Shorts → Run workflow*.

## Changing things

- **Times, Shorts per day, and which bank each slot uses**: `SLOTS_PKT` in
  `scripts/publish.js`, with one entry per Short. The `cron` lines only decide
  when uploads happen.
- **Current affairs** need the `GEMINI_API_KEY` repository secret, a free key
  from https://aistudio.google.com/app/apikey. Without it, those slots fall
  back to the other banks.
- **Title, description, tags**: `scripts/seo.js`.
- **Try it without uploading**: `npm run shorts:publish -- --dry-run`.

## When a run fails

GitHub emails you. The usual causes:

- `invalid_grant`: the sign-in expired or was revoked. Redo step 2 and update
  `YT_REFRESH_TOKEN`.
- `quotaExceeded` or `uploadLimitExceeded`: YouTube's daily limit. The next run
  carries on.
