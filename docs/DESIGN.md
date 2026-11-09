# Design System — Pulse

Single source of truth: `frontend/src/app/styles/globals.css` (tokens, `@theme` mapping, base
styles). This document explains the rules behind it; if the two disagree, the file wins and this
doc is stale.

Stack: Tailwind CSS v4 (`@tailwindcss/vite`), `class-variance-authority` for component variants,
`tailwind-merge` + `clsx` (`cn()` in `shared/lib/cn.ts`), `lucide-react` icons, Manrope
(`@fontsource-variable/manrope`, self-hosted — no third-party font request).

---

## Layers

```
primitives   :root, first block       raw palette values, never used by components
semantics    :root (light) / html.dark --primary, --card, --success-ink, …
utilities    @theme inline            --color-*, --radius-*, --shadow-*, --text-*
components   bg-card, text-success-ink semantic utilities only
```

**Rule: no colour literal in a component.** No `#hex`, no `rgb()`, no `bg-[#…]`. If a value is
missing from the token layer, add the token.

**Rule: primitives are not consumed by components.** `--brand-base` is only referenced by a
semantic token. Components use `bg-primary`, `text-primary-ink`.

**Rule: no `dark:` utilities for colour.** Colour is token-driven; the dark theme only redefines
tokens under `html.dark`.

---

## Themes

Two themes: light (`:root`) and dark (`html.dark`). The class lives on `<html>`, so every overlay
inherits it.

- Default follows the OS (`prefers-color-scheme`); the user's choice from the theme toggle is
  stored in `localStorage` (`pulse:theme`) and wins afterwards.
- An inline script in `index.html` applies the class before the first paint: no flash of the
  wrong theme.
- Dark is not inverted light. Dark builds depth from lightness plus light: a lit top edge and a
  real offset shadow on cards (`--shadow-card`). Light drops the inset highlight (a white line on a
  white card is invisible).

---

## Palette (primitives)

Brand ramp (Ant-style export, dark): **do not invent ramp steps** — request them.

| Primitive | Value | Consumed by |
|---|---|---|
| `--brand-bg` | `#2B1611` | `--primary-surface` (dark) |
| `--brand-border` | `#592716` | `--primary-border` |
| `--brand-hover` | `#E87040` | `--primary-hover`, `--primary-ink` (dark) |
| `--brand-base` | `#D84A1B` | `--primary`, `--ring`, `--chart-1` |
| `--brand-active` | `#AA3E19` | `--primary-active`, `--primary-ink` (light) |
| `--brand-text` | `#F8B692` | — |

State primitives:

| Primitive | Light | Dark |
|---|---|---|
| `--success-base` | `#52c41a` | `#49aa19` |
| `--warning-base` | `#faad14` | `#d89614` |
| `--info-base` | `#1668dc` | `#1668dc` |
| `--error-base` | `#ff4d4f` | `#e84749` |
| `--error-hover` | — | `#e86e6b` |
| `--neutral-base` (graphite) | `#6e6e75` | `#8e8e95` |

---

## Surfaces ("Graphite")

A cool neutral ladder with no hue, so the brand orange is the only warm thing on screen.

| Token | Dark | Light | Role |
|---|---|---|---|
| `--surface-sunken` | `#101012` | `#f4f4f5` | table stripes, input wells |
| `--background` | `#0B0B0C` | `#f4f4f5` | the page |
| `--card` | `#18181A` | `#ffffff` | cards, header |
| `--surface-elevated` | `#232326` | `#ffffff` | anything floating above a card (`--popover`) |
| `--muted` | `#2A2A2E` | `#ededef` | the universal hover, quiet chips |

Dark reads sunken < background < card < elevated < muted. In light, sunken is the page itself.

## Text ramp

| Role | Token | Utility | Dark | Light |
|---|---|---|---|---|
| primary | `--foreground` | `text-foreground` | `#F5F5F7` | `#111113` |
| secondary | `--muted-foreground` | `text-muted-foreground` | `#AEAEB4` | `#55555C` |
| tertiary | `--label-tertiary` | `text-label-tertiary` | `#919198` | `#67676E` |
| brand as text | `--primary-ink` | `text-primary-ink` | `--brand-hover` | `--brand-active` |
| error as text | `--error-ink` | `text-error-ink` | `--error-hover` | `--error-base` 78% over black |
| success as text | `--success-ink` | `text-success-ink` | success 80% over white | success 70% over black |
| warning as text | `--warning-ink` | `text-warning-ink` | warning | warning 50% over black |
| info as text | `--info-ink` | `text-info-ink` | info 65% over white | info 80% over black |
| neutral as text | `--neutral-ink` | `text-neutral-ink` | neutral 70% over white | neutral 75% over black |

