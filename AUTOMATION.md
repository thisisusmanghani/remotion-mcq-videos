# Automatic publishing

Three Shorts a day go public on YouTube at 10:00, 15:00 and 20:00 Pakistan
time, so each one gets a few hours to itself before the next. GitHub Actions
keeps the next two days uploaded and scheduled. For each empty slot, a run:

1. picks the next MCQ from `mcqs_data/gk/gk_mcqs.json` that hasn't been posted
   (in a fixed shuffled order, so topics stay mixed). Only reviewed MCQs are
   used: their answer was checked and an `explanation` written; ones flagged
   with `skip` (wrong, ambiguous or out of date) are never posted,
2. renders it with the exam-paper design,
3. writes the title, description and tags from the question (`scripts/seo.js`),
4. uploads it to YouTube as private, scheduled to go public at the slot's time,
5. records it in `mcqs_data/published.json`, so nothing is posted twice.

YouTube publishes at the exact minute. GitHub often starts scheduled runs hours
late, but that only changes when a video is uploaded, not when it appears.

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

- **Times and Shorts per day**: `SLOTS_PKT` in `scripts/publish.js`; one entry
  per Short. The `cron` lines only decide when uploads happen.
- **Title, description, tags**: `scripts/seo.js`.
- **Try it without uploading**: `npm run shorts:publish -- --dry-run`.

## When a run fails

GitHub emails you. The usual causes:

- `invalid_grant`: the sign-in expired or was revoked. Redo step 2 and update
  `YT_REFRESH_TOKEN`.
- `quotaExceeded` or `uploadLimitExceeded`: YouTube's daily limit. The next run
  carries on.
