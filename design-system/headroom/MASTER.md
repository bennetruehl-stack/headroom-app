# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/headroom/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> **Source of truth:** `app/src/style.css`. All values here mirror the CSS tokens there.
> If you change a token, update both places.

---

**Project:** Headroom
**Updated:** 2026-10-24
**Category:** Personal finance PWA (mobile-first, information only, no advice)
**Style:** Clean, light, calm. Lots of white space, a single blue accent, traffic-light colours only for limit status.

---

## Global Rules

### Color Palette – Light (default)

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Page background | `#F4F5F7` | `--bg` |
| App frame | `#F8F9FB` | `--paper` |
| Card / surface | `#FFFFFF` | `--card` |
| Soft surface (tracks, segmented, notices) | `#F2F4F7` | `--card-soft` |
| Text | `#0E1116` | `--ink` |
| Secondary text | `#475467` | `--ink-soft` |
| Muted text (hints, sources) | `#5D6676` | `--muted` |
| Border | `#E5E7EB` | `--line` |
| Border strong (inputs, quiet buttons) | `#D0D5DD` | `--line-strong` |
| Accent / CTA | `#2456F5` | `--accent` |
| Accent hover | `#1A43CC` | `--accent-strong` |
| Accent tint (selected, avatars) | `#EAF0FF` | `--accent-soft` |
| Text on accent | `#FFFFFF` | `--on-accent` |

### Status Colors (limits only)

Use these **only** to show how close a user is to a limit. Never as decoration.

| Status | Rule (`statusFor` in `packages/core`) | Text / bar | Background | Variables |
|--------|------|------------|------------|-----------|
| Safe (Sicher) | ratio < 0.8 | `#0F7A55` | `#E7F6EF` | `--safe`, `--safe-bg` |
| Close (Knapp) | 0.8 ≤ ratio ≤ 1 | `#A35400` (bar `#E08A00`) | `#FFF3E0` | `--close`, `--close-bg` |
| Over (Über) | ratio > 1 | `#C4291D` | `#FDECEA` | `--over`, `--over-bg` |

Progress bars get their colour automatically via `data-level="safe|close|over"` on `.progress-track`.
Inside the blue hero card the bar is always white (over: `#FFB4AB`); the status badge carries the colour there.

### Color Palette – Dark (`.theme-dark` on `.app-frame`)

| Role | Hex | Variable |
|------|-----|----------|
| App frame | `#0B0D12` | `--paper` |
| Card | `#151922` | `--card` |
| Soft surface | `#1E2330` | `--card-soft` |
| Text / secondary / muted | `#F2F4F7` / `#C3C9D4` / `#9AA3B2` | `--ink`, `--ink-soft`, `--muted` |
| Border / strong | `#262C38` / `#353D4D` | `--line`, `--line-strong` |
| Accent / hover / tint | `#6B8CFF` / `#8AA4FF` / `#1B2547` | `--accent`, `--accent-strong`, `--accent-soft` |
| Safe / Close / Over | `#4CD39B` / `#FFB84D` / `#FF8A80` | status text and bars |

Dark mode only redefines tokens. Components must use variables, never hard-coded light colours.

### Typography

- **Font:** Plus Jakarta Sans (variable), bundled via `@fontsource-variable/plus-jakarta-sans`. No external font requests.
- **Fallback:** `system-ui, -apple-system, sans-serif`
- **Numbers:** always `font-variant-numeric: tabular-nums` for money, hours and counts.

| Element | Size | Weight | Letter-spacing |
|---------|------|--------|----------------|
| h1 | `clamp(2rem, 9vw, 2.6rem)` | 800 | -0.035em |
| h2 | 1.25rem | 800 | -0.02em |
| h3 | 1.05rem | 800 | -0.01em |
| Hero number | `clamp(3rem, 16vw, 4.5rem)` | 800 | -0.045em |
| Eyebrow (above headings) | 12px, accent colour, no uppercase | 700 | 0.01em |
| Body | 16px / 1.55 | 400 | normal |
| Labels | 13px | 600 | normal |
| Hints, sources | 11–12px, `--muted` | 400–500 | normal |

