import { createCanvas, loadImage } from "canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "images", "generated");
const LOGO_PATH = path.join(ROOT, "images", "logo.png");

const COLORS = {
  green: "#27AE60",
  darkGreen: "#1E8449",
  white: "#FFFFFF",
  lightGray: "#F8F9FA",
  textDark: "#1A1A1A",
};

const FORMATS = {
  instagram: { width: 1080, height: 1080, label: "instagram" },
  facebook: { width: 1080, height: 1080, label: "facebook" },
  pinterest: { width: 1000, height: 1500, label: "pinterest" },
  tiktok: { width: 1080, height: 1920, label: "tiktok" },
};

// Kleurschema per post type
const THEMES = {
  tip: {
    bg: COLORS.green,
    text: COLORS.white,
    accent: COLORS.darkGreen,
    bar: COLORS.darkGreen,
  },
  quote: {
    bg: COLORS.white,
    text: COLORS.darkGreen,
    accent: COLORS.green,
    bar: COLORS.green,
  },
  statistiek: {
    bg: COLORS.darkGreen,
    text: COLORS.white,
    accent: "#145A32",
    bar: "#0E3D22",
  },
  feature: {
    bg: COLORS.lightGray,
    text: COLORS.textDark,
    accent: COLORS.green,
    bar: COLORS.green,
  },
};

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

async function drawImage({ width, height, postType, title, subtitle, format }) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const theme = THEMES[postType] || THEMES.feature;
  const pad = Math.round(width * 0.07);

  // Achtergrond
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // Decoratief kleurblok (rechtsonder) voor feature posts
  if (postType === "feature") {
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(width * 0.5, height * 0.5, width * 0.5, height * 0.5);
    ctx.globalAlpha = 1;
  }

  // Logo rechtsboven (als bestand bestaat)
  if (fs.existsSync(LOGO_PATH)) {
    try {
      const logo = await loadImage(LOGO_PATH);
      const logoH = Math.round(height * 0.06);
      const logoW = Math.round(logo.width * (logoH / logo.height));
      ctx.drawImage(logo, width - pad - logoW, pad, logoW, logoH);
    } catch {
      // Logo niet beschikbaar, doorgaan zonder
    }
  } else {
    // Tekstfallback voor logo
    ctx.fillStyle = postType === "tip" || postType === "statistiek" ? COLORS.white : COLORS.green;
    ctx.font = `bold ${Math.round(height * 0.025)}px Arial`;
    ctx.textAlign = "right";
    ctx.fillText("kindgeld.nl", width - pad, pad + Math.round(height * 0.025));
  }

  // Post-type label (klein, bovenlinks)
  const labelMap = { tip: "💡 TIP", quote: "💬 QUOTE", statistiek: "📊 STATISTIEK", feature: "✨ FEATURE" };
  ctx.fillStyle = postType === "tip" || postType === "statistiek" ? "rgba(255,255,255,0.7)" : theme.accent;
  ctx.font = `${Math.round(height * 0.022)}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText(labelMap[postType] || "POST", pad, pad + Math.round(height * 0.022));

  // Hoofdtekst (gecentreerd verticaal)
  const titleSize = Math.round(height * (width === height ? 0.065 : 0.05));
  ctx.font = `bold ${titleSize}px Arial`;
  ctx.fillStyle = theme.text;
  ctx.textAlign = "center";

  const centerY = height * 0.42;
  const maxW = width - pad * 2;
  const lineH = titleSize * 1.3;
  const finalY = wrapText(ctx, title, width / 2, centerY, maxW, lineH);

  // Subtekst
  if (subtitle) {
    const subSize = Math.round(height * 0.028);
    ctx.font = `${subSize}px Arial`;
    ctx.fillStyle = postType === "tip" || postType === "statistiek"
      ? "rgba(255,255,255,0.85)"
      : COLORS.textDark;
    ctx.globalAlpha = 0.9;
    wrapText(ctx, subtitle, width / 2, finalY + subSize, maxW, subSize * 1.5);
    ctx.globalAlpha = 1;
  }

  // Groene balk onderaan
  const barH = Math.round(height * 0.09);
  ctx.fillStyle = theme.bar;
  ctx.fillRect(0, height - barH, width, barH);

  // "kindgeld.nl" in de balk
  ctx.fillStyle = COLORS.white;
  ctx.font = `bold ${Math.round(barH * 0.45)}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText("kindgeld.nl", width / 2, height - barH + Math.round(barH * 0.65));

  return canvas.toBuffer("image/png");
}

export async function generateImagesForPost({ slug, postType, title, subtitle }) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const paths = {};

  for (const [platform, fmt] of Object.entries(FORMATS)) {
    const buffer = await drawImage({
      width: fmt.width,
      height: fmt.height,
      postType,
      title,
      subtitle,
      format: platform,
    });

    const filename = `${slug}-${platform}.png`;
    const filePath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    paths[platform] = filePath;
    console.log(`  ✓ ${platform} afbeelding: ${filename}`);
  }

  return paths;
}

// Standalone uitvoer
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const testCases = [
    { slug: "test-tip", postType: "tip", title: "Geef je kind zakgeld in stappen", subtitle: "Begin klein en bouw op met leeftijd" },
    { slug: "test-quote", postType: "quote", title: '"Leer je kind sparen voor wat écht telt"', subtitle: "— kindgeld.nl" },
    { slug: "test-statistiek", postType: "statistiek", title: "65% van kinderen weet niet hoeveel ze sparen", subtitle: "Bron: Nibud 2024" },
    { slug: "test-feature", postType: "feature", title: "Stel spaardoelen in voor je kind", subtitle: "Eenvoudig via de kindgeld.nl app" },
  ];

  for (const test of testCases) {
    console.log(`\nGenereer afbeeldingen voor: ${test.slug}`);
    await generateImagesForPost(test);
  }
  console.log("\nKlaar!");
}
