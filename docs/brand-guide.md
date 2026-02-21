# Bardo Labs — Brand Identity System
## bardolabs.ai | Purple + Silver Edition

---

## 1. Brand Strategy & Positioning

### Bardo Labs Positioning

- **What We Are**: A product studio building vertical SaaS for SMBs
- **Philosophy**: Small businesses deserve software that's as good as what enterprises use
- **Model**: Go deep into a vertical, find the tool everyone complains about, replace it
- **Name Origin**: "Bardo" = a transitional state in Buddhist philosophy. We build the bridge between legacy and modern.
- **Tagline**: "We build software for the businesses that build everything else."

### Product Naming Convention

All products follow the `[Verb]OS` pattern:
- **ShipOS** — Retail shipping (live)
- **InvoiceOS** — Invoicing & payments (planned)
- **BookingOS** — Scheduling & booking (planned)

---

## 2. Color System — Purple + Silver

The palette is built on two axes: **purple for energy and action**, **silver for trust and sophistication**. The deep navy-black background gives both colors room to breathe.

### Primary Palette

| Role | Color | Hex | Usage |
|---|---|---|---|
| **Void** | Deep Navy-Black | `#08081A` | Primary backgrounds |
| **Signal** | Vivid Violet | `#8B5CF6` | CTAs, accents, interactive elements |
| **Signal Hover** | Soft Violet | `#A78BFA` | Hover states, italic serif text |
| **Signal Deep** | Rich Purple | `#7137EF` | Active states, pressed buttons |
| **Surface** | Silver White | `#E8EAF0` | Primary text on dark |

### Silver Spectrum

| Level | Hex | Usage |
|---|---|---|
| **Silver 100** | `#E8EAF0` | Headings, primary text |
| **Silver 200** | `#D1D5E0` | Subheadings, card titles |
| **Silver 300** | `#B0B6C6` | Logo mark, secondary emphasis |
| **Silver 400** | `#9CA3B4` | Body text, descriptions |
| **Silver 500** | `#7A8198` | Muted text, timestamps |
| **Silver 600** | `#5A607A` | Tertiary text, disabled states |
| **Silver 700** | `#3D4055` | Borders (subtle), dividers |

### Surface & Border System

| Role | Value | Usage |
|---|---|---|
| **Surface Dark** | `#121330` | Cards, panels |
| **Surface Darker** | `#0E0F26` | Nested surfaces, topbars |
| **Void Up** | `#0D0E24` | Elevated backgrounds |
| **Border** | `rgba(192, 198, 212, 0.07)` | Card edges, dividers |
| **Border Hover** | `rgba(192, 198, 212, 0.14)` | Hover states |

### Accent Colors

| Role | Color | Hex | Usage |
|---|---|---|---|
| **Cyan** | Electric Cyan | `#22D3EE` | Info, transit states, links |
| **Emerald** | Fresh Green | `#34D399` | Success, live, shipped |
| **Amber** | Warning | `#F59E0B` | Alerts |

### Signature Gradient

```css
background: linear-gradient(135deg, #8B5CF6, #C084FC, #A78BFA);
background-size: 200% 200%;
animation: gradientMove 5s ease infinite;
```

Used on: hero italic text, ambient orbs (at low opacity), logo accent.

### Purple Opacity Scale (for backgrounds & glows)

```css
--signal-soft: rgba(139, 92, 246, 0.08);   /* Card tints, badge backgrounds */
--signal-glow: rgba(139, 92, 246, 0.14);   /* Focus rings, hover glows */
--signal-ambient: rgba(139, 92, 246, 0.05); /* Background orbs */
```

---

## 3. Why Purple + Silver Works

Purple + silver is one of the highest-trust, highest-sophistication pairings in brand design. Here's the precedent:

| Brand | Palette | Signal |
|---|---|---|
| **Stripe** (Docs) | Purple accent + neutral | Technical authority |
| **Linear** | Purple + dark | Modern developer tool |
| **Figma** | Purple-dominant | Creative precision |
| **Notion** | Black + silver | Calm sophistication |
| **Twitch** | Deep purple | Community + energy |

For Bardo Labs specifically:
- **Purple** signals innovation without the overused blue-SaaS cliché
- **Silver** (not gray) adds a metallic, premium quality — this is polished, not muted
- **Navy-black** backgrounds (not pure black) give the purple warmth and depth
- The pairing avoids both the "crypto bro" neon aesthetic and the "boring enterprise" blue

---

## 4. Typography

### Font Stack

| Role | Font | Weight | Source |
|---|---|---|---|
| **Display / Italic** | Instrument Serif | 400 italic | Google Fonts |
| **Headings** | DM Sans | 700, 800 | Google Fonts |
| **Body** | DM Sans | 400, 500 | Google Fonts |
| **Code / Labels** | JetBrains Mono | 400, 500 | Google Fonts |

### Headline Pattern

Every section headline uses the serif/sans pairing:

```
DM Sans Bold + Instrument Serif Italic (in purple/violet)
```

Example: "Small businesses run on software built for *someone else*"

The italic word is always the emotional anchor — it carries the thesis of the sentence. Set in `--signal-hover` (#A78BFA) or the animated gradient.

---

## 5. Logo System

### Bardo Labs (Primary)

- **Mark**: Two overlapping rounded rectangles. Left: Silver 300 (#B0B6C6). Right: Vivid Violet (#8B5CF6). Represents transition and layered building.
- **Wordmark**: "BARDO" in DM Sans ExtraBold, Silver 100. "LABS" in DM Sans Medium, Silver 500.

### Product Logos

- **ShipOS**: Purple gradient mark (violet to soft violet) + "Ship" in Silver 100 + "OS" in Vivid Violet.

---

## 6. Spacing, Layout, Components

*(Unchanged from v1 — same grid, spacing scale, radius system, card patterns, and animation system. See previous brand guide for details.)*

---

## 7. Dark Mode Considerations

The entire brand is **dark-first**. If you ever need a light mode:

| Dark Mode | Light Mode Equivalent |
|---|---|
| `#08081A` (void) | `#F8F9FC` (pearl white) |
| `#121330` (surface) | `#FFFFFF` (white) |
| `#E8EAF0` (text) | `#1A1B2E` (deep navy text) |
| `#8B5CF6` (signal) | `#7C3AED` (slightly deeper for contrast) |
| `rgba(192, 198, 212, 0.07)` (border) | `rgba(26, 27, 46, 0.08)` (border) |

---

*Bardo Labs Brand Identity v2.0 — Purple + Silver — February 2026*
