import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import FormData from "form-data";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "posts");

const AYRSHARE_API = "https://app.ayrshare.com/api";
const PLATFORMS = ["instagram", "facebook", "tiktok", "pinterest"];

// Postschema: ma 08:00, wo 12:00, vr 17:00, zo 10:00
const SCHEDULE = [
  { day: "maandag",  dayOfWeek: 1, hour: 8,  minute: 0 },
  { day: "woensdag", dayOfWeek: 3, hour: 12, minute: 0 },
  { day: "vrijdag",  dayOfWeek: 5, hour: 17, minute: 0 },
  { day: "zondag",   dayOfWeek: 0, hour: 10, minute: 0 },
];

function getNextOccurrence(dayOfWeek, hour, minute) {
  const now = new Date();
  const result = new Date(now);
  result.setHours(hour, minute, 0, 0);

  let daysUntil = dayOfWeek - now.getDay();
  if (daysUntil < 0 || (daysUntil === 0 && result <= now)) daysUntil += 7;
  result.setDate(result.getDate() + daysUntil);

  return result.toISOString();
}

async function uploadMedia(imagePath) {
  if (!imagePath || !fs.existsSync(imagePath)) return null;

  const form = new FormData();
  form.append("file", fs.createReadStream(imagePath), {
    filename: path.basename(imagePath),
    contentType: "image/png",
  });

  const res = await fetch(`${AYRSHARE_API}/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!res.ok) {
    console.warn(`  ⚠ Media upload mislukt (${res.status}): ${await res.text()}`);
    return null;
  }

  const data = await res.json();
  return data.url ?? null;
}

async function schedulePost({ text, platforms, scheduleDate, mediaUrl }) {
  const body = {
    post: text,
    platforms,
    scheduleDate,
    ...(mediaUrl ? { mediaUrls: [mediaUrl] } : {}),
  };

  const res = await fetch(`${AYRSHARE_API}/post`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Ayrshare API ${res.status}: ${data.message ?? JSON.stringify(data)}`);
  }

  return data.id ?? "onbekend";
}

function getLatestPostsFile() {
  if (!fs.existsSync(POSTS_DIR)) {
    throw new Error("Posts map niet gevonden. Draai eerst generate-content.js.");
  }

  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  if (!files.length) {
    throw new Error("Geen posts gevonden. Draai eerst generate-content.js.");
  }

  return path.join(POSTS_DIR, files[0]);
}

async function scheduleAllPosts() {
  if (!process.env.AYRSHARE_API_KEY) {
    console.error("Fout: AYRSHARE_API_KEY is niet ingesteld.");
    process.exit(1);
  }

  const postsFile = getLatestPostsFile();
  console.log(`Posts inlezen: ${postsFile}\n`);
  const posts = JSON.parse(fs.readFileSync(postsFile, "utf-8"));

  console.log(`${posts.length} posts gevonden. Inplannen via Ayrshare...\n`);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const schedule = SCHEDULE[i];
    if (!schedule) continue;

    const scheduleDate = getNextOccurrence(schedule.dayOfWeek, schedule.hour, schedule.minute);
    const dateLabel = new Date(scheduleDate).toLocaleString("nl-NL", {
      weekday: "long", day: "numeric", month: "long",
      hour: "2-digit", minute: "2-digit",
    });

    console.log(`📅 ${dateLabel} — ${post.title}`);

    // Upload Instagram afbeelding (werkt ook voor Facebook/Pinterest)
    const imagePath = post.imagePaths?.instagram ?? null;
    console.log(`  Afbeelding uploaden...`);
    const mediaUrl = await uploadMedia(imagePath);
    if (mediaUrl) console.log(`  ✓ Afbeelding geupload`);

    // Per platform aparte tekst, maar één API call per platform
    // (Ayrshare accepteert ook één call voor meerdere, maar tekst verschilt per platform)
    for (const platform of PLATFORMS) {
      const text = post.platforms[platform];
      if (!text) continue;

      // TikTok gebruikt eigen thumbnail formaat
      const platformMediaUrl = platform === "tiktok"
        ? (post.imagePaths?.tiktok ? await uploadMedia(post.imagePaths.tiktok) : mediaUrl)
        : platform === "pinterest"
        ? (post.imagePaths?.pinterest ? await uploadMedia(post.imagePaths.pinterest) : mediaUrl)
        : mediaUrl;

      try {
        const postId = await schedulePost({
          text,
          platforms: [platform],
          scheduleDate,
          mediaUrl: platformMediaUrl,
        });
        const hasImg = platformMediaUrl ? "📷" : "📝";
        console.log(`  ✓ ${platform} ${hasImg} ingepland (ID: ${postId})`);
      } catch (err) {
        console.error(`  ✗ ${platform} mislukt: ${err.message}`);
      }
    }
    console.log();
  }

  console.log("Klaar! Alle posts ingepland via Ayrshare.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scheduleAllPosts().catch((err) => {
    console.error("Fout:", err.message);
    process.exit(1);
  });
}

export { scheduleAllPosts };
