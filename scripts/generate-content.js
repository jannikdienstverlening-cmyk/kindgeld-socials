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
    title: "Zakgeld tip voor ouders",
    prompt: "Geef een concrete, praktische tip voor ouders over zakgeld geven aan kinderen. Denk aan leeftijdsgeschikte bedragen, regelmaat of hoe je kinderen leert budgetteren.",
    imageSubtitle: "Praktische tip van kindgeld.nl",
  },
  {
    type: "statistiek",
    title: "Statistiek: kinderen en geld",
    prompt: "Noem één schokkende of verrassende statistiek over kinderen en spaargeld/zakgeld in Nederland. Maak het concreet met een percentage of getal (bijv. '69% van kinderen...'). Bron: Nibud of vergelijkbaar.",
    imageSubtitle: "Bron: Nibud 2024",
  },
  {
    type: "feature",
    title: "Ontdek kindgeld.nl",
    prompt: "Leg één handige functionaliteit van de kindgeld.nl app enthousiast uit: digitaal zakgeld beheren, spaardoelen instellen, beloningssystemen of uitgavenoverzicht voor kinderen.",
    imageSubtitle: "Probeer gratis op kindgeld.nl",
  },
  {
    type: "quote",
    title: "Inspirerende quote",
    prompt: "Verzin een korte, krachtige quote (1-2 zinnen) over financiële opvoeding of kinderen leren sparen. Schrijf de quote zonder aanhalingstekens. Maak het warm, wijze en herkenbaar voor ouders.",
    imageSubtitle: "kindgeld.nl",
  },
  {
    type: "tip",
    title: "Spaardoel voor je kind",
    prompt: "Geef inspiratie voor een leuk, concreet spaardoel dat kinderen kunnen stellen in de kindgeld.nl app. Koppel het aan iets tastbaars (speelgoed, uitje) en leg uit hoe je als ouder dit stimuleert.",
    imageSubtitle: "Spaardoelen via kindgeld.nl",
  },
  {
    type: "tip",
    title: "Beloningssysteem tip",
    prompt: "Geef een praktische tip voor ouders over het opzetten van een beloningssysteem met zakgeld via kindgeld.nl. Koppel klusjes of goed gedrag aan extra zakgeld op een motiverende manier.",
    imageSubtitle: "Beloningen met kindgeld.nl",
  },
];

const PLATFORM_PROMPTS = {
  instagram: `
Schrijf een Instagram caption voor kindgeld.nl.

REGELS:
- Eerste zin stopt met scrollen: begin met een verrassing, vraag of stelling (bijv. "Dit wist je nog niet over zakgeld 👇" of "Wacht — doe jij dit al? 👀")
- Maximaal 5 korte regels tekst
- 1 emoji per regel, verspreid
- Afsluiten met: "👉 kindgeld.nl"
- Nieuwe regel, dan precies deze hashtags:
  #zakgeld #kindgeldnl #financiëleopvoeding #spaardoel #ouders #kinderen #sparen #geldenkinderen #zakgeldapp #spaartips

Schrijf ALLEEN de caption. Geen uitleg.`,

  facebook: `
Schrijf een Facebook post voor kindgeld.nl.

REGELS:
- Open met: "Als ouder ken je dit..." of vergelijkbare herkenbare situatie
- Kort verhaal of situatie in 3-4 zinnen
- Concrete tip of informatie in het midden
- Sluit af met een vraag die reacties uitlokt (bijv. "Hoeveel zakgeld geef jij per week?")
- Laatste zin: "👉 Ontdek meer op kindgeld.nl"
- Geen hashtags
- Max 200 woorden

Schrijf ALLEEN de post. Geen uitleg.`,

  tiktok: `
Schrijf een TikTok caption + script hint voor kindgeld.nl.

Caption (voor de post):
- 1 krachtige openingszin als hook
- 2-3 korte zinnen over het onderwerp
- CTA: "Volg voor meer tips! 👆"
- Hashtags: #kindgeld #zakgeld #oudertips #financiëleopvoeding #tiktokouders #fintok

Script hint (voor de maker):
[HOOK] Eerste zin die stopt met scrollen
[INHOUD] 2-3 kernpunten, spreektaal, korte zinnen
[CTA] Sluitende call-to-action

Schrijf ALLEEN de caption + script hint.`,

  pinterest: `
Schrijf een Pinterest pin beschrijving voor kindgeld.nl.

REGELS:
- SEO-gericht: gebruik "zakgeld tips", "kinderen leren sparen", "financiële opvoeding", "spaardoel kinderen"
- Informatief en beschrijvend (2-3 zinnen)
- Noem kindgeld.nl expliciet als de oplossing
- Sluit af met: "Ontdek meer tips op kindgeld.nl"
- Geen emoji's
- Hashtags: #zakgeld #kindgeld #financiëleopvoeding #spaartips #ouders

Schrijf ALLEEN de beschrijving.`,
};