### Radii

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-lg` | `22px` | Cards, lists, hero |
| `--radius-md` | `14px` | Buttons, choices, notices, job rows |
| `--radius-sm` | `10px` | Small elements, segmented buttons |
| Inputs | `12px` | Text, number, select |
| Pills | `999px` | Badges, status, date stamp |

### Spacing

Base unit 4px. Common steps: 4, 8, 12, 16, 20, 24, 32.
- Page side padding: 20px (16px under 380px, 28px from 720px).
- Card padding: 20–24px.
- Section gap: 32px.
- Bottom padding of content: 132px (room for the fixed bottom nav).

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--surface-shadow` | `0 1px 2px rgba(16,24,40,.04), 0 2px 8px rgba(16,24,40,.04)` | All cards |
| `--lift-shadow` | `0 12px 32px rgba(16,24,40,.1)` | Hover on link cards |
| Hero | `0 18px 40px -16px rgba(36,86,245,.55)` | Blue hero card only |
| Primary button | `0 6px 16px` accent at 28 % | Primary CTA |

Dark mode: no card shadows.

### Motion

- Easing: `--ease: cubic-bezier(0.2, 0.7, 0.2, 1)`
- Hover / state changes: 160ms
- Page enter: 220ms fade + 6px rise
- Bottom sheet dialog: 240ms slide up
- Progress bar width: 400ms
- `prefers-reduced-motion` disables all of the above.

---

## Component Specs

### Buttons

- `.button-primary`: accent background, white text, accent shadow, hover `--accent-strong`. One per screen.
- `.button-dark`: ink background, paper text. Secondary strong action.
- `.button-quiet`: white background, `--line-strong` border.
- `.button-danger`: `--over-bg` background, `--over` text.
- `.text-button`: accent text, underline on hover.
- Min height 50px, radius 14px, 15px / 700.

### Cards (`.surface`)

White, 1px `--line` border, radius 22px, `--surface-shadow`. No hover lift, except link cards (`.more-link`) which get `--lift-shadow`.

### Hero metric (`.hero-metric`)

Blue gradient `155deg, #2D63FF → #1F47D6 → #1A3CB8`, white text, soft radial highlights. The only coloured card in the app. Use it once per screen, for the most important number.

### Lists

Limit lists and reference lists are one card with internal dividers (`--line`), not separate cards. Job rows are separate small cards with an 8px gap.

### Inputs

48px high, 12px radius, `--line-strong` border. Focus: accent border plus a 4px accent ring at 18 %.

### Choices (`.radio-choice`) and segmented control

- Choice: white card; selected = accent border plus `--accent-soft` background, radio dot filled with accent.
- Segmented: `--card-soft` track, selected segment is white with a small shadow.

### Badges

Pill shape, 12px / 700, tinted background plus matching text colour (status colours, or `--card-soft` for neutral). No borders.

### Bottom navigation

Fixed, translucent card colour with blur. Labels only, no numbers. The active item is accent-coloured with a 28×4px accent bar above the label.

### Dialogs

Bottom sheet, 24px radius, backdrop `rgba(14,17,22,.45)` with 4px blur.

---

## Anti-Patterns (Do NOT Use)

- ❌ More than one accent colour, or status colours used as decoration
- ❌ Purple / pink gradients; the blue hero gradient is the only gradient
- ❌ Uppercase letter-spaced labels (old style); eyebrows are sentence case
- ❌ Hard-coded hex values in components; use tokens so dark mode works
- ❌ Heavy shadows or borders on every element
- ❌ Emojis as icons
- ❌ Layout-shifting hover effects (scale, large translate)
- ❌ Text below 4.5:1 contrast
- ❌ Invisible focus states

---

## Pre-Delivery Checklist

- [ ] Only tokens from `style.css`, no new hard-coded colours
- [ ] Status colours used only for limit state
- [ ] Money and hours use tabular numbers
- [ ] Checked in light **and** dark mode
- [ ] Focus visible (3px accent outline)
- [ ] Touch targets at least 44×44px
- [ ] `prefers-reduced-motion` respected
- [ ] Works at 320px, 375px and 480px+; no horizontal scroll
- [ ] Nothing hidden behind the fixed header or bottom nav
