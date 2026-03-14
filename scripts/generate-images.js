import { createCanvas, loadImage } from "canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "images", "generated");
const LOGO_PATH = path.join(ROOT, "images", "logo.png");

const C = {
  green:      "#27AE60",
  greenMid:   "#1E8E4F",
  darkGreen:  "#1A5C38",
  deepGreen:  "#0E3D22",
  lightGreen: "#A9DFBF",
  paleGreen:  "#E8F8F0",
  white:      "#FFFFFF",
  offWhite:   "#F9FDF9",
  dark:       "#1A1A1A",
  gray:       "#555555",
};

const FORMATS = {
  instagram: { width: 1080, height: 1080 },
  facebook:  { width: 1080, height: 1080 },
  pinterest: { width: 1000, height: 1500 },
  tiktok:    { width: 1080, height: 1920 },
};

// Unsplash queries per post type
const UNSPLASH_QUERIES = {
  tip:        ["piggy+bank+saving+money", "children+counting+coins", "kids+money+jar"],
  quote:      ["family+saving+money+together", "kids+learning+money", "happy+children+piggy+bank"],
  statistiek: ["money+coins+saving", "financial+planning+family", "piggy+bank+coins"],
  feature:    ["kids+app+tablet+learning", "family+finance+app", "children+digital+money"],
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

function wrapText(ctx, text, x, y, maxWidth, lineHeight, align = "center") {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  const lines = [];

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  const totalH = lines.length * lineHeight;
  let startY = currentY;

  for (const l of lines) {
    ctx.fillText(l, x, startY);
    startY += lineHeight;
  }
  return startY;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function tryLoadUnsplash(postType, width, height) {
  const queries = UNSPLASH_QUERIES[postType] || UNSPLASH_QUERIES.tip;
  const query = queries[Math.floor(Math.random() * queries.length)];
  const url = `https://source.unsplash.com/${width}x${height}/?${query}`;
  try {
    const res = await fetch(url, { redirect: "follow", timeout: 6000 });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    // Darken with sharp
    const darkened = await sharp(buf)
      .resize(width, height, { fit: "cover" })
      .modulate({ brightness: 0.45 })
      .toBuffer();
    return await loadImage(darkened);
  } catch {
    return null;
  }
}

async function drawLogo(ctx, width, height, pad, onDark = true) {
  if (!fs.existsSync(LOGO_PATH)) {
    ctx.fillStyle = onDark ? C.white : C.green;
    ctx.font = `bold ${Math.round(height * 0.024)}px Arial`;
    ctx.textAlign = "right";
    ctx.fillText("kindgeld.nl", width - pad, pad + Math.round(height * 0.024));
    return;
  }
  try {
    const logo = await loadImage(LOGO_PATH);
    const logoH = Math.round(height * 0.055);
    const logoW = Math.round(logo.width * (logoH / logo.height));
    // Soft white pill behind logo for contrast
    if (onDark) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      drawRoundRect(ctx, width - pad - logoW - 12, pad - 8, logoW + 24, logoH + 16, 10);
      ctx.fill();
    }
    ctx.drawImage(logo, width - pad - logoW, pad, logoW, logoH);
  } catch {
    ctx.fillStyle = onDark ? C.white : C.green;
    ctx.font = `bold ${Math.round(height * 0.024)}px Arial`;
    ctx.textAlign = "right";
    ctx.fillText("kindgeld.nl", width - pad, pad + Math.round(height * 0.024));
  }
}

function drawBottomBar(ctx, width, height, color, text = "kindgeld.nl") {
  const barH = Math.round(height * 0.09);
  ctx.fillStyle = color;
  ctx.fillRect(0, height - barH, width, barH);
  ctx.fillStyle = C.white;
  ctx.font = `bold ${Math.round(barH * 0.42)}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height - barH / 2 + Math.round(barH * 0.15));
}

function drawDecorativeDots(ctx, width, height, color, count = 18) {
  ctx.fillStyle = hexToRgba(color, 0.12);
  const rng = (seed) => ((seed * 1664525 + 1013904223) & 0xffffffff) / 0xffffffff;
  for (let i = 0; i < count; i++) {
    const x = rng(i * 7 + 1) * width;
    const y = rng(i * 7 + 3) * height;
    const r = 8 + rng(i * 7 + 5) * 38;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── DRAWERS ────────────────────────────────────────────────────────────────

async function drawTipPost(ctx, width, height, title, subtitle, emoji = "💰") {
  const pad = Math.round(width * 0.08);
  const isSquare = width === height;

  // Gradient achtergrond
  const grad = ctx.createLinearGradient(0, 0, width * 0.3, height);
  grad.addColorStop(0, C.green);
  grad.addColorStop(1, C.darkGreen);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Decoratieve cirkels
  drawDecorativeDots(ctx, width, height, C.white);

  // Subtiel licht blok rechtsboven
  const lightGrad = ctx.createRadialGradient(width, 0, 0, width, 0, width * 0.7);
  lightGrad.addColorStop(0, "rgba(255,255,255,0.08)");
  lightGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = lightGrad;
  ctx.fillRect(0, 0, width, height);

  // TIP label
  const labelY = pad + Math.round(height * 0.032);
  ctx.fillStyle = hexToRgba(C.white, 0.25);
  drawRoundRect(ctx, pad, pad - 2, 100, Math.round(height * 0.046), 6);
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.font = `bold ${Math.round(height * 0.028)}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText("TIP", pad + 14, labelY);

  // Logo rechtsboven
  await drawLogo(ctx, width, height, pad, true);

  // Emoji groot centraal bovenaan tekst
  const emojiSize = Math.round(height * (isSquare ? 0.11 : 0.08));
  ctx.font = `${emojiSize}px Arial`;
  ctx.textAlign = "center";
  const emojiY = isSquare ? height * 0.35 : height * 0.30;
  ctx.fillText(emoji, width / 2, emojiY);

  // Witte divider lijn
  ctx.strokeStyle = hexToRgba(C.white, 0.3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.25, emojiY + Math.round(height * 0.035));
  ctx.lineTo(width * 0.75, emojiY + Math.round(height * 0.035));
  ctx.stroke();

  // Hoofdtekst
  const titleSize = Math.round(height * (isSquare ? 0.062 : 0.046));
  ctx.font = `bold ${titleSize}px Arial`;
  ctx.fillStyle = C.white;
  ctx.textAlign = "center";
  const titleY = emojiY + Math.round(height * 0.075);
  const titleEnd = wrapText(ctx, title, width / 2, titleY, width - pad * 2, titleSize * 1.35);

  // Subtekst
  if (subtitle) {
    const subSize = Math.round(height * 0.026);
    ctx.font = `${subSize}px Arial`;
    ctx.fillStyle = C.lightGreen;
    wrapText(ctx, subtitle, width / 2, titleEnd + subSize * 0.6, width - pad * 2.5, subSize * 1.5);
  }

  // Balk onderaan
  drawBottomBar(ctx, width, height, C.deepGreen);
}

async function drawQuotePost(ctx, width, height, title, subtitle) {
  const pad = Math.round(width * 0.08);
  const isSquare = width === height;

  // Witte achtergrond met subtiele textuur
  ctx.fillStyle = C.offWhite;
  ctx.fillRect(0, 0, width, height);

  // Zachte groene hoek rechtsboven
  const cornerGrad = ctx.createRadialGradient(width, 0, 0, width, 0, width * 0.6);
  cornerGrad.addColorStop(0, hexToRgba(C.green, 0.07));
  cornerGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cornerGrad;
  ctx.fillRect(0, 0, width, height);

  // Dikke groene accentlijn links
  const accentW = Math.round(width * 0.018);
  const lineGrad = ctx.createLinearGradient(0, 0, 0, height);
  lineGrad.addColorStop(0, C.green);
  lineGrad.addColorStop(1, C.darkGreen);
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, 0, accentW, height);

  // QUOTE label
  ctx.fillStyle = hexToRgba(C.green, 0.12);
  drawRoundRect(ctx, pad + accentW, pad - 2, 120, Math.round(height * 0.046), 6);
  ctx.fill();
  ctx.fillStyle = C.green;
  ctx.font = `bold ${Math.round(height * 0.028)}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText("QUOTE", pad + accentW + 14, pad + Math.round(height * 0.032));

  // Logo rechtsboven
  await drawLogo(ctx, width, height, pad, false);

  // Grote aanhalingstekens
  const quoteSize = Math.round(height * (isSquare ? 0.22 : 0.16));
  ctx.font = `bold ${quoteSize}px Georgia, serif`;
  ctx.fillStyle = hexToRgba(C.lightGreen, 0.5);
  ctx.textAlign = "left";
  ctx.fillText("\u201C", pad + accentW, isSquare ? height * 0.38 : height * 0.30);

  // Quote tekst
  const titleSize = Math.round(height * (isSquare ? 0.058 : 0.042));
  ctx.font = `italic ${titleSize}px Georgia, serif`;
  ctx.fillStyle = C.dark;
  ctx.textAlign = "center";
  const quoteTextY = isSquare ? height * 0.44 : height * 0.36;
  const quoteEnd = wrapText(ctx, title, width / 2, quoteTextY, width - pad * 2.5 - accentW, titleSize * 1.45);

  // Closing quote (kleiner, rechts uitgelijnd)
  ctx.font = `bold ${Math.round(quoteSize * 0.6)}px Georgia, serif`;
  ctx.fillStyle = hexToRgba(C.lightGreen, 0.5);
  ctx.textAlign = "right";
  ctx.fillText("\u201D", width - pad, quoteEnd);

  // Subtekst / bron
  if (subtitle) {
    const subSize = Math.round(height * 0.026);
    ctx.font = `${subSize}px Arial`;
    ctx.fillStyle = C.gray;
    ctx.textAlign = "center";
    ctx.fillText(`— ${subtitle}`, width / 2, quoteEnd + subSize * 1.5);
  }

  // Lichtgroene footer
  const barH = Math.round(height * 0.09);
  const barGrad = ctx.createLinearGradient(0, height - barH, width, height);
  barGrad.addColorStop(0, C.green);
  barGrad.addColorStop(1, C.darkGreen);
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, height - barH, width, barH);
  ctx.fillStyle = C.white;
  ctx.font = `bold ${Math.round(barH * 0.42)}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText("kindgeld.nl", width / 2, height - barH / 2 + Math.round(barH * 0.15));
}