function getTopicsForMonth() {
  const monthNumber = new Date().getMonth() + new Date().getFullYear() * 12;
  return Array.from({ length: 5 }, (_, i) => TOPICS[(monthNumber + i) % TOPICS.length]);
}

async function generatePlatformContent(topic, platform) {
  const msg = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `Je schrijft sociale media content voor kindgeld.nl — een app voor digitaal zakgeld en financiële opvoeding.

Onderwerp: ${topic.prompt}

${PLATFORM_PROMPTS[platform]}`,
    }],
  });
  return msg.content[0].text.trim();
}

async function generateImageTitle(topic) {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 80,
    messages: [{
      role: "user",
      content: `Maak een krachtige zin van MAX 7 woorden voor op een sociale media afbeelding. Onderwerp: "${topic.prompt}". Schrijf ALLEEN de zin, geen aanhalingstekens.`,
    }],
  });
  return msg.content[0].text.trim().replace(/["'"""]/g, "");
}

async function generateMonthlyContent() {
  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });

  const topics = getTopicsForMonth();
  // Schema: wo wk1 07:30 | wo wk1 12:00 | vr wk1 19:00 | zo wk2 10:00 | wo wk2 12:00
  const schedule = [
    { day: "maandag week 1",  time: "07:30" },
    { day: "woensdag week 1", time: "12:00" },
    { day: "vrijdag week 1",  time: "19:00" },
    { day: "zondag week 2",   time: "10:00" },
    { day: "woensdag week 2", time: "12:00" },
  ];
  const results = [];

  console.log(`Genereren van 5 posts (= 20 Ayrshare credits — gratis limiet vol)...\n`);

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const { day, time } = schedule[i];

    console.log(`[${i + 1}/5] ${day} ${time} — ${topic.title}`);

    const [instagram, facebook, tiktok, pinterest, imageTitle] = await Promise.all([
      generatePlatformContent(topic, "instagram"),
      generatePlatformContent(topic, "facebook"),
      generatePlatformContent(topic, "tiktok"),
      generatePlatformContent(topic, "pinterest"),
      generateImageTitle(topic),
    ]);

    const slug = `${day.replace(/ /g, "-")}-${topic.type}-${Date.now()}`;
    console.log(`  Afbeeldingen genereren voor: "${imageTitle}"`);
    const imagePaths = await generateImagesForPost({
      slug,
      postType: topic.type,
      title: imageTitle,
      subtitle: topic.imageSubtitle,
    });

    results.push({
      day, time,
      type: topic.type,
      title: topic.title,
      slug,
      generatedAt: new Date().toISOString(),
      imagePaths,
      platforms: { instagram, facebook, tiktok, pinterest },
    });

    console.log(`  ✓ Klaar\n`);
  }

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const outPath = path.join(POSTS_DIR, `maand-${monthStr}.json`);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`✓ Opgeslagen: ${outPath}`);
  console.log(`✓ 5 posts × 4 platforms = 20 Ayrshare credits`);
  return outPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY ontbreekt"); process.exit(1); }
  generateMonthlyContent()
    .then(f => console.log(`\nKlaar: ${f}`))
    .catch(e => { console.error(e.message); process.exit(1); });
}

export { generateMonthlyContent };