**Tone as text takes the `*-ink` step, never the fill** (`text-primary`, `text-destructive`,
`text-success`): the fills read 1.8:1 (warning) to 4.6:1 on their own wash.

## Edges and depth

| Token | Dark | Light | Role |
|---|---|---|---|
| `--border` | white .10 | black .08 | hairlines |
| `--border-strong` | white .18 | black .14 | edges on a tinted surface |
| `--input` | white .34 | black .42 | **the field edge** (3:1 non-text bar on the well) |
| `--card-border` | white .08 | black .07 | a card's edge |
| `--shadow-card` | inset top white .07 + `0 1px 2px` black .6 + `0 10px 24px -14px` black .9 | the two offset shadows at .06 / .25 | card depth |
| `--shadow-soft` | `0 16px 40px` black .6 | `0 16px 40px` black .14 | floating layers (menus, toasts) |
| `--skeleton` | foreground 8% | foreground 8% | loading bars (`bg-skeleton`) |
| `--overlay` | black | black | dialog backdrop (`bg-overlay/55`) |

---

## Monitor status → tone

Status is always communicated by **colour + text label** (never colour alone), with a dot.

| Monitor state | Tone | Badge | Chart / dot |
|---|---|---|---|
| `UP` | success | `bg-success-surface text-success-ink` | `bg-success` |
| `DOWN` | error | `bg-error-surface text-error-ink` | `bg-destructive` |
| `PENDING` (waiting for first check) | info | `bg-info-surface text-info-ink` | `bg-info` |
| `PAUSED` | neutral | `bg-neutral-surface text-neutral-ink` | `bg-neutral` |
| degradation warning (D5) | warning | `bg-warning-surface text-warning-ink` | `bg-warning` |

`--*-surface` is the tone at 8% over transparent: the Badge and InlineAlert wash. Every
ink-on-wash pair clears 4.5:1 in both themes.

The brand orange is reserved for the **one CTA** and focus: it never means "down" — red does.

## Chart series

`--chart-1` … `--chart-5`, fixed order, never cycled. Slot 1 is the brand.

| Slot | Dark | Light |
|---|---|---|
| 1 | `--brand-base` | `--brand-base` |
| 2 | `#9085E9` | `#4A3AA7` |
| 3 | `#199E70` | `#1BAF7A` |
| 4 | `#3987E5` | `#2A78D6` |
| 5 | `#C98500` | `#EDA100` |

`--chart-context` (`#646469` dark / `#919198` light) is the neutral mark for non-highlighted bars.
Response-time charts use slot 1; uptime bars use the status tones above.

---

## Type scale

Manrope Variable everywhere (`--font-sans`). Fluid sizes via `clamp()` between 390px and 1440px.

| Token | Size | Use |
|---|---|---|
| `--text-title` | 24 → 30 | page title (one per page, `<h1>`) |
| `--text-h3` | 18 → 20 | card / section title |
| `--text-body` | 16 | body copy, fields (16px prevents iOS zoom on focus) |
| `--text-caption` | 14 | secondary text, labels, table cells |
| `--text-micro` | 12 | meta, timestamps, badges |

Numbers in metrics use `tabular-nums`.

## Scales

| Group | Tokens |
|---|---|
| Radii | `--radius-card` 16px · `--radius-button` 12px · `--radius-field` 10px · `--radius-control-sm` 8px · `--radius-pill` 100px |
| Heights | `--control-height-md` 40px (button `sm` and fields from `md`); 44px below `md` (touch target) |
| Z-index | `--z-sticky` 30 · `--z-nav` 50 · `--z-overlay` 60 · `--z-toast` 80 (consume as `z-(--z-nav)`) |

---

## Controls

**Button** (`shared/ui/Button.tsx`).
- Rounded rectangle `rounded-(--radius-button)`; `xs`/icon-sm use `--radius-control-sm`.
- `default` is the CTA: `--cta-fill` (a vertical brand gradient that keeps the white label
  ≥ 4.5:1), the `--cta-edge` ring and `--cta-shadow`, brightness on hover.
