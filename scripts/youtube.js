// Minimal YouTube Data API client: swaps the stored refresh token for an access
// token and uploads a video with the resumable protocol. Plain fetch, so the
// project needs no Google SDK.
const fs = require("fs");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

const httpError = (message, status, body) =>
  Object.assign(new Error(`${message} (${status}): ${body}`), { status });

const getAccessToken = async ({ clientId, clientSecret, refreshToken }) => {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw httpError("Could not refresh the YouTube token", res.status, text);
  }
  return JSON.parse(text).access_token;
};

const uploadOnce = async ({ accessToken, video, metadata }) => {
  const session = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(video.length),
      "X-Upload-Content-Type": "video/mp4",
    },
    body: JSON.stringify(metadata),
  });
  if (!session.ok) {
    throw httpError(
      "Could not start the upload",
      session.status,
      await session.text(),
    );
  }
  const location = session.headers.get("location");
  if (!location) {
    throw new Error("YouTube did not return an upload URL");
  }

  const res = await fetch(location, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4" },
    body: video,
  });
  const text = await res.text();
  if (!res.ok) {
    throw httpError("Upload failed", res.status, text);
  }
  return JSON.parse(text);
};

// Retries network errors and 5xx responses; a 4xx (quota, bad metadata) won't
// get better by retrying.
const uploadVideo = async ({ accessToken, filePath, metadata }) => {
  const video = fs.readFileSync(filePath);
  for (let attempt = 1; ; attempt++) {
    try {
      return await uploadOnce({ accessToken, video, metadata });
    } catch (err) {
      const retryable = err.status === undefined || err.status >= 500;
      if (!retryable || attempt === 3) {
        throw err;
      }
      console.warn(`Upload attempt ${attempt} failed, retrying: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
    }
  }
};

module.exports = { getAccessToken, uploadVideo };
