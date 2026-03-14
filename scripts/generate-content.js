import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateImagesForPost } from "./generate-images.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "posts");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOPICS = [
  {
    type: "tip",
    title: "Tip voor ouders over zakgeld",
    prompt: "Geef een concrete, praktische tip voor ouders over zakgeld geven aan kinderen. Denk aan leeftijdsgeschikte bedragen, regelmaat of hoe je kinderen leert omgaan met geld.",
  },
  {
    type: "statistiek",
    title: "Statistiek over kinderen en geld",
    prompt: "Noem een interessante statistiek of feit over kinderen en spaargeld of zakgeld in Nederland (bijv. van Nibud). Maak het concreet en herkenbaar voor ouders.",
  },
  {
    type: "feature",
    title: "Feature uitleg kindgeld.nl",
    prompt: "Leg één specifieke functionaliteit van de kindgeld.nl app uit: digitaal zakgeld beheren, spaardoelen instellen, beloningssystemen of inzicht in uitgaven voor kinderen.",
  },
  {
    type: "quote",
    title: "Inspirerende quote over geld en kinderen",
    prompt: "Verzin een inspirerende, warme quote over financiële opvoeding of geld leren aan kinderen. Maak het persoonlijk en toegankelijk.",
  },
  {
    type: "tip",
    title: "Spaardoel inspiratie",
    prompt: "Geef inspiratie voor een spaardoel dat kinderen kunnen stellen via de kindgeld.nl app. Denk aan een speelgoed, uitje of cadeautje en hoe je dit koppelt aan spaargedrag.",
  },
  {
    type: "tip",
    title: "Beloningentip voor ouders",
    prompt: "Geef een tip over hoe ouders een beloningssysteem kunnen opzetten voor hun kinderen via kindgeld.nl. Koppel goed gedrag of klusjes aan extra zakgeld.",
  },
];

const PLATFORM_PROMPTS = {
  instagram: `
Schrijf een Instagram caption (max 150 woorden):
- Persoonlijk en direct aanspreken ("Jij als ouder...")
- 3-5 emoji's verspreid door de tekst
- Afsluitende call-to-action: "Link in bio 👆"
- Eindig met 10-15 hashtags op nieuwe regel:
  #zakgeld #kinderen #spaardoel #ouders #financiëleopvoeding
  #kindgeldnl #geldlessen #opvoeden #spaargeld #kindgeld
  #geldenkinderen #ouderschap #kindvriendelijk #sparendoejezo #budgetieren
Schrijf ALLEEN de caption, niets anders.`,

  facebook: `
Schrijf een Facebook post (max 250 woorden):
- Warme, persoonlijke toon als een vriend
- Begin met een herkenbare situatie voor ouders
- 1-2 emoji's, subtiel
- Midden: concrete informatie of tip
- Sluit af met vraag aan de lezer OF link naar kindgeld.nl
- Geen hashtags
Schrijf ALLEEN de post tekst, niets anders.`,

  tiktok: `
Schrijf een TikTok video script (30-60 seconden):
- Eerste zin = sterke hook die stopt met scrollen
- Spreek direct en energiek ("Wist je dat...")
- Korte zinnen, maximaal spreektaal
- Structuur: Hook → Probleem → Oplossing → CTA
- CTA: "Volg ons voor meer tips! Link in bio."
- Trending hashtags: #kindgeld #zakgeld #oudertips #financiëleopvoeding #tiktokouders #fintok
Schrijf het script met duidelijke labels: [HOOK] [INHOUD] [CTA]`,

  pinterest: `
Schrijf een Pinterest pin beschrijving (max 200 woorden):
- SEO-vriendelijk: gebruik zoekwoorden zoals "zakgeld tips", "kinderen leren sparen", "financiële opvoeding"
- Beschrijvend en informatief
- Noem kindgeld.nl als bron/app
- Eindig met: "Ontdek meer op kindgeld.nl"
- Geen emoji's
- 3-5 hashtags: #zakgeld #kindgeld #financiëleopvoeding #spaartips #ouders
Schrijf ALLEEN de beschrijving, niets anders.`,
};

// 5 posts per maand = 20 platform-posts (5 × 4 platforms) = gratis limiet vol
function getTopicsForMonth() {
  const monthNumber = new Date().getMonth() + new Date().getFullYear() * 12;
  return [
    TOPICS[monthNumber % TOPICS.length],
    TOPICS[(monthNumber + 1) % TOPICS.length],
    TOPICS[(monthNumber + 2) % TOPICS.length],
    TOPICS[(monthNumber + 3) % TOPICS.length],
    TOPICS[(monthNumber + 4) % TOPICS.length],
  ];
}

async function generatePlatformContent(topic, platform) {
  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Je maakt sociale media content voor kindgeld.nl — een app voor digitaal zakgeld en financiële opvoeding van kinderen.

Onderwerp: ${topic.prompt}

${PLATFORM_PROMPTS[platform]}`,
      },
    ],
  });
  return message.content[0].text.trim();
}

async function generateImageTitle(topic) {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `Maak een korte, krachtige zin (max 8 woorden) voor op een sociale media afbeelding over dit onderwerp: "${topic.prompt}". Alleen de zin, niets anders.`,
      },
    ],
  });
  return message.content[0].text.trim().replace(/["']/g, "");
}

async function generateMonthlyContent() {
  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });

  // 5 posts verspreid over de maand: wo1, vr1, ma2, wo2, vr3
  const topics = getTopicsForMonth();
  const days = ["woensdag week 1", "vrijdag week 1", "maandag week 2", "woensdag week 2", "vrijdag week 3"];
  const times = ["12:00", "17:00", "08:00", "12:00", "17:00"];
  const results = [];

  console.log(`Genereren van 5 posts voor deze maand (= 20 Ayrshare credits)...\n`);

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const day = days[i];
    const time = times[i];

    console.log(`[${i + 1}/${topics.length}] ${day} ${time} — ${topic.title}`);

    // Genereer alle platform teksten parallel
    const [instagram, facebook, tiktok, pinterest, imageTitle] = await Promise.all([
      generatePlatformContent(topic, "instagram"),
      generatePlatformContent(topic, "facebook"),
      generatePlatformContent(topic, "tiktok"),
      generatePlatformContent(topic, "pinterest"),
      generateImageTitle(topic),
    ]);

    // Genereer afbeeldingen
    const slug = `${day}-${topic.type}-${Date.now()}`;
    console.log(`  Afbeeldingen genereren...`);
    const imagePaths = await generateImagesForPost({
      slug,
      postType: topic.type,
      title: imageTitle,
      subtitle: "kindgeld.nl",
    });

    results.push({
      day,
      time,
      type: topic.type,
      title: topic.title,
      slug,
      generatedAt: new Date().toISOString(),
      imagePaths,
      platforms: { instagram, facebook, tiktok, pinterest },
    });

    console.log(`  ✓ Klaar\n`);
  }

  // Opslaan als JSON
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const outPath = path.join(POSTS_DIR, `maand-${monthStr}.json`);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`Posts opgeslagen: ${outPath}`);
  console.log(`\n✓ 5 posts × 4 platforms = 20 Ayrshare credits (gratis limiet vol)`);

  return outPath;
}

// Standalone uitvoer
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Fout: ANTHROPIC_API_KEY is niet ingesteld.");
    process.exit(1);
  }
  generateMonthlyContent()
    .then((file) => console.log(`\nKlaar! Output: ${file}`))
    .catch((err) => { console.error(err.message); process.exit(1); });
}

export { generateMonthlyContent };
