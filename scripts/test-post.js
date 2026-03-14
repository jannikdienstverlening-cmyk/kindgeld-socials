import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateImagesForPost } from "./generate-images.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const AYRSHARE_API = "https://app.ayrshare.com/api";

// Gratis plan: geen media upload via API → gebruik raw GitHub URLs (repo is publiek)
const GITHUB_RAW = "https://raw.githubusercontent.com/jannikdienstverlening-cmyk/kindgeld-socials/main/images/generated";

const TEXT = {
  instagram: `🎉 Wij zijn er! kindgeld.nl is nu op Instagram!

Leer je kind omgaan met geld op een slimme, leuke manier. 💚
Met kindgeld.nl geef je digitaal zakgeld, stel je spaardoelen in en beloon je goed gedrag.

Volg ons voor wekelijkse tips over financiële opvoeding! 👇

#kindgeld #zakgeld #ouders #spaardoel #financiëleopvoeding`,

  facebook: `🎉 kindgeld.nl is nu ook op Facebook!

Wij helpen ouders hun kinderen op een slimme manier te leren omgaan met geld. Met de kindgeld.nl app geef je eenvoudig digitaal zakgeld, stel je spaardoelen in en maak je financiële opvoeding leuk én inzichtelijk.

Volg onze pagina voor tips, inspiratie en nieuws over geld en kinderen. We zijn blij dat je erbij bent! 💚

👉 Ontdek meer op kindgeld.nl`,

  tiktok: `[HOOK] kindgeld.nl is nu op TikTok — en we gaan je laten zien hoe je je kind financieel slim opvoedt! 💸

[INHOUD] Wist je dat kinderen die vroeg leren sparen, later veel bewuster met geld omgaan? Met kindgeld.nl geef je digitaal zakgeld, stel je spaardoelen in en beloon je goed gedrag — allemaal vanuit één app.

[CTA] Volg ons voor wekelijkse tips! Link in bio. 👆 #kindgeld #zakgeld #oudertips #financiëleopvoeding #nieuw #launch #tiktokouders #fintok`,

  pinterest: `kindgeld.nl is nu actief op Pinterest! Ontdek tips en inspiratie voor financiële opvoeding van kinderen. Met de kindgeld.nl app leren kinderen sparen, omgaan met zakgeld en stellen ze hun eigen spaardoelen. Ideaal voor ouders die hun kinderen vroeg willen leren omgaan met geld. Volg ons bord voor wekelijkse tips over zakgeld, beloningen en financiële opvoeding. Ontdek meer op kindgeld.nl #zakgeld #kindgeld #financiëleopvoeding #spaartips #ouders`,
};

function getGithubUrl(slug, platform) {
  return `${GITHUB_RAW}/${slug}-${platform}.png`;
}

async function postNow(platform, text, mediaUrl) {
  const body = {
    post: text,
    platforms: [platform],
    ...(mediaUrl ? { mediaUrls: [mediaUrl] } : {}),
  };
  const res = await fetch(`${AYRSHARE_API}/post`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? JSON.stringify(data));
  return data.id ?? "onbekend";
}

async function main() {
  if (!process.env.AYRSHARE_API_KEY) {
    console.error("Fout: AYRSHARE_API_KEY is niet ingesteld.");
    process.exit(1);
  }

  console.log("Testpost: kindgeld.nl launch\n");

  // Genereer afbeelding
  console.log("Afbeelding genereren...");
  const imagePaths = await generateImagesForPost({
    slug: "launch-test",
    postType: "feature",
    title: "Wij zijn er! kindgeld.nl",
    subtitle: "Nieuw op Instagram & socials",
  });
  console.log("✓ Afbeeldingen klaar\n");

  // Gebruik raw GitHub URLs (gratis plan ondersteunt geen media upload)
  const slug = "launch-test";
  const platformMedia = {
    instagram: getGithubUrl(slug, "instagram"),
    facebook: getGithubUrl(slug, "facebook"),
    tiktok: getGithubUrl(slug, "tiktok"),
    pinterest: getGithubUrl(slug, "pinterest"),
  };
  console.log("Afbeeldingen via GitHub raw URLs (gratis plan)\n");

  // Post naar alle platforms (TikTok overgeslagen: nog niet gekoppeld in Ayrshare)
  const platforms = ["instagram", "facebook", "pinterest"];
  for (const platform of platforms) {
    try {
      const id = await postNow(platform, TEXT[platform], platformMedia[platform]);
      console.log(`✓ ${platform} gepost (ID: ${id})`);
    } catch (err) {
      console.error(`✗ ${platform} mislukt: ${err.message}`);
    }
  }

  console.log("\nTestpost klaar!");
}

main().catch((err) => { console.error(err.message); process.exit(1); });
