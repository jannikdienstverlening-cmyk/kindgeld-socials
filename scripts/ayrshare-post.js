import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "posts");

const AYRSHARE_API = "https://app.ayrshare.com/api";
const PLATFORMS = ["instagram", "facebook", "tiktok", "pinterest"];

// Gratis plan: geen media upload → gebruik raw GitHub URLs (repo is publiek)
const GITHUB_RAW = "https://raw.githubusercontent.com/jannikdienstverlening-cmyk/kindgeld-socials/main/images/generated";

function getGithubImageUrl(slug, platform) {
  return `${GITHUB_RAW}/${slug}-${platform}.png`;
}

// 5 posts verspreid over de maand = 20 Ayrshare credits (gratis limiet)
// Elke post gaat naar 4 platforms: 5 × 4 = 20
// Schema: wo wk1 12:00 | vr wk1 17:00 | ma wk2 08:00 | wo wk2 12:00 | vr wk3 17:00
const MONTHLY_SCHEDULE = [
  { weekOffset: 0, dayOfWeek: 3, hour: 12, minute: 0 },  // woensdag week 1
  { weekOffset: 0, dayOfWeek: 5, hour: 17, minute: 0 },  // vrijdag week 1
  { weekOffset: 1, dayOfWeek: 1, hour: 8,  minute: 0 },  // maandag week 2
  { weekOffset: 1, dayOfWeek: 3, hour: 12, minute: 0 },  // woensdag week 2
  { weekOffset: 2, dayOfWeek: 5, hour: 17, minute: 0 },  // vrijdag week 3
];

function getScheduleDate(weekOffset, dayOfWeek, hour, minute) {
  // Start vanaf de eerstvolgende maandag na vandaag
  const now = new Date();
  const monday = new Date(now);
  const daysToMonday = (8 - now.getDay()) % 7 || 7;
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);

  // Bereken doel: maandag + weekOffset weken + offset naar gewenste dag
  const target = new Date(monday);
  target.setDate(monday.getDate() + weekOffset * 7 + (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  target.setHours(hour, minute, 0, 0);

  return target.toISOString();
}

async function uploadMedia(imagePath) {
  if (!imagePath || !fs.existsSync(imagePath)) return null;

  // Gratis plan ondersteunt geen media upload — gebruik GitHub raw URL
  return getGithubImageUrl(path.basename(imagePath, ".png").replace(/-instagram$|-facebook$|-tiktok$|-pinterest$/, ""), "instagram");
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
  console.log(`💡 Gratis limiet: 5 posts × 4 platforms = 20 credits/maand\n`);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const schedule = MONTHLY_SCHEDULE[i];
    if (!schedule) continue;

    const scheduleDate = getScheduleDate(schedule.weekOffset, schedule.dayOfWeek, schedule.hour, schedule.minute);
    const dateLabel = new Date(scheduleDate).toLocaleString("nl-NL", {
      weekday: "long", day: "numeric", month: "long",
      hour: "2-digit", minute: "2-digit",
    });

    console.log(`📅 ${dateLabel} — ${post.title}`);

    // Gebruik GitHub raw URLs per platform (gratis plan workaround)
    for (const platform of PLATFORMS) {
      const text = post.platforms[platform];
      if (!text) continue;

      const platformMediaUrl = getGithubImageUrl(post.slug, platform);

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