async function drawStatistiekPost(ctx, width, height, title, subtitle) {
  const pad = Math.round(width * 0.08);
  const isSquare = width === height;

  // Donkergroene achtergrond
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, C.darkGreen);
  grad.addColorStop(1, C.deepGreen);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtiele cirkels
  drawDecorativeDots(ctx, width, height, C.lightGreen, 12);

  // Decoratieve cirkel achtergrond centraal
  const circleR = Math.round(Math.min(width, height) * 0.32);
  const circleX = width / 2;
  const circleY = isSquare ? height * 0.46 : height * 0.40;
  const circleGrad = ctx.createRadialGradient(circleX, circleY, 0, circleX, circleY, circleR);
  circleGrad.addColorStop(0, hexToRgba(C.green, 0.18));
  circleGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = circleGrad;
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
  ctx.fill();

  // STATISTIEK label
  ctx.fillStyle = hexToRgba(C.lightGreen, 0.2);
  drawRoundRect(ctx, pad, pad - 2, 180, Math.round(height * 0.046), 6);
  ctx.fill();
  ctx.fillStyle = C.lightGreen;
  ctx.font = `bold ${Math.round(height * 0.026)}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText("STATISTIEK", pad + 14, pad + Math.round(height * 0.030));

  // Logo rechtsboven
  await drawLogo(ctx, width, height, pad, true);

  // Extraheer getal/percentage uit titel voor groot display
  const numMatch = title.match(/\d+[\.,]?\d*\s*%?/);
  const bigNum = numMatch ? numMatch[0] : "📊";
  const restText = numMatch ? title.replace(numMatch[0], "").trim() : title;

  // Groot getal
  const numSize = Math.round(height * (isSquare ? 0.16 : 0.12));
  ctx.font = `bold ${numSize}px Arial`;
  ctx.fillStyle = C.white;
  ctx.textAlign = "center";
  const numY = circleY - Math.round(numSize * 0.1);
  ctx.fillText(bigNum, circleX, numY);

  // Progress balk onder het getal
  const barW = Math.round(width * 0.5);
  const barH2 = Math.round(height * 0.012);
  const barX = (width - barW) / 2;
  const barY = numY + Math.round(height * 0.025);
  ctx.fillStyle = hexToRgba(C.white, 0.15);
  drawRoundRect(ctx, barX, barY, barW, barH2, barH2 / 2);
  ctx.fill();

  // Gevulde progress (percentage of 65% als default)
  const pct = numMatch ? Math.min(parseFloat(numMatch[0].replace(",", ".")) / 100, 1) : 0.65;
  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fillGrad.addColorStop(0, C.lightGreen);
  fillGrad.addColorStop(1, C.green);
  ctx.fillStyle = fillGrad;
  drawRoundRect(ctx, barX, barY, barW * pct, barH2, barH2 / 2);
  ctx.fill();

  // Rest tekst
  const textSize = Math.round(height * 0.032);
  ctx.font = `${textSize}px Arial`;
  ctx.fillStyle = C.lightGreen;
  ctx.textAlign = "center";
  const textY = barY + barH2 + Math.round(height * 0.045);
  const textEnd = wrapText(ctx, restText || title, width / 2, textY, width - pad * 2, textSize * 1.4);

  // Bron
  if (subtitle) {
    ctx.font = `${Math.round(height * 0.022)}px Arial`;
    ctx.fillStyle = hexToRgba(C.lightGreen, 0.6);
    ctx.fillText(subtitle, width / 2, textEnd + Math.round(height * 0.03));
  }

  drawBottomBar(ctx, width, height, C.deepGreen);
}

async function drawFeaturePost(ctx, width, height, title, subtitle, icon = "✨") {
  const pad = Math.round(width * 0.08);
  const isSquare = width === height;

  // Lichte achtergrond met subtiele gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, C.paleGreen);
  grad.addColorStop(1, "#D5F5E3");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Decoratief groen blok linksonder
  ctx.fillStyle = hexToRgba(C.green, 0.06);
  ctx.fillRect(0, height * 0.65, width * 0.45, height * 0.35);

  // Subtiele cirkels
  drawDecorativeDots(ctx, width, height, C.green, 10);

  // FEATURE label
  ctx.fillStyle = hexToRgba(C.green, 0.15);
  drawRoundRect(ctx, pad, pad - 2, 140, Math.round(height * 0.046), 6);
  ctx.fill();
  ctx.fillStyle = C.darkGreen;
  ctx.font = `bold ${Math.round(height * 0.026)}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText("FEATURE", pad + 14, pad + Math.round(height * 0.030));

  // Logo rechtsboven
  await drawLogo(ctx, width, height, pad, false);

  // Feature icoon in groene cirkel
  const iconBgR = Math.round(Math.min(width, height) * 0.11);
  const iconX = width / 2;
  const iconY = isSquare ? height * 0.36 : height * 0.30;

  ctx.fillStyle = C.green;
  ctx.beginPath();
  ctx.arc(iconX, iconY, iconBgR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hexToRgba(C.darkGreen, 0.3);
  ctx.beginPath();
  ctx.arc(iconX + iconBgR * 0.15, iconY + iconBgR * 0.15, iconBgR, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `${Math.round(iconBgR * 1.1)}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText(icon, iconX, iconY + Math.round(iconBgR * 0.35));

  // Feature naam
  const titleSize = Math.round(height * (isSquare ? 0.060 : 0.044));
  ctx.font = `bold ${titleSize}px Arial`;
  ctx.fillStyle = C.darkGreen;
  ctx.textAlign = "center";
  const titleY = iconY + iconBgR + Math.round(height * 0.065);
  const titleEnd = wrapText(ctx, title, width / 2, titleY, width - pad * 2, titleSize * 1.35);

  // Subtekst
  if (subtitle) {
    const subSize = Math.round(height * 0.027);
    ctx.font = `${subSize}px Arial`;
    ctx.fillStyle = C.gray;
    const subEnd = wrapText(ctx, subtitle, width / 2, titleEnd + subSize * 0.7, width - pad * 2.5, subSize * 1.45);

    // CTA knop
    const btnY = subEnd + Math.round(height * 0.05);
    const btnW = Math.round(width * 0.55);
    const btnH = Math.round(height * 0.065);
    const btnX = (width - btnW) / 2;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
    btnGrad.addColorStop(0, C.green);
    btnGrad.addColorStop(1, C.darkGreen);
    ctx.fillStyle = btnGrad;
    drawRoundRect(ctx, btnX, btnY, btnW, btnH, btnH / 2);
    ctx.fill();

    ctx.fillStyle = C.white;
    ctx.font = `bold ${Math.round(btnH * 0.42)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Probeer gratis \u2192", width / 2, btnY + btnH / 2 + Math.round(btnH * 0.15));
  }

  // Footer balk
  const barH = Math.round(height * 0.09);
  const barGrad = ctx.createLinearGradient(0, height - barH, width, height);
  barGrad.addColorStop(0, C.green);
  barGrad.addColorStop(1, C.darkGreen);
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, height - barH, width, barH);
  ctx.fillStyle = C.white;
  ctx.font = `bold ${Math.round(barH * 0.42)}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText("kindgeld.nl", width / 2, height - barH / 2 + Math.round(barH * 0.15));
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────

const EMOJIS = {
  tip:        ["💰", "🐷", "🎯", "💡", "✅", "💸", "🪙"],
  quote:      ["💬", "✨", "💚"],
  statistiek: ["📊", "📈", "💡"],
  feature:    ["⭐", "🚀", "📱", "🎁", "🔔"],
};

function pickEmoji(postType, slug) {
  const arr = EMOJIS[postType] || EMOJIS.tip;
  const idx = slug.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % arr.length;
  return arr[idx];
}

export async function generateImagesForPost({ slug, postType, title, subtitle }) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const emoji = pickEmoji(postType, slug);
  const paths = {};

  for (const [platform, fmt] of Object.entries(FORMATS)) {
    const { width, height } = fmt;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    switch (postType) {
      case "tip":        await drawTipPost(ctx, width, height, title, subtitle, emoji); break;
      case "quote":      await drawQuotePost(ctx, width, height, title, subtitle); break;
      case "statistiek": await drawStatistiekPost(ctx, width, height, title, subtitle); break;
      default:           await drawFeaturePost(ctx, width, height, title, subtitle, emoji);
    }

    const filename = `${slug}-${platform}.png`;
    const filePath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
    paths[platform] = filePath;
    console.log(`  ✓ ${platform} (${width}×${height})`);
  }

  return paths;
}

// Standalone: genereer testafbeeldingen
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tests = [
    { slug: "voorbeeld-tip",        postType: "tip",        title: "Geef je kind elke week zakgeld op vaste dag", subtitle: "Regelmaat leert kinderen omgaan met geld" },
    { slug: "voorbeeld-quote",      postType: "quote",      title: "Wie zijn kind leert sparen, geeft hem een cadeau voor het leven", subtitle: "kindgeld.nl" },
    { slug: "voorbeeld-statistiek", postType: "statistiek", title: "69% van kinderen weet niet hoeveel ze sparen per maand", subtitle: "Bron: Nibud 2024" },
    { slug: "voorbeeld-feature",    postType: "feature",    title: "Spaardoel instellen in 30 seconden", subtitle: "Kies een doel, stel een bedrag in en spaar automatisch" },
  ];
  for (const t of tests) {
    console.log(`\n${t.slug}`);
    await generateImagesForPost(t);
  }
  console.log("\nKlaar!");
}