- **One CTA per view or section.** A repeated action in a list, card or row is `outline`.
- `destructive` fills with `--destructive-fill` (dark: error 85% over black, white label 5.1:1).
- Press: `active:scale-[0.97]` (motion-safe), 120ms in, 180ms release.
- Targets: 44px below `md`, 40px from `md`.
- Focus: 2px `--ring` outline at offset 2 (`focus-visible` only).
- Loading: the label stays, a spinner replaces the icon, `aria-busy`, the button is disabled.

**Fields** (`Input`, `PasswordInput`, `FormField`).
- The well: `--field-fill` (card in light, `--surface-sunken` in dark), `border-input` edge,
  `--radius-field`, 16px text, 44px tall below `md` (40 from `md`).
- Focus: border in `--ring` plus a 1px shadow of it — a 2px ring that moves nothing.
- Invalid: `aria-invalid` → border and ring in `--destructive`; the message below the field in
  `text-error-ink`, linked by `aria-describedby`.
- The password eye is a 44px target with an `aria-label`.
- Labels are always visible (no placeholder-as-label).

**InlineAlert.** Tone wash + ink + icon, `role="alert"` for errors. Used for form-level errors and
notices ("Сессия истекла, войдите снова").

**Card.** `bg-card`, `border-card-border`, `--radius-card`, `--shadow-card`. Never card-in-card.

---

## Screen states (TZ B6)

Every screen handles three states with the shared components (`shared/ui/states`):

| State | Component | Rule |
|---|---|---|
| loading | `LoadingState` / skeletons | keep the layout: skeleton bars where content will be; never a blank page |
| empty | `EmptyState` | icon + one sentence + the one action that fills it ("Добавить монитор") |
| error | `ErrorState` | what happened in plain words, **Повторить** button, the `X-Request-ID` in small text for support |

Route-level errors (a thrown render error, a failed loader) render `ErrorState` through the
router's error component — **never a white screen**.

---

## Auth pages

`modules/auth/ui/AuthShell.tsx`: the page's `<main>`, the logo and theme toggle on top, one `Card`
(max 400px) with the form and the one CTA. Top-aligned below `sm` (the keyboard opening never
moves the card), centred from `sm`, `min-h-dvh`, safe-area padding. Secondary actions ("Нет
аккаунта? Зарегистрироваться") are 44px rows in `--primary-ink`. Autocomplete attributes are set
(`email`, `current-password`, `new-password`).

---

## Motion

No animation library: CSS transitions only.

| Token | Value | Use |
|---|---|---|
| `--motion-ease-out` | `cubic-bezier(.22, 1, .36, 1)` | every enter and exit (`ease-brand-out`) |
| `--motion-duration-fast` | 180ms | colour/state transitions; Tailwind's default duration |
| `--motion-duration-press` | 120ms | press-in scale |
| `--motion-duration-overlay` / `-exit` | 200 / 150ms | dialog, toast |

- Only `opacity`, `translate`, `scale` animate; no layout properties.
- An exit is faster than its entry.
- `prefers-reduced-motion: reduce` drops movement (`motion-safe:`); spinners keep turning at 1.5s
  (a frozen spinner reads as a hang).

---

## Layout and mobile

- App shell: sticky header (`bg-card`, `border-b`), content `max-w-6xl`, 16px gutter on phones,
  24px from `md`.
- Everything works at 360px width: no horizontal scroll, tables become stacked rows below `md`.
- Touch targets ≥ 44px below `md`.

## Dates and numbers

Dates and durations go through `shared/lib/format.ts` (`Intl` with the `ru-RU` locale), never a
hand-rolled `toLocaleString` in a component. Response times in `мс`, uptime with up to 2 decimals.

## Accessibility checklist

- Text AA (4.5:1), non-text edges 3:1 — the token tables above hold the pairs.
- Every control reachable by keyboard, visible `focus-visible` ring.
- Status never by colour alone; icons that carry meaning have labels.
- Form errors announced (`role="alert"` / `aria-describedby`).

## Known limitations

- **Text on the solid brand orange fails AA below 18.66px bold** (`#D84A1B`: white 4.27:1).
  That is why the CTA uses `--cta-fill` (a darker gradient), and `--primary` is never a text
  background elsewhere.
- In light, chart slots 3 and 5 sit under 3:1 on white: a chart using them needs direct labels.
