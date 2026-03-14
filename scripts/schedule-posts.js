import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BUFFER_API_BASE = "https://api.bufferapp.com/1";

// Postschema: maandag 08:00, woensdag 12:00, vrijdag 17:00
const SCHEDULE = [
  { day: "maandag", dayOfWeek: 1, hour: 8, minute: 0 },
  { day: "woensdag", dayOfWeek: 3, hour: 12, minute: 0 },
  { day: "vrijdag", dayOfWeek: 5, hour: 17, minute: 0 },
];

function getNextOccurrence(dayOfWeek, hour, minute) {
  const now = new Date();
  const result = new Date(now);
  result.setHours(hour, minute, 0, 0);

  const currentDay = now.getDay(); // 0=zondag, 1=maandag, ...
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil < 0 || (daysUntil === 0 && result <= now)) {
    daysUntil += 7;
  }

  result.setDate(result.getDate() + daysUntil);
  return Math.floor(result.getTime() / 1000); // Unix timestamp
}

async function scheduleToBuffer(profileId, text, scheduledAt) {
  const params = new URLSearchParams({
    access_token: process.env.BUFFER_API_KEY,
    profile_ids: profileId,
    text,
    scheduled_at: scheduledAt,
    shorten: "false",
  });

  const response = await fetch(`${BUFFER_API_BASE}/updates/create.json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Buffer API fout (${response.status}): ${error}`);
  }

  return response.json();
}

function getLatestPostsFile() {
  const postsDir = path.join(__dirname, "..", "posts");

  if (!fs.existsSync(postsDir)) {
    throw new Error("Posts map niet gevonden. Draai eerst generate-posts.js.");
  }

  const files = fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error("Geen posts gevonden. Draai eerst generate-posts.js.");
  }

  return path.join(postsDir, files[0]);
}

async function main() {
  const required = [
    "BUFFER_API_KEY",
    "BUFFER_PROFILE_IDS_INSTAGRAM",
    "BUFFER_PROFILE_IDS_FACEBOOK",
    "BUFFER_PROFILE_IDS_LINKEDIN",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Fout: ${key} is niet ingesteld.`);
      process.exit(1);
    }
  }

  const profileIds = {
    instagram: process.env.BUFFER_PROFILE_IDS_INSTAGRAM,
    facebook: process.env.BUFFER_PROFILE_IDS_FACEBOOK,
    linkedin: process.env.BUFFER_PROFILE_IDS_LINKEDIN,
  };

  const postsFile = getLatestPostsFile();
  console.log(`Posts inlezen uit: ${postsFile}`);
  const posts = JSON.parse(fs.readFileSync(postsFile, "utf-8"));

  console.log(`\n${posts.length} posts gevonden. Inplannen via Buffer...\n`);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const schedule = SCHEDULE[i];

    if (!schedule) {
      console.warn(`Geen schema voor post index ${i}, overgeslagen.`);
      continue;
    }

    const scheduledAt = getNextOccurrence(
      schedule.dayOfWeek,
      schedule.hour,
      schedule.minute
    );
    const scheduledDate = new Date(scheduledAt * 1000).toLocaleString("nl-NL");

    console.log(`Inplannen: ${schedule.day} ${schedule.hour}:${String(schedule.minute).padStart(2, "0")} (${scheduledDate})`);

    for (const [platform, profileId] of Object.entries(profileIds)) {
      const text = post.platforms[platform];

      if (!text) {
        console.warn(`  Geen tekst voor ${platform}, overgeslagen.`);
        continue;
      }

      try {
        const result = await scheduleToBuffer(profileId, text, scheduledAt);
        console.log(`  ✓ ${platform} ingepland (ID: ${result.updates?.[0]?.id ?? "onbekend"})`);
      } catch (err) {
        console.error(`  ✗ ${platform} mislukt: ${err.message}`);
      }
    }
  }

  console.log("\nKlaar! Alle posts zijn ingepland in Buffer.");
}

main().catch((err) => {
  console.error("Fout bij inplannen:", err.message);
  process.exit(1);
});
