# Handoff: Pricing Page ("Pick the Plan That Fits You")

## Overview
A subscription pricing page for a test-prep product with three plans (Weekly, Monthly, Quarterly), a featured/highlighted plan, savings tags, per-week price equivalents, feature chips, social proof, and a money-back guarantee line.

## About the Design Files
`Pricing.dc.html` is a **design reference created in HTML** — a prototype showing intended look and behavior, not production code. Recreate this design in your codebase's existing environment (React, Vue, etc.) using its established patterns and component libraries. If no environment exists yet, choose the framework that best fits the project.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy are final. Recreate pixel-perfectly.

## Screens / Views

### Pricing Page (single view)
- Page background: `#eef2f8`, min-height 100vh, content centered, padding 56px 24px 72px.
- Content column: max-width 1060px, centered, column flex, items centered.

**1. Headline**
- "➤ Pick the Plan That Fits You"
- Font: Plus Jakarta Sans 700, 34px, color `#1a2233`, letter-spacing -0.02em.
- Leading glyph: ➤ at 24px, color `#4d7ef7`, gap 12px.

**2. Social proof row** (margin-top 14px, gap 10px)
- Three overlapping 26px avatar circles (2px `#eef2f8` border, -8px overlap). Placeholder colors `#c9b8a8`, `#8fa3b8`, `#b89a8f` — replace with real user avatars.
- Text: "Trusted by **70k+** test-takers" — 13px, 500, `#5b6575`; "70k+" bold `#1a2233`.

**3. Feature chips row** (margin-top 26px, gap 10px, wraps)
- Pills: white bg, 1px `#e4e9f2` border, radius 999px, padding 8px 16px, 13px/600 `#3a4356`.
- Each has an orange (`#f07b4d`) leading glyph. Chips: "60 mock exams", "Guide & Tips", "3,000+ sample tests", "Instant AI Feedback". Replace glyphs (▤ ❋ ≣ ✦) with your icon set.

**4. Plan cards row** (margin-top 40px, gap 20px, wraps, stretch-aligned)
Card (×3): flex 1, min-width 230px, max-width 340px, white bg, radius 20px, padding 26px, column flex.
- Default: border 1px `#eceff5`, shadow `0 8px 24px rgba(26,34,51,0.06)`.
- Featured (default: Monthly): border 2px `#4d7ef7`, shadow `0 18px 40px rgba(77,126,247,0.18)`, plus a centered floating badge above the card: bg `#4d7ef7`, white 12px/700 text, letter-spacing 0.04em, padding 5px 16px, radius 999px. Badge text: "MOST POPULAR" (or "BEST VALUE" when Quarterly is featured).

Card contents, top to bottom:
- **Tinted header band**: full-bleed to card edges (radius 18px top corners), padding 16px 26px. Contains plan name (17px/700, tint text color) + savings tag.
  - Weekly: bg `#fdf3e4`, text `#d97a2e`
  - Monthly: bg `#eaf1fe`, text `#3d6fe8`
  - Quarterly: bg `#f7e6fb`, text `#b23fe0`
- **Savings tag** (Monthly, Quarterly only): bg `#e9f9ef`, text `#2e9e5b`, 11px/700, padding 3px 9px, radius 999px. "SAVE 37%" / "SAVE 60%".
- **Price row** (margin-top 20px): price 34px/800 `#111827` letter-spacing -0.02em; period 14px/500 `#98a2b3`, baseline-aligned, 6px gap.
  - Weekly $19.99 / week · Monthly $49.99 / month · Quarterly $95.99 / 3 months
- **Per-week equivalent** (12px `#98a2b3`, min-height 16px): Monthly "≈ $12.50 per week", Quarterly "≈ $8.00 per week", Weekly empty.
- **CTA button** (margin-top 18px): full width, radius 999px, padding 13px 0, 14px/600 white text "Get Premium". Bg `#5b8df7` (featured: gradient `#5b8df7`→`#4d7ef7`), shadow `0 6px 14px rgba(77,126,247,0.28)`. Hover: translateY(-1px), bg `#3d6fe8`, 0.15s ease.
- **Feature list** (margin-top 22px, 12px gap): 13px `#3a4356`, line-height 1.4, green check `#2e9e5b` (12px/700). All plans:
  1. Unlimited access to 3,000+ practices
  2. 60 full mock exams
  3. Instant AI feedback for all skills
  4. Progress tracking and insights

**5. Guarantee line** (margin-top 28px)
- Green check + "48-hour money-back guarantee · Cancel anytime" — 13px `#5b6575`.

## Interactions & Behavior
- CTA click: start checkout for that plan (stubbed in prototype).
- CTA hover: lift 1px + darker blue, 0.15s ease transition.
- Responsive: cards flex-wrap; below ~750px they wrap to fewer per row; chips also wrap.
- Links (if added): `#4d7ef7`, hover `#3563d9`.

## State Management
- `featuredPlan`: which plan is highlighted ("Weekly" | "Monthly" | "Quarterly"), default "Monthly". Drives border, shadow, badge, button gradient.
- `showPerWeek`: boolean, shows per-week equivalents, default true.
- Selected plan on CTA click → checkout flow.

## Design Tokens
**Colors**
- Page bg `#eef2f8` · Card bg `#ffffff`
- Text: heading `#1a2233`, body `#3a4356`, secondary `#5b6575`, muted `#98a2b3`, price `#111827`
- Primary blue: `#4d7ef7` (hover `#3d6fe8`, link hover `#3563d9`, button `#5b8df7`)
- Orange accent: `#f07b4d` (chips), tint `#fdf3e4` / `#d97a2e`
- Blue tint `#eaf1fe` / `#3d6fe8` · Purple tint `#f7e6fb` / `#b23fe0`
- Green (success/savings): `#2e9e5b`, tint `#e9f9ef`
- Borders: `#e4e9f2` (chips), `#eceff5` (cards)

**Typography** — Plus Jakarta Sans (Google Fonts), weights 400–800. Scale: 34 / 17 / 14 / 13 / 12 / 11 px.

**Radii** — cards 20px; card header band 18px top; pills/buttons/badges 999px.

**Shadows** — card `0 8px 24px rgba(26,34,51,0.06)`; featured `0 18px 40px rgba(77,126,247,0.18)`; button `0 6px 14px rgba(77,126,247,0.28)`.

**Spacing** — card padding 26px; card gap 20px; chip gap 10px; feature list gap 12px.

## Assets
- No image assets. Avatars are placeholder circles — supply real user photos.
- Chip glyphs and check marks are unicode placeholders — replace with your icon library.
- Font: Plus Jakarta Sans via Google Fonts.

## Files
- `Pricing.dc.html` — the full design reference (markup with inline styles + a small logic class holding plan data and the featured-plan/per-week options).
