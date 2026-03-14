import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import FormData from "form-data";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "posts");

const BUFFER_API = "https://api.bufferapp.com/1";

// Postschema: dag → dayOfWeek (1=ma, 3=wo, 5=vr, 0=zo), uur, minuut
const SCHEDULE = [
  { day: "maandag", dayOfWeek: 1, hour: 8, minute: 0 },
  { day: "woensdag", dayOfWeek: 3, hour: 12, minute: 0 },
  { day: "vrijdag", dayOfWeek: 5, hour: 17, minute: 0 },
  { day: "zondag", dayOfWeek: 0, hour: 10, minute: 0 },
];

// Platform mapping: sleutel in post → env variabele naam
const PLATFORM_PROFILES = {
  instagram: "BUFFER_INSTAGRAM_ID",
  facebook: "BUFFER_FACEBOOK_ID",
  tiktok: "BUFFER_TIKTOK_ID",
  pinterest: "BUFFER_PINTEREST_ID",
};

// Afbeelding die bij elk platform hoort
const PLATFORM_IMAGE_KEY = {
  instagram: "instagram",
  facebook: "facebook",
  tiktok: "tiktok",
  pinterest: "pinterest",
};

function getNextOccurrence(dayOfWeek, hour, minute) {
  const now = new Date();
  const result = new Date(now);
  result.setHours(hour, minute, 0, 0);

  let daysUntil = dayOfWeek - now.getDay();
  if (daysUntil < 0 || (daysUntil === 0 && result <= now)) daysUntil += 7;
  result.setDate(result.getDate() + daysUntil);

  return Math.floor(result.getTime() / 1000);
}

async function uploadMediaToBuffer(imagePath) {
  if (!imagePath || !fs.existsSync(imagePath)) return null;

  const form = new FormData();
  form.append("access_token", process.env.BUFFER_ACCESS_TOKEN);
  form.append("file", fs.createReadStream(imagePath), {
    filename: path.basename(imagePath),
    contentType: "image/png",
  });

  const res = await fetch(`${BUFFER_API}/media/upload.json`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn(`  ⚠ Media upload mislukt: ${err}`);
    return null;
  }

  const data = await res.json();
  return data.id || null;
}

async function schedulePost({ profileId, text, scheduledAt, imagePath }) {
  const mediaId = await uploadMediaToBuffer(imagePath);

  const body = new URLSearchParams({
    access_token: process.env.BUFFER_ACCESS_TOKEN,
    "profile_ids[]": profileId,
    text,
    scheduled_at: scheduledAt,
    shorten: "false",
  });

  if (mediaId) body.append("media[picture]", mediaId);

  const res = await fetch(`${BUFFER_API}/updates/create.json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Buffer API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.updates?.[0]?.id ?? "onbekend";
}

function getLatestPostsFile() {
  if (!fs.existsSync(POSTS_DIR)) throw new Error("Posts map niet gevonden. Draai eerst generate-content.js.");

  const files = fs.readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  if (!files.length) throw new Error("Geen posts gevonden. Draai eerst generate-content.js.");
  return path.join(POSTS_DIR, files[0]);
}

async function scheduleAllPosts() {
  // Valideer env variabelen
  const missing = ["BUFFER_ACCESS_TOKEN", ...Object.values(PLATFORM_PROFILES)].filter(
    (k) => !process.env[k]
  );
  if (missing.length) {
    console.error(`Ontbrekende omgevingsvariabelen: ${missing.join(", ")}`);
    process.exit(1);
  }

  const postsFile = getLatestPostsFile();
  console.log(`Posts inlezen: ${postsFile}`);
  const posts = JSON.parse(fs.readFileSync(postsFile, "utf-8"));

  console.log(`\n${posts.length} posts gevonden. Inplannen via Buffer...\n`);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const schedule = SCHEDULE[i];
    if (!schedule) continue;

    const scheduledAt = getNextOccurrence(schedule.dayOfWeek, schedule.hour, schedule.minute);
    const scheduledDate = new Date(scheduledAt * 1000).toLocaleString("nl-NL", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });

    console.log(`📅 ${scheduledDate} — ${post.title}`);

    for (const [platform, envKey] of Object.entries(PLATFORM_PROFILES)) {
      const profileId = process.env[envKey];
      const text = post.platforms[platform];
      const imageKey = PLATFORM_IMAGE_KEY[platform];
      const imagePath = post.imagePaths?.[imageKey] ?? null;

      if (!text) {
        console.log(`  ⚠ Geen tekst voor ${platform}, overgeslagen`);
        continue;
      }

      try {
        const updateId = await schedulePost({ profileId, text, scheduledAt, imagePath });
        const hasImage = imagePath && fs.existsSync(imagePath) ? "📷" : "📝";
        console.log(`  ✓ ${platform} ${hasImage} ingepland (ID: ${updateId})`);
      } catch (err) {
        console.error(`  ✗ ${platform} mislukt: ${err.message}`);
      }
    }
    console.log();
  }

  console.log("Klaar! Alle posts zijn ingepland in Buffer.");
}

// Standalone uitvoer
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scheduleAllPosts().catch((err) => {
    console.error("Fout:", err.message);
    process.exit(1);
  });
}

export { scheduleAllPosts };
