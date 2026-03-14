# kindgeld-socials

Geautomatiseerde sociale media content voor [kindgeld.nl](https://kindgeld.nl).

## Wat doet dit?

Dit project genereert automatisch 3 sociale media posts per week voor kindgeld.nl en plant deze in via Buffer. Elke zondag om 20:00 draait een GitHub Action die de posts aanmaakt en inplant.

## Postschema

| Dag       | Tijd  | Onderwerp (afwisselend)                        |
|-----------|-------|------------------------------------------------|
| Maandag   | 08:00 | Tip voor ouders over zakgeld                   |
| Woensdag  | 12:00 | Feature uitleg kindgeld.nl / Quote / Statistiek|
| Vrijdag   | 17:00 | Inspirerende quote of statistiek               |

## Platforms

- **Instagram** — kort, emoji's, hashtags
- **Facebook** — iets langer, persoonlijk
- **LinkedIn** — professioneel, gericht op ouders

## Mappenstructuur

```
/posts       → gegenereerde posts als JSON
/scripts     → automatiseringsscripts
/images      → gegenereerde afbeeldingen
/templates   → post templates per platform
```

## Installatie

```bash
npm install
cp .env.example .env
# Vul .env in met je API sleutels
```

## Handmatig draaien

```bash
node scripts/generate-posts.js   # Genereer posts
node scripts/schedule-posts.js   # Plan posts in via Buffer
```

## Omgevingsvariabelen

Zie `.env.example` voor alle benodigde variabelen.
