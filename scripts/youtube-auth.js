// One-time setup: lets this project upload to your YouTube channel, file the
// Shorts into playlists and read their view counts, and prints the three
// values to save as GitHub secrets.
//
//   npm run youtube:auth -- path/to/client_secret.json [--no-browser]
//
// The JSON is a "Desktop app" OAuth client from Google Cloud Console.
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const { spawn } = require("child_process");

// Upload alone can't manage playlists or read statistics; "youtube" can.
const SCOPE = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
].join(" ");

const secretPath = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!secretPath) {
  console.error("usage: npm run youtube:auth -- path/to/client_secret.json");
  process.exit(1);
}
const secret = JSON.parse(fs.readFileSync(secretPath, "utf8"));
const { client_id: clientId, client_secret: clientSecret } =
  secret.installed ?? secret.web ?? {};
if (!clientId || !clientSecret) {
  console.error(
    "That file has no OAuth client ID/secret. Download a 'Desktop app' OAuth client JSON from Google Cloud Console.",
  );
  process.exit(1);
}

// PKCE and state, as Google recommends for installed apps.
const verifier = crypto.randomBytes(32).toString("base64url");
const challenge = crypto
  .createHash("sha256")
  .update(verifier)
  .digest("base64url");
const state = crypto.randomBytes(16).toString("hex");
let redirectUri;

const openBrowser = (url) => {
  const command =
    process.platform === "win32"
      ? "explorer.exe"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";
  spawn(command, [url], { detached: true, stdio: "ignore" })
    .on("error", () => {})
    .unref();
};

const exchangeCode = async (code) => {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  const tokens = await res.json();
  if (!res.ok || !tokens.refresh_token) {
    throw new Error(
      `Google did not return a refresh token: ${JSON.stringify(tokens)}`,
    );
  }
  return tokens;
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== "/") {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get("code");
  if (url.searchParams.get("state") !== state || !code) {
    res.writeHead(400).end(`Sign-in failed: ${url.searchParams.get("error")}`);
    return;
  }
  try {
    const tokens = await exchangeCode(code);
    res.end("Done. You can close this tab and go back to the terminal.");
    console.log(`
Add these three repository secrets on GitHub
(repo > Settings > Secrets and variables > Actions > New repository secret):

  YT_CLIENT_ID       ${clientId}
  YT_CLIENT_SECRET   ${clientSecret}
  YT_REFRESH_TOKEN   ${tokens.refresh_token}

Keep the refresh token private: it can manage your channel.`);
    // Google only sends this for sign-ins that expire, e.g. apps in "Testing".
    if (tokens.refresh_token_expires_in) {
      const days = Math.round(tokens.refresh_token_expires_in / 86400);
      console.warn(`
WARNING: this sign-in expires in ${days} day(s), so uploads would stop then.
The app is probably still in "Testing": publish it (Google Auth Platform >
Audience > Publish app), then run this command again.`);
    }
  } catch (err) {
    res.end("Something went wrong; see the terminal.");
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.listen(0, "127.0.0.1", () => {
  redirectUri = `http://127.0.0.1:${server.address().port}`;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(
    {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
    },
  )}`;
  console.log(
    `Sign in with the Google account that owns your YouTube channel:\n${authUrl}\n`,
  );
  if (!process.argv.includes("--no-browser")) {
    openBrowser(authUrl);
  }
});
