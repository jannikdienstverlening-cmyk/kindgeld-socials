# kindgeld-socials

Geautomatiseerde sociale media content voor [kindgeld.nl](https://kindgeld.nl).

Elke zondag om 19:00 genereert een GitHub Action automatisch posts met afbeeldingen
voor Instagram, Facebook, TikTok en Pinterest, en plant ze in via Buffer.

---

## Postschema

| Dag      | Tijd  | Platform                              |
|----------|-------|---------------------------------------|
| Maandag  | 08:00 | Instagram, Facebook, TikTok, Pinterest|
| Woensdag | 12:00 | Instagram, Facebook, TikTok, Pinterest|
| Vrijdag  | 17:00 | Instagram, Facebook, TikTok, Pinterest|
| Zondag   | 10:00 | Instagram, Facebook, TikTok, Pinterest|

## Onderwerpen (roterend)

- Tip voor ouders over zakgeld
- Statistiek over kinderen en geld
- Feature uitleg kindgeld.nl
- Inspirerende quote
- Spaardoel inspiratie
- Beloningentip

---

## Installatie

```bash
git clone https://github.com/jannikdienstverlening-cmyk/kindgeld-socials.git
cd kindgeld-socials
npm install
cp .env.example .env
# Vul .env in met je API sleutels (zie hieronder)
```

### Ubuntu / GitHub Actions: extra dependencies voor canvas

```bash
sudo apt-get install -y libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

---

## Logo toevoegen

Kopieer het kindgeld.nl logo naar:

```
/images/logo.png
```

Het logo wordt automatisch rechtsboven op elke gegenereerde afbeelding geplaatst.
Ondersteunde formaten: PNG (transparante achtergrond aanbevolen).

---

## Buffer instellen

### 1. Account aanmaken

Ga naar [buffer.com](https://buffer.com) en maak een account aan.
Verbind je Instagram, Facebook, TikTok en Pinterest accounts.

### 2. Access Token ophalen

1. Ga naar [buffer.com/developers/apps](https://buffer.com/developers/apps)
2. Klik **Create an App**
3. Vul naam en callback URL in (bijv. `http://localhost`)
4. Kopieer je **Access Token**
5. Zet in `.env`: `BUFFER_ACCESS_TOKEN=jouw_token`

### 3. Profile IDs vinden

Roep de profielen op via de Buffer API:

```bash
curl "https://api.bufferapp.com/1/profiles.json?access_token=JOUW_TOKEN"
```

Zoek in de output per platform de `"id"` waarde en zet die in `.env`:

```
BUFFER_INSTAGRAM_ID=abc123
BUFFER_FACEBOOK_ID=def456
BUFFER_TIKTOK_ID=ghi789
BUFFER_PINTEREST_ID=jkl012
```

---

## Handmatig draaien

```bash
# Alleen content + afbeeldingen genereren
npm run generate

# Alleen afbeeldingen testen
npm run images

# Alleen inplannen via Buffer
npm run schedule

# Alles in één keer
npm run run-all
```

---

## GitHub Actions Secrets instellen

Ga naar: `github.com/jannikdienstverlening-cmyk/kindgeld-socials/settings/secrets/actions`

Voeg toe:

| Secret                | Waarde                        |
|-----------------------|-------------------------------|
| `ANTHROPIC_API_KEY`   | Jouw Anthropic API sleutel    |
| `BUFFER_ACCESS_TOKEN` | Jouw Buffer access token      |
| `BUFFER_INSTAGRAM_ID` | Buffer profile ID Instagram   |
| `BUFFER_FACEBOOK_ID`  | Buffer profile ID Facebook    |
| `BUFFER_TIKTOK_ID`    | Buffer profile ID TikTok      |
| `BUFFER_PINTEREST_ID` | Buffer profile ID Pinterest   |

---

## Mappenstructuur

```
/posts              → gegenereerde posts als JSON
/scripts
  generate-content.js  → Anthropic API content generator
  generate-images.js   → Canvas afbeeldingen generator
  buffer-post.js       → Buffer API scheduler
/images
  logo.png             → kindgeld.nl logo (zelf toevoegen)
  /generated           → automatisch gegenereerde afbeeldingen
/templates          → post richtlijnen per platform
/.github/workflows
  social-posts.yml     → GitHub Action (elke zondag 19:00)
```
