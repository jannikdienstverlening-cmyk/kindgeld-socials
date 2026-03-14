import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOPICS = [
  {
    type: "tip",
    prompt:
      "Geef een praktische tip voor ouders over zakgeld geven aan kinderen. Denk aan leeftijd, bedragen, of hoe je kinderen leert omgaan met geld.",
  },
  {
    type: "feature",
    prompt:
      "Leg een handige feature van kindgeld.nl uit. kindgeld.nl is een app waarmee ouders digitaal zakgeld kunnen beheren, spaar­doelen instellen en kinderen leren omgaan met geld. Beschrijf één concrete functionaliteit.",
  },
  {
    type: "quote",
    prompt:
      "Verzin een inspirerende of wijze quote over geld en kinderen, of over financiële opvoeding. Maak het warm en toegankelijk.",
  },
  {
    type: "statistiek",
    prompt:
      "Geef een interessante statistiek of feit over kinderen en spaargeld, zakgeld of financiële opvoeding in Nederland. Maak het concreet en herkenbaar.",
  },
];

const PLATFORM_INSTRUCTIONS = {
  instagram: `
    Schrijf een Instagram post (max 200 woorden).
    - Gebruik 3-5 relevante emoji's verspreid door de tekst
    - Eindig met 5-8 relevante hashtags zoals #kindgeld #zakgeld #financiëleopvoeding #ouders #kinderen #spaargeld
    - Persoonlijk en luchtig van toon
    - Eerste zin is een pakkende opener
  `,
  facebook: `
    Schrijf een Facebook post (max 300 woorden).
    - Persoonlijke, warme toon alsof je een vriend adviseert
    - Begin met een herkenbare situatie of vraag
    - Gebruik 1-2 emoji's, niet overdreven
    - Eindig met een call-to-action of vraag aan de lezer
    - Geen hashtags nodig
  `,
  linkedin: `
    Schrijf een LinkedIn post (max 300 woorden).
    - Professionele maar toegankelijke toon, gericht op ouders
    - Begin met een inzicht of stelling
    - Gebruik alinea's voor leesbaarheid
    - 1 emoji maximaal
    - Eindig met een call-to-action richting kindgeld.nl
    - Maximaal 3 hashtags: #financiëleopvoeding #kindgeld #ouders
  `,
};

async function generatePostContent(topic, platform) {
  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Je schrijft sociale media content voor kindgeld.nl, een app voor digitaal zakgeld en financiële opvoeding.

Onderwerp: ${topic.prompt}

Platform instructies:
${PLATFORM_INSTRUCTIONS[platform]}

Schrijf alleen de post zelf, geen uitleg of extra tekst eromheen.`,
      },
    ],
  });

  return message.content[0].text;
}

function getTopicsForWeek() {
  // Cyclisch door topics: maandag=tip, woensdag=feature/quote/statistiek, vrijdag=quote/statistiek
  const now = new Date();
  const weekNumber = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));

  return [
    TOPICS[0], // Maandag: altijd tip
    TOPICS[1 + (weekNumber % 3)], // Woensdag: roterend feature/quote/statistiek
    TOPICS[2 + (weekNumber % 2)], // Vrijdag: roterend quote/statistiek
  ];
}

async function generateWeeklyPosts() {
  console.log("Genereren van posts voor deze week...");
  const topics = getTopicsForWeek();
  const days = ["maandag", "woensdag", "vrijdag"];
  const posts = [];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const day = days[i];
    console.log(`\nGenereer post voor ${day} (${topic.type})...`);

    const [instagram, facebook, linkedin] = await Promise.all([
      generatePostContent(topic, "instagram"),
      generatePostContent(topic, "facebook"),
      generatePostContent(topic, "linkedin"),
    ]);

    posts.push({
      day,
      type: topic.type,
      generatedAt: new Date().toISOString(),
      platforms: { instagram, facebook, linkedin },
    });

    console.log(`  ✓ ${day} klaar`);
  }

  return posts;
}

function savePostsToFile(posts) {
  const postsDir = path.join(__dirname, "..", "posts");
  if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const filePath = path.join(postsDir, `week-${dateStr}.json`);

  fs.writeFileSync(filePath, JSON.stringify(posts, null, 2), "utf-8");
  console.log(`\nPosts opgeslagen in: ${filePath}`);
  return filePath;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Fout: ANTHROPIC_API_KEY is niet ingesteld.");
    process.exit(1);
  }

  const posts = await generateWeeklyPosts();
  savePostsToFile(posts);
  console.log("\nKlaar! 3 posts gegenereerd voor Instagram, Facebook en LinkedIn.");
}

main().catch((err) => {
  console.error("Fout bij genereren van posts:", err.message);
  process.exit(1);
});
