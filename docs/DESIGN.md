# Design System

Single source of truth: `app/globals.css` for the tokens, and the partials it
`@import`s from `app/styles/` for the component-layer CSS (`materials.css`,
`motion.css`, `base.css`, `dock.css`, `sheet.css`). Everything below describes
what is already in those files — if the two disagree, the files win and this doc
is stale.

Full rationale and mockup provenance: `docs/plans/b2c-landing-redesign.md`.

---

## Layers

```
primitives   :root, first block      raw values, never used by components
semantics    :root / html.dark       --primary, --card, --surface-elevated, … (app)
             .dark                   the landing's frozen snapshot (ADR 0012)
utilities    @theme inline           --color-*, --radius-*, --shadow-*, --blur-*
components   bg-primary, text-h2     semantic utilities only
```

**Rule: no colour literal in a component.** No `#hex`, no `rgb()`, no
`bg-[#…]`. If a value is missing from the token layer, add the token.

**Rule: primitives are not consumed by components.** `--brand-base` is only
ever referenced by a semantic token. Components use `bg-primary`.

---

## Token source → CSS custom property

The primitive layer is the supplied Ant-style design system (dark export,
2026-07-28). Every row is verbatim. **Do not invent ramp steps** — request them.

| DS token | Value | CSS primitive | Consumed by |
|---|---|---|---|
| `colorPrimaryBg` | `#2B1611` | `--brand-bg` | `--primary-surface` (dark) |
| `colorPrimaryBgHover` | `#441D12` | `--brand-bg-hover` | `--primary-surface-hover` |
| `colorPrimaryBorder` | `#592716` | `--brand-border` | `--primary-border` |
| `colorPrimaryBorderHover` | `#7C3118` | `--brand-border-hover` | — |
| `colorPrimaryHover` | `#E87040` | `--brand-hover` | `--primary-hover` |
| `colorPrimaryBase` | `#D84A1B` | `--brand-base` | `--primary`, `--ring`, `--accent` (light), `--chart-1`, `--sidebar-primary` |
| `colorPrimaryActive` | `#AA3E19` | `--brand-active` | `--primary-active` |
| `colorPrimaryTextHover` | `#F3956A` | `--brand-text-hover` | — |
| `colorPrimaryText` | `#F8B692` | `--brand-text` | `--primary-text`, glass fill @ 27% |
| `colorPrimaryTextActive` | `#FAD4BC` | `--brand-text-active` | — |
| `colorErrorBg` … `colorErrorTextActive` | 10 steps | `--error-bg` … `--error-text-active` | `--destructive`, `--error` |
| `colorWarning` | `#d89614` | `--warning-base` | `--warning` (dark) |
| `colorSuccess` | `#49aa19` | `--success-base` | `--success` (dark) |
| `colorInfo` | `#1668dc` | `--info-base` | `--info`, `--chart-4` |
| `colorTextBase` | `#ffffff` | `--seed-text-base` | `--foreground` (dark, via `--ink-0`) |
| `colorTextLightSolid` | `#ffffff` | `--seed-text-light-solid` | `--primary-foreground` (light) |
| `colorBgBase` | `#000000` | `--bg-base` | nav + drawer surface only |
| ~~`colorPrimary`~~ | ~~`#1668dc`~~ | — | **ignored** — Ant's un-overridden default; `colorPrimaryBase` is authoritative |
| ~~`colorError`~~ | `#e84749` | — | redundant with `colorErrorBase` |

Two documented deviations from the plan's §11.0 naming:

- `colorTextBase` / `colorTextLightSolid` are prefixed `--seed-` because
  `--text-*` is Tailwind v4's **font-size** namespace. A bare `--text-base:
  #ffffff` in `:root` would override Tailwind's `--text-base: 1rem` and break
  every `text-base` utility.
- Z-index tokens produce no utilities (Tailwind v4 has no z-index namespace).
  Consume them as `z-(--z-nav)`.

Mockup-only primitives (absent from the DS): `--brand-icon`,
`--brand-gradient-end`, `--brand-shade`, the `--ink-*` ladder, `--gold-400`.
Each carries a `src:` comment pointing at the Figma export line.

`--gold-400 #EFC047` (review stars) and `--warning-base #d89614` are different
values with different jobs. Do not merge them.

---

## Themes

The public pages are **dark-only**, pinned with a static `dark` class on their
route-group layouts. No provider, no JS. The app (portal, admin, auth) is
dark-first with a coherent light theme: it opts in via `ThemeSwitcher`,
persisted as a two-state cookie and resolved on the server — see **ADR 0006**
for the mechanism and the accepted trade-off (the theme does not follow the OS
setting; light is the default).

`.dark` is rendered onto `<html>`, which is why portaled overlays inherit the dark
tokens without needing the `body:has(> .dark)` escape hatch that the landings'
wrapper-div approach requires.

### Landing snapshot and app dark (ADR 0012)

The landing and the app no longer share a dark theme. There are three token
blocks, and each surface resolves its own:

| Block | Holds | Resolved by |
|---|---|---|
| `:root` | primitives + light values | the app under the light cookie |
| `.dark, body:has(> .dark), html.dark:has(> body > .dark)` | the **landing snapshot**: every theme token a public page reads, frozen at its current value, including the `:root`-only radii, blurs, glass, gradients, `--shadow-focus`, `--shadow-screen` and `--sheet-blur` | every public page, under either cookie; also the app's dark starting point |
| `html.dark` | the **app's dark values** (0,1,1 beats `.dark` on `<html>`) | portal, admin and auth under the dark cookie |

- **App dark values go in `html.dark`, never in the snapshot.** On a public
  page, the wrapper, `<body>` (portaled overlays) and, under the dark cookie,
  `<html>` (the overscroll background) all re-declare the snapshot. None of
  them can see `html.dark`.
- **App light values go in `:root`.** Public pages read no light value, with
  one exception. Under the light cookie, a public page's `<html>` still paints
  the light `--background` in the overscroll band. This is open in ADR 0012.
- **The snapshot shadows `:root` in the app's dark theme too.** Retuning one of
  its `:root`-only tokens (`--radius`, a `--blur-*`) for both app themes takes
  `:root` and `html.dark`.
- **`html.dark` never overrides a primitive the snapshot does not restate.** A
  public page reads primitives straight from `<html>`.
- **Never hand-write `var(--color-*)`** in a component a public page renders.
  Tailwind computes those on `<html>`. Use the utility or the semantic token.

The contrast test resolves all three cascades (light, landing snapshot, app
dark) and fails on either leak above. The public e2e is the pixel proof.

**The primitive rule.** A shared primitive the landing also renders (Button,
Drawer, ResponsivePopover, LanguageSwitcher, Skeleton, Typography, Section,
AmbientGlow, ScrollRow) changes its look only through a token, or through a
variant the landing does not use. A token it starts reading gets a snapshot
entry at the value that keeps the landing identical; the `--sheet-*`,
`--glass-menu-*`, `--radius-button`, `--control-height-md` and `--skeleton`
snapshot entries exist for exactly that reason.

Behaviour, which no screenshot catches, goes through two variants in
`globals.css`: `app:` (`:not(body:has(> .dark) *)`) and its inverse `public:`.
A public page is the one whose `.dark` wrapper is a direct body child, and its
portaled overlays are body children too, so `app:` keeps new behaviour off
both, including `:active` and `:focus-visible`. The `app:` selector outranks a
plain utility, so use it for behaviour call sites do not override (press,
focus, reduced-motion fades), not for looks they do (radius goes through a
token). Plain CSS scopes a global rule the same way with
`:not(body > .dark *)` (the touch baseline in `base.css`).

The dark variant is `@custom-variant dark (&:is(.dark *))` — a **descendant**
selector. The `.dark` element itself is not matched by `dark:` utilities.
Token-driven colours are unaffected; be aware before writing a `dark:` utility.
Colour is token-driven; that is the point. The one allowed use of `dark:` is
a raster logo swap (`dark:hidden` / `hidden dark:block` on the two `<Image>`
logos in `AdminSidebar`, `PortalSidebar` and the auth shell): an image cannot
read a token. Anything else takes a token.

Dark is not inverted light. The app's dark theme (direction C, "Graphite",
below) builds depth from lightness plus light: a lit top edge and a real offset
shadow on cards. The landing snapshot keeps its own rule, where `--shadow-card`
is a white glow because the landing's warm page swallowed a black shadow.

### The app's dark surface ladder (direction C, "Graphite")

A cool neutral ladder with no hue, so the brand orange is the only warm thing
on screen. Dark values live in `html.dark`, light in `:root`; the landing never
sees either.

| Token | Dark (`html.dark`) | Light (`:root`) | Role |
|---|---|---|---|
| `--surface-sunken` | `#101012` | `#f4f4f5` | table stripes, input wells |
| `--background` | `#0B0B0C` | `#f4f4f5` | the page |
| `--sidebar` | `#111113` | = `--card` | the desktop sidebar |
| `--card` | `#18181A` | `#ffffff` | cards, headers |
| `--surface-elevated` | `#232326` | `#ffffff` | anything floating above a card; `--popover` and dark `--secondary` follow it |
| `--muted` | `#2A2A2E` | `#ededef` | the universal hover, and quiet chips |
| `--surface-warm` | = `--card` | = `--card` | one card tone |

In dark the ladder reads sunken < background < card < elevated < muted. In light,
sunken is the page itself: sunken = background < card.

The rest of the semantic layer, which the app reads unchanged from the
snapshot in dark unless noted:

| Token | Role |
|---|---|
| `--primary` (`--brand-base`), `-hover`, `-active`, `-border`, `-text`, `-surface`, `-surface-hover` | brand fill and its ramp roles; the fill mid-tone is never text (use `--primary-ink`) |
| `--secondary` (dark = `--surface-elevated`, light `#1d1d20`) | the `secondary` Button and the inverted pill kicker |
| `--accent` (`--brand-base` light, `--brand-icon` dark) | the selection tint, and `Text tone="accent"` on the landing |
| `--destructive`, `--error` and the `--success`, `--warning`, `--info`, `--neutral` fills, each with `-foreground` | state fills; `--neutral` is graphite in the app (`#6e6e75` / `#8e8e95`) and `#1677ff` in the snapshot |
| `--*-surface` (success, warning, info, neutral, destructive) | each tone at 8% over transparent: the Badge and InlineAlert wash |
| `--success-icon-foreground` | a white glyph on `--success`, both themes (below) |
| `--overlay` | the default `DialogBackdrop` dim (`bg-overlay/55`) and the snapshot's sheet scrim; the alert and sheet scrims are `--glass-*-scrim` |
| `--subtle`, `--subtle-foreground` | `Text tone="subtle"` |
| `--sidebar*` | the desktop sidebar; the active row is `--sidebar-accent` (dark = elevated) |
| `--surface-contrast`, `--surface-translucent`, `--surface-veil`, `--surface-dark`, `--foreground-muted` | landing-owned; the app uses `--muted-foreground`, never `--foreground-muted` |

`--success-foreground` and `--warning-foreground` are black in every block:
white on those fills fails AA (3.60:1 and ~2.00:1 in light). A bare glyph on
`--success` takes `--success-icon-foreground` (`#ffffff`) so it matches the
white icons of the other tones: the success toast's icon and the field status
badge. White clears the 3:1 non-text bar in light (3.60:1) and sits just under
in the snapshot (2.98:1), so the token stays on decorative glyphs whose state
the text or the control's border already carries.

### Text ramp

| Role | Token | Utility | Dark | Light |
|---|---|---|---|---|
| primary | `--label-primary` (`--foreground` and every `*-foreground` on a surface) | `text-foreground` | `#F5F5F7` | `#111113` |
| secondary | `--label-secondary` (`--muted-foreground`) | `text-muted-foreground` | `#AEAEB4`, 8.0:1 on a card | `#55555C` |
| tertiary | `--label-tertiary` | `text-label-tertiary` | `#919198` | `#67676E` |
| brand as text | `--primary-ink` | `text-primary-ink` | `--brand-hover` | `--brand-active` |
| error as text | `--error-ink` | `text-error-ink` | `--error-hover` | `--error-base` 78% over black |
| success as text | `--success-ink` | `text-success-ink` | `--success` 80% over white | `--success` 70% over black |
| warning as text | `--warning-ink` | `text-warning-ink` | `--warning` | `--warning` 50% over black |
| info as text | `--info-ink` | `text-info-ink` | `--info` 65% over white | `--info` 80% over black |
| neutral as text | `--neutral-ink` | `text-neutral-ink` | `--neutral` 70% over white | `--neutral` 75% over black |

- Dark tertiary is `#919198`, not the contract's `#8E8E95`, which measured
  4.39:1 on `--muted`, the hover fill a meta line sits on; `#919198` clears it
  at 4.57:1.
- Tone as text takes the `*-ink` step, never the fill mid-tone
  (`text-primary`, `text-destructive`, `text-success`): the fills read 1.8:1
  (warning) to 4.6:1 on their own wash. `Text tone="success" | "danger" |
  "accent"` does this in the app (`app:text-success-ink`, `-error-ink`,
  `-primary-ink`); the landing keeps the fills.
- The contrast test asserts secondary and tertiary on every text surface
  (background, card, popover, elevated, sunken, muted, sidebar) in both app
  themes, plus both inks on a card.

### Edges and depth

| Token | Dark | Light | Role |
|---|---|---|---|
| `--border` | white .10 | black .08 | hairlines |
| `--border-strong` | white .18 | black .14 | edges on a tinted or translucent surface |
| `--input` | white .34 | black .42 | **the field edge**: inputs, checkbox, switch track. Clears the 3:1 non-text bar on a card (3.12:1 dark, 3.04:1 light) and in a dark sunken well (3.09:1) |
| `--fill-grouped` | white .06 | = `--card` | an inset grouped row's fill (`bg-fill-grouped`) |
| `--separator-grouped` | white .07 | black .07 | its row separator (`border-separator-grouped`) |
| `--card-border` | white .08 | black .07 | a card's edge (`border-card-border`) |
| `--radius-card` | 16px | 16px | a card's radius; the landing snapshot holds 20px |
| `--skeleton` | `--label-primary` 8% | `--label-primary` 8% | a loading bar (`bg-skeleton`); the snapshot holds the landing's `muted/60` |
| `--shadow-card` | inset top white .07, then `0 1px 2px` black .6 and `0 10px 24px -14px` black .9 | the same two offset shadows at .06 / .25, no inset | card depth, with the lit top edge built in |
| `--shadow-soft` | `0 16px 40px` black .6 | `0 16px 40px` black .14 | the cast shadow under a floating layer |

Light drops the inset specular because a white line on a white card is
invisible. `--shadow-card` is also read by buttons, avatars, the dialog and the
tooltip, so in dark they pick up the same faint lit top edge.

### The landing snapshot's values

The snapshot keeps the landing's own dark: a warm `#0D0402` page (`--ink-950`)
under `#282828` cards (`--ink-850`), where art dominates. Its D1–D10 fixes
(an elevation ladder that reads sunken < background < card < elevated, a
visible `--muted` hover, black `--overlay`, a cast `--shadow-soft`,
`--border` .12 / `--border-strong` .22, black success and warning labels) are
commented at each token in `globals.css`. It never changes (ADR 0012), so its
values are left to the file.

### Categorical data scale

`--data-1-fg` / `--data-1-surface` / `--data-1-border`, through `--data-7-*`.

For badges and series that encode a **category**, not a state — state stays on
`--success` / `--warning` / `--error` / `--info` / `--neutral`. Light values are
the Tailwind `-700` / `-50` / `-200` triples they replaced (amber, blue, sky,
orange, rose, cyan, red), so light rendering is unchanged; dark surfaces are the
hue mixed into `--card` with the light end of the hue as the ink. Every pair
clears 4.5:1 in both themes, enforced by
`__tests__/app/globals-contrast.test.ts`.

Consumer: the RFM segment badges (`features/portal/components/clients/constants.ts`).

### Chart series

`--chart-1` … `--chart-5` hold the categorical series colours, in fixed order,
never cycled. Slot 1 is the brand in both themes.

| Slot | Dark | Light |
|---|---|---|
| 1 | `--brand-base` | `--brand-base` |
| 2 | `#9085E9` | `#4A3AA7` |
| 3 | `#199E70` | `#1BAF7A` |
| 4 | `#3987E5` | `#2A78D6` |
| 5 | `#C98500` | `#EDA100` |

Both sets pass the `dataviz` validator on the card (lightness band, chroma,
adjacent CVD and normal-vision separation). In dark every slot is at least 3:1
on `#18181A`. In light, slots 3 and 5 sit under 3:1 on white (2.82:1, 2.17:1),
so a chart that uses them ships direct labels or a table view. The categorical
`--data-*` scale needs no retune: its dark surfaces mix into `--card`, so they
follow the new ladder, and the contrast test holds every pair at 4.5:1.

`ChartBarCard` is one series, so it never reaches slots 3 and 5. Its
highlighted bar (`isActive`) is `--chart-1`; the other bars are
`--chart-context` (`#919198` light, `#646469` dark), a neutral context mark at
3:1 on the card. The old brand tint of the card read 1.35:1 in dark. With no
highlight, every bar is `--chart-1`. Bars have a 4px rounded data end, square
on the baseline; the tooltip is `bg-popover`. The admin's `PlatformStatsSection`
is the only multi-series chart, and it plots status colours rather than the
palette.

---

## Type scale

`--text-display / -display-sm / -h2 / -h3 / -body-lg / -lead / -body /
-caption / -micro`, each with a matching `--line-height` of 1.2. All fluid via
`clamp()` interpolated between the two mockup anchors (390px and 1440px) —
there are no other anchors, so do not add breakpoint-specific font sizes.
(`--text-caption` and `--text-micro` are flat: the mockups hold them at one
size at both anchors.)

| Token | 390 → 1440 | `Heading level=` / `Text size=` | Source |
|---|---|---|---|
| `--text-display` | 44 → 72 | `display` | uikit:78 / 145 |
| `--text-display-sm` | 44 → 58 | `display-sm` | b2b d:689 / m:171 |
| `--text-h2` | 28 → 40 | `section` | uikit:101 / 168 |
| `--text-h3` | 18 → 28 | `card` | uikit:123 / 190 |
| `--text-body-lg` | 16 → 32 | `body-lg` | uikit:213 / 235 |
| `--text-lead` | 16 → 24 | `lead` | b2b d:732, 6710 / m:210 |
| `--text-body` | 16 → 18 | `body` | uikit:213 / 235 |
| `--text-caption` | 14 (flat) | `caption` | uikit |
| `--text-micro` | 10 (flat) | `micro` | b2b d:664, 3367, 5957 |

`display-sm`, `lead` and `micro` arrived with the B2B landing, which uses a
58px h1, a 24px lead and a 10px label the B2C scale does not carry. They are
additive `@theme` entries — generic sizes, not `/business`-scoped, because a
`/business`-only font scale would fragment `Heading`.

Font: **Inter** on the landing (`--font-inter`, D-1 substitute for SF Pro
Text), **Manrope** everywhere else.

---

## Scales

| Group | Tokens |
|---|---|
| Radii | `--radius` 14px, with Tailwind's `rounded-sm` … `rounded-4xl` at ×0.6 … ×2.6 of it · `--radius-card` 16px (app; the snapshot holds 20px) · `--radius-button` 12px (snapshot 6px) · `--radius-field` 10px · `--radius-control-sm` 8px (the `xs` button, the portal and admin header's back chip) · `--radius-segment` 10px (a SegmentedTabs segment and its thumb: the track's r12 less its 2px inset) · `--radius-group` 20px · `--radius-glass` 24px · `--radius-accordion` 16px · `--radius-review` 18px · `--radius-frame` fluid 40→80px · `--radius-pill` 100px · the glass scales carry their own `--glass-*-radius` |
| Blur | `--blur-glass` 4px · `--blur-veil` 19px · `--blur-glow` 77px · `--blur-ambient` 100px · `--blur-ambient-md` 135px · `--blur-ambient-lg` 150px (all landing); the app's blurs are the `--glass-*-blur` tokens |
| Z-index | `--z-base` 0 · `--z-decor` 1 · `--z-content` 2 · `--z-sticky` 30 · `--z-dock` 40 · `--z-nav` 50 · `--z-overlay` 60 · `--z-drawer` 70 · `--z-toast` 80 |
| Shadows | `--shadow-card` · `--shadow-card-hover` · `--shadow-soft` · `--shadow-nav` · `--shadow-frame` · `--shadow-screen` · `--shadow-focus` · `--shadow-review` (snapshot-only; its `shadow-review` utility has no consumer) · `--cta-shadow` |
| Gradients | landing: `--gradient-hero` (text-clip) · `--gradient-cta` · `--gradient-cta-soft` · `--gradient-glass-icon` / `-strong` (hover) / `-flat` (on a brand field), with the `bg-gradient-hero`, `bg-gradient-cta` and `bg-gradient-cta-soft` utilities. App: the whitelist under Glass |
| Layout | `--space-section` (the landing's fluid section rhythm) · `--portal-bottom-nav-height` 66px, `-gap` 8px, `-reserved-space` (height + gap + the bottom safe area: what the portal content pads by) · `--control-height-md` 40px (snapshot 36px) |
| Fonts | `--font-sans`, `--font-heading`, `--font-mono`: Manrope in the app; the landing swaps `--font-sans` to Inter |

`--blur-glass: 4px` is an assumption (A3 / D-2): Figma exported the `glass-1`
fill but dropped its background blur, so this is the nearest blur the same
export does emit. One-token change if design corrects it. Motion tokens are
under Motion.

`--shadow-frame` and `--shadow-screen` hold **bare** shadow values (no
`drop-shadow()` wrapper) so the `drop-shadow-frame` / `drop-shadow-screen`
utilities can wrap them.

---

## Glass

Two sets of utilities live in `app/styles/materials.css`: the app's glass family,
and the landing's glass. They share the fallback discipline and nothing else.

### The app's glass: one family in four scales

The floating layer of the portal, admin and auth: the dock, sheets, alerts and
menus. Glass never goes on the content layer (cards, stat tiles, lists, tables),
and never on a public page. One neutral material, four scales, plus the modal
scrims. Values come from direction contract C.

| Utility | Consumer | Fill dark / light | Opaque fill dark / light | Blur | Radius |
|---|---|---|---|---|---|
| `glass-capsule` | the dock | `rgb(30 30 33 / .38)` / white .44 | `#1E1E21` / `#FAFAFA` | 12, saturate 150% | capsule |
| `glass-menu` | popover, dropdown, select; tooltip and toast (opaque) | `rgb(36 36 40 / .72)` / white .72 | `#242428` / `#FAFAFA` | 20, saturate 180% | 14 |
| `glass-alert` | the centred confirm | `rgb(40 40 44 / .62)` / white .66 | `#28282C` / `#FAFAFA` | 24, saturate 180% | 16 |
| `glass-sheet` | drawers, through `.sheet-glass` | `rgb(26 26 29 / .96)` / `rgb(244 244 245 / .97)` | `#1A1A1D` / `#F4F4F5` (the grouped background) | **none** | 24 |
| `glass-scrim` | behind a sheet | black .40 / .20 | (same) | 24 | — |
| `glass-alert-scrim` | behind an alert | black .36 / .20 | (same) | 16 | — |
| `.glass-bar` | the portal and admin header bars (The portal shell) | `--background` 70% / 72% | `--background` | the capsule's 12, 150% | — |

Fill opacity and shadow depth rise with the scale (HIG: a larger surface is more
opaque and casts a deeper shadow). The sheet slides, and a moving
`backdrop-filter` re-samples every frame, so the sheet has no blur of its own:
its static scrim carries the blur, and the near-opaque sheet slides over it.

**Tokens.** Each scale is a token set in `globals.css`, `--glass-<scale>-*`:

| Token | Role |
|---|---|
| `-fill` | translucent fill, used only inside the gate |
| `-fill-solid` | the opaque fill: the default and every fallback |
| `-blur`, `-saturate` | the `backdrop-filter` (not on the sheet) |
| `-edge` | the gradient of the 1px specular ring |
| `-sheen` | a top gradient layer over the fill (`none` where the contract has none) |
| `-highlight` | inset speculars (top edge; the capsule also has a bottom one) |
| `-shade` | the inner shade's colour (`transparent` where the contract has none) |
| `-shadow` | the cast shadow |
| `-radius` | the corner radius |

Plus `--glass-scrim` / `--glass-scrim-blur`, `--glass-alert-scrim` /
`--glass-alert-scrim-blur`, `--glass-alert-cancel` / `-cancel-hover` (the fill
of the alert's Cancel pill). Every highlight is a per-theme token: the old dock's white
literals are what made it read as a light capsule in dark. Paint differs per
theme (`:root` light, `html.dark` dark); blur, saturation and radius are the
same in both, so they live in `:root` once. The capsule is the lightest
scale: the contract's .52 / .62 fill at blur 16 read icy on a phone, so its
fill, frost, sheen (white .22 light / .04 dark) and ring are lower than the
other scales'. The scroll edge, not the fill, keeps its labels legible. These
are app-only names: the landing snapshot never restates them and no public page
reads them (ADR 0012). The one exception is `--glass-menu-*`, which the snapshot
restates at the landing popover's old look (The menu scale).

**Structure.** Each scale class points private `--_glass-*` slots at its tokens,
and one set of rules paints all four: `position: relative`,
`isolation: isolate`, the sheen over the fill, and the highlight, inner shade
and cast shadow in one `box-shadow`. The rules sit in `@layer components`, so a
consumer's utilities win. A bottom sheet adds `rounded-b-none`, for example.

**The gate.** The default is opaque (`-fill-solid`). The translucent fill and
the blur switch on only inside `@supports (view-transition-name: none)`, which
is true from Safari 18.0 and Chrome 111. It is a proxy on purpose: the
production build rewrites a direct `@supports (backdrop-filter …)` test to
accept iOS 17's prefixed path, and iOS 17 cannot blur late-mounted layers or
the area under a radius (`research/platform-and-hig.md` §3.5). Below the gate
the app is fully usable with opaque surfaces. The build leaves this gate alone
and adds `-webkit-backdrop-filter` and `-webkit-mask` to the output.

**The edge ring.** A 1px band on `::after`: `padding: 1px`,
`border-radius: inherit`, the edge gradient as its background, and
`mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)`.
The content box's radius is the border radius minus the padding, so the band
keeps a uniform width round every corner. The gradient exists only in the band,
so it never shows through a translucent fill (the `padding-box`/`border-box`
trick does). The ring sits at `z-index: 1` above content. Because an absolute
`::after` scrolls with its own scroll container's content, put the utility on a
surface that does not scroll, and scroll an inner element. `cta-edge` puts the
same ring on an opaque control, reading `--cta-edge`.

**The fallback quartet.** Contrast never depends on the blur. The contrast
matrix proves `--label-primary`, `-secondary` and `-tertiary` on every
`-fill-solid`, `--label-primary` on the alert's Cancel fills, and primary,
secondary and error ink on both alert tones, in light and app dark.

| Condition | Surfaces | Scrims |
|---|---|---|
| No gate (iOS ≤ 17, old engines) | `-fill-solid` + sheen, no blur | the dim, no blur |
| `prefers-reduced-transparency: reduce` | `-fill-solid`, no sheen, no blur | the dim, no blur |
| `prefers-contrast: more` | as above, and the ring becomes `--input` (the 3:1 control edge) | the dim, no blur |
| `forced-colors: active` | `Canvas` + `1px CanvasText` border, ring hidden, no shadow | no blur |

`prefers-reduced-transparency` never fires on iOS; `prefers-contrast: more`
(Increase Contrast) does. The `/dev/ui` Materials section holds all four scales
and both scrims over a busy backdrop. The proofs of the quartet are in
`.scratch/mobile-glass-refresh/research/after/08/`.

**The budget: at most three blurred surfaces visible at once on mobile.**

| State | Blurred surfaces |
|---|---|
| Idle | header bar + dock = 2 |
| Menu open | header bar + dock + menu = 3 |
| Sheet open | scrim = 1 (the sheet has none; bar and dock drop to their opaque fill) |
| Menu over a sheet | scrim + menu = 2 |
| Alert open | alert scrim + alert = 2 |
| Sheet over a sheet | the top scrim = 1: a scrim with a later scrim after it drops its blur (`sheet.css`, app only; the landing never stacks sheets) |
| Alert over a sheet | sheet scrim + alert scrim + alert = 3, the ceiling |

Rules every consumer keeps:

- **A blurred layer fades.** Put `opacity` on the blurred element itself. It
  never translates, and any scale goes on an inner wrapper. Never interpolate
  `backdrop-filter`, and never set `will-change` on a blurred layer. A scrim
  fades its opacity at a fixed radius.
- **No Backdrop Root above a glass layer.** `opacity < 1`, `filter`, `mask`,
  `clip-path`, `backdrop-filter`, `mix-blend-mode` or `view-transition-name` on
  an ancestor empties the blur. `transform`, `position: fixed` and `z-index`
  are safe.
- **No glass on glass.** A modal scrim covers the dock and the header bar and
  already blurs them, so under a scrim both swap their blur for their opaque
  fill (see The dock below), which takes them out of the count. Never dim the
  dock's wrapper: opacity there empties the blur.
- Text on glass uses the label ladder at one weight step heavier; colour sits
  on a solid layer, never as glyphs on glass.

**Gradient whitelist.** Gradients appear only on the specular rings (every
`-edge`, and `--cta-edge`), the capsule, sheet and alert sheen, the CTA fill,
the hero stat's corner glow and the scroll edge behind the dock. They never go
on the page, card fills, text or data marks.

| Token | What | Consumer |
|---|---|---|
| `--cta-fill` | vertical; light from `--brand-base` 85% to 60% over `--brand-active` (the full ramp reads muddy on paper; white 4.61:1 at the label's worst glyph row), dark `--brand-base → --brand-active` | the primary button |
| `--cta-edge`, `--cta-shadow` | its ring (`cta-edge`) and cast shadow | the primary button, the alert's confirm |
| `--hero-stat-glow` | a radial brand glow in the top-right corner, a background layer over `--card` | the one hero stat |
| `--glass-lens-glint` | a 1px brand line over a radial glow | the dock's active tab |
| `--scroll-edge` | `--background` fading up behind the dock | the dock |

These are new app-only names. The landing's `--gradient-cta` is a different
gradient and stays its own.

**Retired tokens.** The landing's sheets still read `--portal-dock-shadow`,
`--sheet-outline`, `--sheet-top-highlight`, `--sheet-inner-shade` and
`--sheet-blur` through the snapshot. The snapshot's other `--portal-dock-*` and
`--portal-dock-lens-*` tokens have no reader; they stay because the snapshot
is frozen.

### The dock

`PortalBottomNav` is the capsule scale's consumer. `glass-capsule` sits on
`.portal-bottom-nav__surface`, the capsule element itself, which then owns the
fill, the blur, the ring, the radius and the fallback quartet.
`styles/dock.css` adds the layout, the tab lens and the inks.

| Metric | Portal | Client app |
|---|---|---|
| Capsule | 66 tall (`--portal-bottom-nav-height`), a pill, at most 512 wide, 16 from the screen sides, 8 + the safe area from the bottom | 66, r44, 16 sides |
| Inner padding | 4, so the lens pill is concentric with the capsule | — |
| Items | 3 or 4 columns; each at least 44×44 (79×58 at 390 wide) | — |
| Icon, gap, label | 24, 6, 11 / 600 | 24, 6, 10 / 600 |

The label is 11, not the client's 10: 11 is the HIG's floor for legible text.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--glass-lens-fill` | white .72 | white .08 | the active tab's lens, under the capsule's sheen |
| `--glass-lens-shadow` | ring black .06, soft drop | ring white .08, top specular white .14, drop black .30 | the lens's edge and lift |
| `--glass-lens-glint` | a 1px line of `--dock-icon-active` at 50%, fading at both ends, over a 14% radial glow | the full-strength line over a 32% glow | the brand glint at the lens's lower rim |
| `--dock-ink` | `--label-primary` at 60%: 4.86:1 on the opaque fill | same: 6.30:1 | inactive icon and label |
| `--dock-icon-active` | `--brand-base`: 4.22:1 on the lens | `--brand-hover`: 4.28:1 | active icon, the profile avatar's ring |
| `--scroll-edge` | `--background` | same (resolves per theme) | the scroll edge behind the dock |

The active label is `--label-primary` (18.6:1 light, 12.1:1 dark on the lens).
The lens never blurs, since it sits on glass, and it is never brand-tinted: the
brand arrives as the glint and the icon. Dark has no white glare: every
specular is a token, and the old hard-coded white highlights are gone. The
contrast matrix holds the three dock pairs in light and app dark (the icon at
the 3:1 non-text bar).

**Under a modal scrim.** While a sheet, dialog or confirm alert is open (the
`drawer-content`, `dialog-content` or `confirm-dialog-content` slot is in the
body), the capsule takes its `-fill-solid` and `backdrop-filter: none`. A new
modal popup adds its slot to that selector in `dock.css`. The fill fades over
`--motion-duration-fast`. The blur switches off in one step once the fill is
opaque, after a delay of the same length, and back on in one step at close,
before the fill fades back. Its radius never interpolates.

**The scroll edge.** `[data-scroll-edge]::before` paints
`linear-gradient(to top, var(--scroll-edge) 45%, transparent)` from 24 above
the capsule down to the screen edge, behind the capsule (HIG: a scroll edge
effect, not an overlay and never a divider). It has no blur and sits inside
the nav, so it is no ancestor of the glass. Content fades into the page colour
under the dock, so the labels hold over any content without a heavier fill:
measured in every `/dev/ui/portal` frame with the labels hidden and the
background sampled, inactive labels hold at least 6.61:1 dark and 4.84:1 light
over busy colour, page content and inverse content alike (2.2:1 dark without
the edge). The matrix asserts `--dock-ink` on the translucent fill over
`--scroll-edge` as well as on the opaque fill. The shell's nav and the gallery's dock frames share the
`data-scroll-edge` attribute; a positioned host needs its own stacking context
(the fixed nav has one through its z-index, a gallery frame takes `isolate`).

The content pads by `--portal-bottom-nav-reserved-space`. Disabled items sit at
opacity .4 (`role="link"` with `aria-disabled`). Items take the `--ring` focus
outline (a pill, following the item's radius), the `:active` press scale
(`--motion-duration-press`) and hover on fine pointers only. The active glyph
lifts 1px.
The lens appears instantly: a tab tap is a 100+/day action, and the lens
re-mounts per route, so it cannot slide. Reduced motion drops the
transitions. Increase Contrast gives the lens the `--input` ring, like the capsule.
The profile avatar is `Avatar size="xs"` (24), `aria-hidden`, so the link reads
its label only. The dock never minimises on scroll.

### The portal shell

The portal shell is a glass-bar header, the dock (above) and one gutter.

The portal's sticky headers (mobile and desktop, `PortalChrome`) wear
`.glass-bar` (`globals.css`): the capsule's blur and saturate at bar size, with
no ring and no hairline (HIG: never a divider under floating chrome). Its fill,
`--glass-bar-fill`, is `--background` at 72% (light) / 70% (dark), so at
scroll-top the bar reads as the page, and content scrolled under it frosts
into the page colour. No large title: contract C has none.

- Opaque (`--background`) by default and under the fallback quartet; the
  translucent fill and blur exist only inside `@supports (view-transition-name: none)`.
- Under a modal scrim it makes the dock's switch: while a `drawer-content`,
  `dialog-content` or `confirm-dialog-content` slot is in the body, the bar is
  `--background` with `backdrop-filter: none` (the fill fades over
  `--motion-duration-fast`, the blur flips after it). A new modal slot joins
  both selectors, here and in `dock.css`.
- Landscape: the header, the banners and the content pad by
  `env(safe-area-inset-left|right)`.
- **The shell gutter.** Below `lg` the content area owns the one horizontal
  gutter: `max(0.75rem, env(safe-area-inset-left|right))`, so a card never
  touches the screen edge and landscape still clears the notch. From `lg` it
  is `px-8`. Screens add no gutter of their own; a row that should bleed to
  the edge takes `-mx-3` (`ScrollRow bleed`).
- **Sub-pages** (a client's detail, menu import and its detail) name
  themselves in the bar at every width, the route label after a back chevron
  (44 on a phone). The page renders no title or Back of its own, and on a phone
  the bar drops the restaurant picker for the title: a sub-page's path does not
  exist in another venue, so the desktop picker switches to the section root.
  The brand-level registration route (`/portal/[brand]`) is titled "New venue"
  through the same mechanism, with no back chevron.

The More sheet and the restaurant picker's phone sheet share
`PortalVenueHeader`, a `media` header: the brand's logo, the restaurant, then
"brand · address". The More sheet's body is grouped lists (sections with a
check on the current one, the balance, the theme row via `useThemeToggle`);
the picker's is one `ListGroup` per brand with a check on the current
restaurant; it opens with the current restaurant's brand first, scrolls its
row into view, and on desktop a pointer opens onto the popup (no row ring;
the keyboard lands on the current row). Both sheets pin the venue header
above the scroller through `DrawerContent`'s opt-in `header` slot (the
landing's sheets pass none and are unchanged). The balance is a row
(`PortalHeaderBalance variant="row"`: a wallet well, the amount trailing, a
chevron) opening a sheet of grouped rows; Install is a row of its own group
(`InstallButton variant="row"`: a `ListGroupItem` with an icon well; the
group takes `has-[ul:empty]:hidden`, so it hides with the button). The desktop sidebar reads the `--sidebar*` tokens, and its active
row takes the dock's language: a neutral `--sidebar-accent` fill, the label in
primary ink, the brand on the glyph only.

### The admin shell

The admin is desktop-first (PRODUCT.md): the portal's palette and materials,
with basic phone usability, and no dock. `AdminAppShell` wears the same
`.glass-bar` for its mobile and desktop headers. On a phone the bar holds the
page title, the language and theme switchers (44px) and a 44px menu button (the
sheet's trigger, so focus returns to it on close). For landscape, the content
pads to `max(page padding, env(safe-area-inset-*))`: pages pad themselves, so
the shell adds only the inset beyond that padding.

- **Page title**: the header owns it; pages render no title or description
  of their own (`PageHeader` is gone). `useAdminNav` (`_shared/admin-nav.ts`) derives it from the route:
  the section's nav label, or a route label on a detail route ("User {id}",
  "New legal entity" / "Legal entity") with the portal's back chevron before
  it. A new detail route is one row in `detailHeaders`, keyed by its section
  slug. It is the page's one h1: 16/600 in the phone bar, the portal's 20/600 on
  desktop, truncating. A note worth keeping lives in its card's
  `CardDescription` (invoices, support).
- **Entity title**: a detail page may name the header after its loaded entity
  with `useAdminEntityTitle(name)` (`_shared/admin-nav.ts`); the route label
  shows until the name loads, and the page's unmount clears it. The brand,
  restaurant and restaurant-suggestion details use it. The shell renders the
  header outside the page, so the name travels through a small module store,
  not context.
- **Menu sheet** (`AdminMenuDrawer`): the More sheet's anatomy. A pinned
  `media` header (the admin avatar, "Pleazy Admin", role · ID), then one
  `ListGroup` of sections with a check on the current one (the stories count
  as a trailing badge; once the sheet lands, the current row scrolls into
  view), Install as its own group (hidden with the button), and
  Log out as a `destructive` row that opens the logout alert over the sheet.
- **Sidebar** (`AdminSidebar`): the portal sidebar's frame, `--sidebar*` tokens
  and active row; the logo over the panel subtitle, and the identity row with
  an icon logout. The theme switcher lives in the header only.
- **Section tabs** (`RaffleSectionShell`, `PartnershipsSectionShell`): route
  links in the `filterChipVariants` look, not CTA/outline buttons, so the page
  keeps its one CTA. They lead the content as a left-aligned row at every
  width, and a section with a single route shows none.

### The sheet

`DrawerContent` (`components/ui/drawer.tsx`) is the sheet scale's consumer, so
every drawer wears it, the mobile forms of `ResponsiveDialog` and
`ResponsivePopover` included. The surface is `.sheet-glass` in
`styles/sheet.css`. The sheet never blurs, because it slides: its scrim
(`drawer-overlay`) holds a fixed blur and vaul fades the scrim's opacity. The
sheet scrolls an inner element, and its edge ring sits on `::before`, because
vaul injects its own drag underlay on `::after`, unlayered.

**`--sheet-*`, not the `glass-sheet` class.** The landing's nav and language
sheets, and `/boom`'s LanguageSwitcher sheet between 640 and 767, render
through the same DrawerContent. So every value that changed is a `--sheet-*`
token. In the app (`:root` and `html.dark`) it aliases the glass-sheet scale;
the landing snapshot restates it at the landing's value (ADR 0012).

| Token | App | Landing snapshot |
|---|---|---|
| `--sheet-surface`, `-surface-solid` | `--glass-sheet-fill`, `-fill-solid` | `rgb(28 28 28 / .62)`, `rgb(28 28 28)` (unchanged) |
| `--sheet-sheen`, `--sheet-edge` | the scale's sheen and ring | the old white .10 → .03 top gradient; no ring |
| `--sheet-border`, `--sheet-shadow`, `--sheet-backdrop` | none; the scale's highlight, shade and shadow; none | the old 1px `--sheet-outline`, shadow list and `blur(24px) saturate(130%)` |
| `--sheet-radius` | 24 (`--glass-sheet-radius`) | 30.8 (Tailwind's `rounded-3xl`) |
| `--sheet-scrim`, `-scrim-blur` | `--glass-scrim`, 24 | `--overlay` at 60%, 8 |
| `--sheet-grabber`, `-grabber-height`, `-grabber-inset` | black .18 / white .24, 8, 16 | `--muted-foreground` at 30%, 6, 10 |
| `--sheet-duration`, `-duration-close`, `-ease-open`, `-ease-close` | 240ms, 200ms, `--motion-ease-out` both ways | vaul's 500ms `cubic-bezier(.32, .72, 0, 1)` |

**Anatomy**, measured on `drawer_style_example*.png` (2× exports of a
402-wide frame) with the `mockup-fidelity` loop. The fixtures are
`/dev/ui/overlays/sheets/media` and `/sheets/centered`.

| Part | Sheet | Mockup |
|---|---|---|
| Grabber | 48 × 8, 16 below the edge | 48 × 8; 16 (and 17.5 in the first export) |
| `default` header | title 16 / 700 and description centred between 44 columns, the 44 ✕ on the right; without the ✕ the title sits in a 40 band (10 above and below) | cap 11.5 at 38.5; same |
| `media` header | a 40 avatar and the title 16 / 600 over a 12 subtitle, in a 68 band (14 above and below) | avatar 40, 14 / 14; title and subtitle caps within 0.5 |
| `leading` header | a title 20 / 600 on the left and a 36 ✕: the landing's sheets and its skinned LanguageSwitcher | — |
| Body | a 16 gutter (ResponsiveDialog too); groups 8 apart | 16; 8 |
| Footer | sticky; capsule actions 56 tall, 16 / 700, two to a row with the primary on the right, wrapping the primary above when a label cannot fit | the client app's 56 CTA |
| Width | full width on a phone; from `md` a centred card, at most 576 | — |

```tsx
<DrawerHeader variant="media">
  <Avatar>…</Avatar>
  <DrawerTitle>Рыба Моей Мечты</DrawerTitle>
  <DrawerDescription>Ресторан · Карасай Батыра 235</DrawerDescription>
</DrawerHeader>
```

- `variant` is `"default" | "media" | "leading"`. The title and description
  size themselves from the header through context (outside a header they keep
  `leading`'s size). `media` has no ✕, and `showCloseButton={false}` drops it
  from the other two: the grabber, the scrim and Escape dismiss the sheet, as
  in the client app. ResponsivePopover's sheet takes `default` too;
  `headerVariant="leading"` is for the landing only: a skinned
  LanguageSwitcher (`className`/`classNames`, the landings) passes it, so
  `/boom`'s sheet stays frozen. The app's LanguageSwitcher renders its phone
  sheet as a `ListGroup` with a check on the current locale; a skinned one
  keeps the old rows.
- One layout breakpoint, `DESKTOP_MEDIA_QUERY` (`hooks/use-media-query.ts`,
  768px), switches ResponsiveDialog, ResponsivePopover and ResponsiveTable. A
  part inside a ResponsivePopover or ResponsiveDialog reads its root's answer
  (`useResponsivePopoverIsDesktop()`), never a second `useMediaQuery`: two
  listeners flip in separate renders.
- `ResponsiveDialogContent initialFocus="content"` opens on the dialog itself
  (the popup on desktop, the sheet below), not its first control: for a
  dialog that opens on tabs or filters (WalletHistoryDialog).
- `DrawerFooter` gives every Button-styled child the capsule shape (it matches
  `group/button`, which also catches a `DrawerClose`-wrapped button), and
  undoes ActionButton's icon-only collapse so a Save capsule keeps its label.
  Button has no sheet variant. `ResponsiveDialogHeader` and `ResponsiveDialogFooter`
  render through `DrawerHeader` and `DrawerFooter` on mobile.
- **Motion.** The keyframes are vaul's; `sheet.css` retimes them with unlayered
  rules one attribute more specific than vaul's. Open and close both ease out,
  so a close never stalls on a slow start. A drag past 28% dismisses
  (`closeThreshold`); the spring-back after a short drag stays vaul's.
- **Close and hold.** The sheet leaves in 200ms, faster than it arrives. The
  sheet and scrim keep `animation-fill-mode: forwards` when closed, so a close
  that waits on a navigation render never snaps back open (seen on Android
  Chrome).
- **Reduced motion.** The sheet and scrim cross-fade in place over 200ms,
  `!important` against `motion.css`'s global 1ms. This applies on the landing
  too, where only motion changes.
- **Escape under a stacked alert.** Radix reads Escape as the sheet's, because a
  Base UI alert is not in its layer stack. `DrawerContent` leaves Escape to an
  open `alertdialog`, so only the alert closes.
- **The keyboard.** `useDrawerVisualViewport` owns keyboard compensation (vaul's
  `repositionInputs` is off). On Android Chrome's default
  (`interactive-widget=resizes-visual`) it lifts a form sheet by the
  keyboard's height. `resizes-content` is not set, because it would also
  resize every page and lift the fixed dock over the keyboard.

**Fallbacks on the landing.** In Chromium, at default settings, the landing's
drawers are pixel-identical. Under Increase Contrast they gain the `--input`
ring. Under reduced transparency, and without the glass gate, the `/boom` sheet
(640–767) takes `rgb(28 28 28)`, not `--card`, and loses its own blur.

### The grouped list

`ListGroup` (`components/ui/list-group.tsx`) is the inset grouped list: rows on
one fill, full-width separators, and an optional section label. It is content,
so it never takes glass.

```tsx
<ListGroup label="Уведомления">
  <ListGroupItem render={<label />}>
    <ListGroupItemIcon><Bell /></ListGroupItemIcon>
    <ListGroupItemTitle>Новые отзывы</ListGroupItemTitle>
    <Switch defaultChecked />
  </ListGroupItem>
  <ListGroupItem render={<button type="button" />}>
    <ListGroupItemTitle>Заблокированные</ListGroupItemTitle>
    <ListGroupItemValue>2</ListGroupItemValue>
    <ListGroupItemChevron />
  </ListGroupItem>
  <ListGroupItem render={<button type="button" />} tone="destructive">
    <ListGroupItemTitle>Удалить чат</ListGroupItemTitle>
  </ListGroupItem>
</ListGroup>
```

| Part | Value |
|---|---|
| Group | `--radius-group` 20, `--fill-grouped`, `--separator-grouped` between rows |
| Row | at least 50 tall (the mockups; 44 is the floor), 16 inset, 8 vertical padding, 12 gap, 14 / 400 |
| Separator | per row, inset to the title (16, or 60 past an icon well), iOS-style; the mockups run them full width |
| Label | 14, `--label-secondary`, 8 above the group; it names the list |
| Icon | a 32 well on `--surface-sunken`, radius 8, a 20 glyph in the row's tone |
| Trailing | `ListGroupItemValue` and `ListGroupItemChevron` in `--label-tertiary`, 8 apart; a `Switch` (its off track is `--input`, 3:1 on the row); `ListGroupItemCheck` in `--primary-ink`, which also sets the row to 600. A single choice is a `role="radiogroup"` of `role="radio"` rows with `aria-checked` |
| Subtitle | wrap the title and `ListGroupItemDescription` in `ListGroupItemContent` |
| Tone | `destructive` sets the row in `--error-ink` |
| Surface | `surface="sunken"` puts the group on `--surface-sunken` for a list inside a card (in light `--fill-grouped` is `--card`, so the rows would vanish); sheets keep the default, and a light desktop dialog (opaque `--card`) re-points `--fill-grouped` to `--surface-sunken` itself, so its groups and table cards need no prop |

A row is static by default. `render` makes the row the control: a button, a
link, or a `<label>` around a switch, so the whole row is the target. Only a
control row gets the hover and press fill; its focus ring is inset, so the
group's clip cannot cut it. The contrast matrix proves every text role on
`--fill-grouped`, both in a sheet and on the page.

**KVRow.** `KVRow variant="divided"` stays for ruled detail lists on cards and
pages. In a sheet or dialog, key/value rows move to `ListGroup`
(`ListGroupItemTitle` + `ListGroupItemValue`).

### The confirm alert

`ConfirmDialog` (`components/ui/confirm-dialog.tsx`) is the alert scale's
consumer: a centred glass alert at every width, never a sheet, with no media
query in JS (ADR 0013). It is built on Base UI's AlertDialog, the same Dialog parts as
`dialog.tsx` with `role="alertdialog"`.

**Confirm or form.** A confirm is a title, a short message and at most two
actions, with no field: "Удалить сотрудника?", "Закрыть смену?". It may also
carry an error or warning `InlineAlert`, or one short line such as a code.
Anything with a field (even one "reason" box), a picker, a list, a table, tabs,
steps, a QR code or an image is a form or a detail view. Those stay on
`ResponsiveDialog`: a sheet below `md` and a Dialog from `md`.

```tsx
const { shown, onOpenChangeComplete } = useConfirmDialogTarget(target)

<ConfirmDialog
  open={target !== null}
  onOpenChange={(open) => { if (!open && !pending) onClose() }}
  onOpenChangeComplete={(open) => { onOpenChangeComplete(open); if (!open) setError(null) }}
>
  <ConfirmDialogContent tone="destructive">
    <ConfirmDialogTitle>Удалить сотрудника?</ConfirmDialogTitle>
    <ConfirmDialogDescription>{shown?.name} потеряет доступ к порталу.</ConfirmDialogDescription>
    {error ? <InlineAlert variant="error">…</InlineAlert> : null}
    <ConfirmDialogActions>
      <ConfirmDialogCancel disabled={pending} />
      <ConfirmDialogConfirm disabled={pending} onClick={confirm}>Удалить</ConfirmDialogConfirm>
    </ConfirmDialogActions>
  </ConfirmDialogContent>
</ConfirmDialog>
```

- `ConfirmDialogTrigger` (`render={<Button />}`) is optional; most call sites
  control `open`.
- `tone` is `"default" | "destructive"`. Alerts are neutral graphite in every
  tone: the destructive tone wears the same glass and only puts the client
  app's 26px warning triangle, in `--label-tertiary` (5.38 / 4.69:1 on
  `--glass-alert-fill-solid`), above the title. The confirm action stays the
  CTA in both tones, as in the client app: never a red pill.
- The alert is named by its title and described by its message.
- The scrim does not dismiss the alert; Escape and Cancel do.
- Focus lands on Cancel (it comes first), or on the alert itself when it is
  opened by touch. Focus returns to the trigger on close.
- `ConfirmDialogConfirm` never closes the alert. The caller closes it once the
  action succeeds, so a failed request stays up with its error. While a request
  is pending, disable both actions and ignore `onOpenChange(false)`, which
  Escape also sends.
- **Copy holds through the exit.** An alert opened from a target (a row, a
  shift, "email" or "phone") renders from `useConfirmDialogTarget(target).shown`.
  That is the last non-null target, released in `onOpenChangeComplete` once the
  fade ends, so the copy never changes while the alert fades out. Clear a
  site's error there too, not in `onOpenChange`.
- `ConfirmDialogCancel` reads "Отмена" unless it is given a label.
- An `InlineAlert` placed in the alert drops its wash: the alert is already its
  surface. Error ink sits on the alert at 5.63 / 5.24:1.
- `SubmitResultDialog` is this alert with a 48px tinted status disc and one
  action. The disc is the tone at 10%, not a solid, so it never competes with
  the CTA (at 15% the light check measured 2.91:1 on it). Its action closes the
  alert when no `onAction` is given, because an alert with no × must never trap
  the user.

**Geometry**, measured on `modal_style_example.png` (a 2× export of a 402-wide
frame) with the `mockup-fidelity` loop:

| Metric | Alert | Mockup |
|---|---|---|
| Width | 296; below a 328 viewport it shrinks to fit with a 16 gutter | 297.5 |
| Radius | 16 (`--glass-alert-radius`) | 16 |
| Padding | 24 top, 16 sides, 20 bottom | first ink at 28.75; 16 sides |
| Title | 17 / 600 / 1.3, `--label-primary`, centred, balanced (the contract) | 15 / 500, 22–23 pitch |
| Message | 14 / 400 / 1.4, `--label-secondary`, 6 below the title | — |
| Copy to actions | 24 (28 from ink to pill) | 28 |
| Actions | capsules 44 tall, 12 side padding, 14 / 600, gap 12, equal halves | 32 tall, 14 / 400 |

- **Actions.** When a label cannot fit its half, the row wraps, and the reverse
  wrap puts the confirm above Cancel, as iOS stacks them.
- **The capsule shape** comes from `ConfirmDialogActions`: it styles any
  `data-slot="button"` child, so Button itself has no alert variant.
- **Deviations.**
  - The pills are 44 tall, not 32, to hold the touch target.
  - The bottom padding is the contract's 20, not the mockup's 24.
  - The title is the contract's 17 / 600. The mockup is a title-only alert in
    15 / 500. Almost every confirm has a title and a message, and the title
    needs to lead the message. The mockup's own copy therefore wraps to three
    lines, not two.
- **Keyboard focus.** Button's own ring (`--shadow-focus`, the brand at 22%) is
  about 1.3:1 on the alert. `ConfirmDialogActions` therefore gives its buttons
  a 2px `--ring` outline at a 2px offset instead. That measures 4.09 / 3.44:1
  on the alert (light / dark), in both tones.

**Material.** The alert uses `glass-alert` over `glass-alert-scrim`, which is
`DialogBackdrop material="alert"`. Cancel sits on `--glass-alert-cancel`, and
takes `-cancel-hover` on hover and on press. The confirm uses `--cta-fill` with `cta-edge` and `--cta-shadow`, and on hover
`brightness(1.08)`, since the gradient covers any fill colour.

| Token | Light | Dark | Contrast (light / dark) |
|---|---|---|---|
| `--glass-alert-cancel-hover` | black .10 | white .16 | `--label-primary` 14.4 / 8.1 |

A destructive alert differs by its glyph and its copy, not its material: there
is no red tint (ADR 0013).

**Motion.**
- The alert and its scrim fade in over 200ms on `--motion-ease-out`, and out
  over 150ms. An exit is faster than an entry.
- The content inside the alert scales .96 → 1 on the way in and back on the way
  out. The blurred layer itself never scales. Modals are exempt from the
  transform-origin rule, so the scale is centred.
- Durations are `--motion-duration-overlay` / `-overlay-exit`.
- Reduced motion keeps a 150ms fade (`--motion-duration-reduced`) and drops the
  scale. The desktop form dialog (`dialog.tsx`) follows the same scale and
  keeps only its fade.

**An alert over a vaul sheet.**
- The glass budget holds: sheet scrim + alert scrim + alert = 3.
- Pointer and touch work, and the sheet yields Escape to an open alert, so
  only the alert closes.
- The sheet's Radix focus trap would hold keyboard focus, and vaul cannot
  switch it off. Portalling the alert into the sheet fails too, because vaul's
  `will-change` clips it. So `ConfirmDialog` sets `inert` on every open
  `[data-vaul-drawer]` while it is open, and clears it in the commit that
  closes it, before Base UI returns focus to the trigger inside the sheet. Any
  open sheet is under the alert, which is why it takes every one rather than
  the trigger's: most call sites control `open` and have no trigger, and iOS
  does not focus a tapped button. With no sheet open it does nothing.
- A confirm opened from inside a sheet is therefore an ordinary `ConfirmDialog`;
  it needs no `nested` prop or call-site code.
- The overlays gallery holds the case as `alert-over-sheet`: Tab stays in the
  alert, Escape closes only the alert, and focus returns to the trigger.

### The photo viewer

`PhotoViewer` (`components/ui/photo-viewer.tsx`) is the one fullscreen image
surface: the `bg-overlay/90` scrim, no glass, the photo at its natural ratio,
prev/next buttons and arrow keys, Esc, the close button or a tap off the photo
to close. Copy arrives through `labels`. Open it *instead of* a sheet that is
already up, never over one: two focus traps fight (the chat media sheet closes
before the viewer opens). Gallery: `/dev/ui/overlays`, `photo-viewer`.

### The chat feed

`components/ui/chat-batch.tsx` draws every conversation (the portal's chats,
the admin's read-only complaint view). Grouping is `groupChatBatches`
(`utils/chat-batches.ts`): day sections, then Telegram-style batches of one
sender within one local minute. A message with neither text nor photos is
dropped.

| Part | Anatomy |
|---|---|
| `ChatBatch side="out"` | The restaurant, right; bubbles `bg-primary-active` / `text-primary-foreground` |
| `ChatBatch side="in"` | The client, left; bubbles `bg-muted` |
| Batch | Bubbles 2px apart; where two touch, the sender-side corners drop from `--radius-2xl` to `--radius-sm` (positional CSS, no index props) |
| Meta | One line under the last bubble, 12px `text-label-tertiary` tabular: client `HH:MM`, restaurant `name · HH:MM` |
| `ChatBubble` | 15/1.4 text, max `min(80%, 34rem)`; `sender` is sr-only; `highlighted` rings a search hit |
| `ChatPhotoGrid` | In `media`, 3px inside the bubble: one photo at its ratio, an odd count opens full width, the rest in pairs; each opens the `PhotoViewer` |
| `ChatDaySeparator` | `bg-muted` pill; label from `chatDayLabel` (today, yesterday, date) |

Copy arrives through props. Gallery: `/dev/ui`, `chat-batch`.

**Composer and attachments** (portal, `features/portal/components/chats/conversations`):

- Row: Attach (ghost icon, 44 / 40) · field · Send. The Emoji trigger sits *inside*
  the field's bottom-right corner (32 visual, 44 / 40 `before:` hit box, 6px from
  the field's bottom edge on phone) and stays put as the field grows; the field
  reserves `pr-11` / `md:pr-10`. The field is exactly 44 / 40 tall on one line.
- Tray above the row: 64px thumbnails (`--radius-field`, `bg-surface-sunken`,
  inset `ring-border`) in one scrolling row with a hidden scrollbar, a 22px
  `bg-secondary` remove disc overhanging the corner by 3px, an `n/10` counter in
  `text-label-tertiary`, `bg-skeleton` + spinner while a photo is processed.
  Rejections collect in one `InlineAlert size="sm"` under the tray.
- Drop overlay: content-layer material, not glass — `bg-card/95`, a 2px dashed
  `border-primary/60`, `--radius-card`, inset 8px over the pane; fades 200 / 150.
- A pending photo send renders its local previews in `ChatPhotoGrid`, dimmed,
  with one overall count on the meta line.

### The menu scale

`glass-menu` is the floating layer that is not modal: `PopoverContent`,
`DropdownMenuPopup`, `SelectContent` (so `MultiSelect` and `ExportMenu` too)
and `TooltipContent`. The shared classes live in `components/ui/menu-surface.ts`.

| Part | Value |
|---|---|
| Surface | `glass-menu` on the popup, the element that does not scroll; a select's list scrolls inside it (`overscroll-contain`). No scrim |
| Radius | 14; rows `calc(var(--glass-menu-radius) - 4px)` = 10, concentric with the 4px padding; a tooltip takes the row radius |
| Rows | 36 on a fine pointer, 44 on touch (`pointer-coarse:min-h-11`); 14 / 400, a select's 15 |
| Highlight | `--glass-menu-item-hover` (hover and keyboard), neutral for every tone, as iOS does |
| Destructive | `DropdownMenuItem variant="destructive"`: `--error-ink`, glyph included |
| Separator | `DropdownMenuSeparator`, a full-width `--separator-grouped` hairline between groups |
| Selected (select) | 600 weight and a `--primary-ink` check; group labels `--label-tertiary` |
| Tooltip | the menu material opaque (`--glass-menu-fill-solid`, no blur), `--glass-menu-tooltip-shadow`, 12 / 600, no arrow; opens after 500ms, and a follow-up tooltip opens at once (`data-instant`) with no motion |

**Motion.** The popup is the blurred layer, so it only fades: 180ms in, 120ms
out (`--motion-duration-menu` / `-menu-exit`), on `--motion-ease-out`. An inner wrapper (a select's list) scales from
0.96 at `--transform-origin`, Base UI's point on the trigger, on the same
timing. A tooltip opened while another is up (`data-instant`) skips both.
Reduced motion keeps a 150ms fade and drops the scale. Transitions, not
keyframes, so a quick reopen retargets. All of this is `app:` only: on a
public page the popover keeps its own frozen motion under `public:` (below).

**Toasts** are pills (radius 28, a capsule at one line) on the menu material,
opaque: `--glass-menu-fill-solid` and no blur. A toast moves (it slides in and
a swipe drags it), up to four stack at once, and it lands over the glass
header, so a blurred toast would break the budget in every one of those
cases. Colour sits on the solid icon disc; the glyph inside has no ring of
its own (a check, a bare exclamation mark, a bare i). The motion is the client app's:
a 200ms fade plus a slide from -40% of its own height, on the brand ease-out,
leaving the same way in 150ms (the overlay scale). A swipe up or right
dismisses (the client app swipes up) and exits in its direction. Toasts sit
absolutely at Base UI's `--toast-offset-y` plus 8 per index, so an older toast
glides down when a new one lands. A toast past the limit fades out. Reduced
motion keeps a 150ms opacity fade and drops the movement, so a swipe still
tracks the finger.
Top, 8 below the safe area, 16 from the sides on a phone, 8 apart. `useToast()`
is unchanged.

| Token | Light | Dark | Contrast (light / dark) |
|---|---|---|---|
| `--glass-menu-item-hover` | black .06 | white .06 | `--label-primary` 15.8 / 11.9, `--error-ink` 4.93 / 4.62, `--primary-ink` check 5.16 / 4.21 |
| `--glass-menu-border` | transparent | transparent | — (PopoverContent's 1px border; the ring is pulled over it) |
| `--glass-menu-tooltip-shadow` | top specular white 1, `0 4px 12px` black .12 | top specular white .06, `0 4px 12px` black .50 | — |

On the opaque fill: `--error-ink` 5.63 / 5.52, the check 5.90 / 5.02. Dark
white .10 was tried and put `--error-ink` at 4.04:1.

**The landing.** On desktop the landing's `LanguageSwitcher` renders through
`ResponsivePopover` into `PopoverContent`, so the landing snapshot restates
every `--glass-menu-*` token at the landing popover's own look: `--popover`
fill, the 1px `--border` hairline (`--glass-menu-border`), `--shadow-soft`,
radius `calc(var(--radius) * 1.4)`, no ring, no highlight. Its
`--glass-menu-blur: none` makes the gate's `backdrop-filter` invalid, so it
computes to `none` rather than to an identity filter. `html.dark` restates
each token for the app. Its motion is frozen too: the menu motion is `app:`
only, and `PopoverContent` re-applies the landing's `animate-in` /
`animate-out` recipe (fade, zoom 95, a 2-unit slide, 100ms, `transition: all
.1s ease`) under `public:`. No landing page renders
a dropdown, select, tooltip or toast.

**Budget.** Measured at 390 with a select open over a sheet: the sheet scrim
and the select, 2 (the dock drops its blur under the scrim). A menu over plain
portal content is dock + glass header + menu = 3; menus are not modal, so the
dock keeps its blur. Toasts never add one.

### The landing's glass

Six utilities, landing-only. Each is pure CSS; the one structural layer (the
glow blob) is a `::before` parameterised by custom properties.

| Utility | Material | Consumers |
|---|---|---|
| `glass` | `--glass-fill` (`--primary-text` @ 27%) + `blur(--blur-glass)`, r24 | hero chips, step cards, review cards |
| `glass-veil` | `--surface-veil` + `blur(--blur-veil)`, r`--radius-frame` | referral card |
| `glass-notification` | `--glass-notification-fill` + `blur(--blur-glass)`, dark text, r18 | hero iOS-notification props |
| `glass-icon` | `--gradient-glass-icon`, pill | benefit icon discs, step-number discs |
| `glass-card` | opaque `--card` + `--shadow-card`, r20 | stat cards, benefit cards |
| `card-glow` | adds the 118px `blur(--blur-glow)` brand blob(s) to a card | pairs with `glass-card` |
| `card-hover` | on hover: `--shadow-card-hover`, both glow blobs, and `--gradient-glass-icon-strong` on the icon | benefit cards (`glass-card card-glow card-hover`) |

Position the glow with `--glow-x` / `--glow-y`; the hover blob uses
`--glow-x-2` / `--glow-y-2` and is revealed by setting `.card-glow::after`
opacity from the consumer.

Each degrades to an opaque token under `@supports not (backdrop-filter)`,
`prefers-reduced-transparency: reduce`, `prefers-contrast: more` and
`forced-colors: active`, and sets `isolation: isolate` and `overflow: hidden`
(the iOS Safari radius clipping bug). Their tokens (`--glass-fill`,
`--glass-edge`, `--glass-edge-light`, `--glass-inner-highlight`, `--gradient-*`)
are frozen in the landing snapshot. Never reuse them in the app, and never add
a third material: extend the app family with a scale instead.

## Cards, stats, badges and tables

Content surfaces, so none of them is glass.

**Card.** Every surface level has one card tone: `--card`, a `--card-border`
edge, `--radius-card` 16 and `--shadow-card` (a lit top edge and an offset
shadow in dark, the offset shadow alone in light). The radius and shadow are
arbitrary values (`rounded-(--radius-card)`, `shadow-(--shadow-card)`), so
tailwind-merge still lets a call site's override win. `glass`, `soft` and
`warm` render as `default` and stay only as names for their call sites.
`dashed` is the empty placeholder. `hero` adds `--hero-stat-glow`, a radial
layer over the card fill and the one gradient a card may carry.

**CollapsibleSection.** `card` is an inset card at every width (r16, card
edge and shadow); below `lg` its padding tightens to 12 / 16. `plain` drops
the card for a section whose content is already cards (the dashboard's stat
grids), so tiles never sit card-in-card. `CollapsibleSectionSkeleton` takes
the same `variant`.

**Flush below `md`.** `flush="below-md"` on `Card`, `TabbedCard` and
`CollapsibleSection` (and `CollapsibleSectionSkeleton`) drops the card's
border, fill, radius, shadow and horizontal padding on phones, so the grouped
rows inside (a `ResponsiveTable`, a `ListGroup`) sit on the shell gutter instead
of in a card inside the page. From `md` up it is the card again. A flush
`TabbedCard`'s active tab becomes a brand underline below `md`, since there is
no body to join. Default `none`; use it only where the content is grouped rows
(staff, reservations, the documents tables), never on a card of plain text or
fields.

**StatTile** (`features/admin/components/_shared`): the admin's summary tile.
Its caption takes rich content (a `ReactNode`, rendered in a `div`). The
balance page's summary cards are StatTiles; its search popovers, selected
items and transaction details are `ListGroup` rows.

**StatCard.** The default surface is `default`. `surface="hero"` is the view's
one headline stat: at most one per view, and none where no stat leads. `flat`
stays the outline for a stat that already sits on a card. The caption tones
are the inks (`--success-ink`, `--error-ink`, `--primary-ink`). The caption is
`sm` text; `captionSize="default"` lifts it where it carries the card's key fact.

**Badge and InlineAlert.** Each tone sets its ink on its own 8% wash
(`bg-*-surface`); the destructive badge uses `--error-ink`. Every pair clears
4.5:1 in both themes, on the wash over a card and over the page:

| Tone | Light (card / page) | Dark (card / page) |
|---|---|---|
| success | 5.91 / 5.40 | 6.75 / 7.66 |
| warning | 6.18 / 5.66 | 6.23 / 7.09 |
| info | 6.49 / 5.93 | 6.00 / 6.74 |
| neutral (graphite `#6e6e75` / `#8e8e95`) | 6.97 / 6.37 | 7.39 / 8.40 |
| error | 5.26 / 4.81 | 5.88 / 6.62 |

**Table.** The container has a card edge at r16. The header is a
`--surface-sunken` band, 44 tall, of 13/500 labels in `--label-secondary`, with
no column rules.

**ResponsiveTable below `md`.** Each record is an inset group of
`ListGroupItem` rows: the identity row (select, primary cells, actions) at 600,
then one row per column, with the label in `--label-secondary` and the value in
`--label-primary`. The label keeps its width (`shrink-0 basis-auto`) and the
value wraps, so wide content (chips) cannot crush it; a cell whose desktop form
is a chip row renders plain text below `md`. The group takes `--fill-grouped`,
`--radius-group` and a `--card-border` edge; the edge keeps a white group apart
from a white card in light. With `onRowClick`, the whole card takes the click
and presses to `--muted`, but the `<li>` keeps its list semantics: the button
role, the tab stop and the Enter/Space handler sit on the identity block
(`data-slot="responsive-table-activator"`).

**Skeleton.** `bg-skeleton` is `--label-primary` at 8%, so a bar reads on the
page, a card, a well and a grouped row alike. The landing's offer skeleton
keeps its `muted/60` through the snapshot.

**ReviewCard reply.** The venue's reply is part of the card, not a card in
it: a 12/500 sentence-case label in `--muted-foreground` over the reply in
body text, indented 16. No eyebrow, no box, no tone wash.

**TabbedCard.** Resting tabs are `--label-secondary`; the active tab takes the
card's edge and `--primary-ink`.

## Controls

Controls are content, so none of them is glass. App-only behaviour on these
shared primitives goes through `app:` / `public:` (The primitive rule, under
Themes).

**Button.**
- Rounded rectangles r12 on content: `rounded-(--radius-button)` on `sm`,
  `default` and `lg` (`xs` is r8). The token is 12px in `:root` and `html.dark`,
  and the landing snapshot holds it at 6px, which is what the LanguageSwitcher
  options rendered. It is written as an arbitrary value so tailwind-merge still
  lets a call site's `rounded-full` win.
- Capsules only in the sheet and alert footers, which shape the buttons from
  outside (`DrawerFooter` 56 tall at 16/700, `ConfirmDialogActions` 44 tall).
  Button has no capsule variant: the shape belongs to the footer, so every
  button dropped in (a `DrawerClose`-wrapped one, `ActionButton`, `SaveButton`)
  takes it without opting in, and two footer heights would need two sizes.
- `default`, and `primary` in every size except the landing's `pill`, is the
  CTA: `--cta-fill` (the white label at ≥4.5:1 from 25% down the ramp, its
  worst glyph row; the matrix asserts it per theme), the `cta-edge` ring pulled over
  the border (`after:-inset-px`), `--cta-shadow`, and brightness on hover and
  press. `primary` + `pill` stays the landing's solid brand. `cta-edge` sets
  `position: relative` after the Tailwind utilities, so it beats a call site's
  `absolute` on a CTA; no CTA is positioned today.
- Press: `app:active:scale-[0.97]` on every variant (`link` opts out).
- **One CTA per view or section.** `default`/`primary` is the one action the
  view is for; a repeated action in a list, card or table row is `outline`.
- `destructive` fills with `--destructive-fill`, a button-only token: light is
  `--destructive`; dark is `--error-base` 85% over `--bg-base` (#c53c3e,
  white 5.1:1), because at full strength it outshouted the CTA and its label
  sat at 3.87:1. `--destructive` itself stays, since `text-destructive` reads it.
- The ThemeSwitcher and the icon LanguageSwitcher are `icon` (44) at every
  width.
- Targets: below `md`, `icon-sm` (36) and `xs` (28) grow to 44 with an
  app-only `before:` box (`after:` is the CTA's ring). `icon-sm` and `xs` carry
  `relative` for it, which a call site's `absolute` still replaces.
- Height: from `md`, `sm` is `--control-height-md` (40, a field's height), so a
  button beside a field lines up; the snapshot holds it at 36.
- Focus: `app:` 2px `--ring` outline at offset 2, 4.15:1 on a dark card, 4.60:1
  on the dark page, 3.89:1 on the light page. The landing keeps its
  `--shadow-focus` halo through `public:`.

**Fields.** `inputVariants` is the well: `--field-fill` (white card in light,
`--surface-sunken` in dark), a `border-input` edge (3:1 on the well),
`--radius-field` 10, 16px text, and 44px tall below `md` (40 from `md`). Focus
is the border in the tone plus a 1px shadow of it: a 2px ring that moves
nothing. The invalid and success edges are the solid tone (3:1 on the well,
asserted). The select triggers, the OTP slots and `Textarea` wear the same chrome.
`MultiSelect`'s trigger takes that height as a floor (`min-h-11 md:min-h-10`) and
grows with its wrapped chips at every width.
The password eye and the search adornment buttons are 44px targets.
`Checkbox` sits on the well with a 44px `after:` target; the autofill defaults
are unchanged.

**Switch.** 56×28 (`sm` 36×20) with a 44px `after:` target. The on track is
`--primary`, with a white check on its left; the off track is
`--switch-track-off` (iOS's `rgb(60 60 67 / .56)` in light, 3.11:1 on white and
3.01:1 on the page; `--input` in dark); the thumb is `--control-thumb` (white in
both themes) and stretches while pressed, except under reduced motion.

**SegmentedTabs.** The iOS segmented control: a `--segmented-track` with one
`--segmented-thumb` that slides by `transform` to the active tab (measured in a
layout effect; its width animates with it, since tabs differ in width). Before
that first measure, the active tab paints the thumb itself, so the server
render shows it. Reduced motion drops the slide. Columns are equal (iOS)
until the track overflows; then each is its content width and the track
scrolls (`auto-cols-[minmax(max-content,1fr)]`). Labels never wrap or
truncate. A scrolled track has no scrollbar: it fades 24px at each edge that
hides a tab (a mask set from `data-overflow`, updated on resize and scroll),
and it keeps the active tab in view. Icons hide below `sm`.

**FilterChip.** Tinted: `bg-muted` at rest; active is `--chip-active-fill`
under `--chip-active-ink`. Light: brand 14% under `--primary-ink` (5.10:1).
Dark: brand 22% over `--muted`, so the active chip reads lighter than a resting
one, under `--brand-text-hover` (5.13:1; `--primary-ink` is 3.76:1 there).
Press scale. A toggle: `aria-pressed` mirrors `active`; a chip row names itself
with `role="group"` and `aria-label`. The same pair marks every "current"
row or chip-like control through one class, `activeRowClassName` (`components/ui/active-row.ts`), which
also holds it on hover so a ghost Button cannot repaint it: the restaurant
picker's trigger and active row, the sidebar's profile button,
`EstablishmentsSidebar`'s brand and venue rows and `LinkedRestaurantPicker`. `MultiSelect`'s selected chips take the same active tint in the
field well (the matrix holds it over `--field-fill` too), so the CTA stays the
view's one brand fill.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--radius-button` | 12px | 12px (snapshot 6px) | Button radius on content |
| `--radius-field` | 10px | inherits | field radius |
| `--radius-control-sm` | 8px | inherits | `xs` button, header back chip |
| `--radius-segment` | 10px | inherits | SegmentedTabs segment and thumb |
| `--field-fill` | `--card` | `--surface-sunken` | the field well |
| `--control-thumb` | `#fff` | inherits | switch and slider thumb |
| `--control-thumb-shadow` | black .16 / .08 | black .4 / .2 | its shadow |
| `--chip-active-fill` | brand 14% | brand 22% over `--muted` | active filter chip |
| `--chip-active-ink` | `--primary-ink` | `--brand-text-hover` | its label |
| `--switch-track-off` | `rgb(60 60 67 / .56)` | `--input` | off switch track |
| `--control-height-md` | 40px | 40px (snapshot 36px) | `sm` button height from `md` |
| `--segmented-track` | `rgb(118 118 128 / .12)` | `/ .24` | segmented track |
| `--segmented-thumb` | `#fff` | `#48484c` | segmented thumb |
| `--segmented-thumb-shadow` | iOS thumb shadow | black .36 + a top specular | its depth |

The contrast matrix asserts the field's resting, invalid and success edges on
the well, the ring on the card,
page and well, the switch's tracks and thumb, the chip ink, and the segmented
labels.

**Progress.** `Progress` (`ui/progress.tsx`): an 8px `bg-muted` capsule track
with a `bg-primary` fill. The fill slides (`translateX`) rather than scaling,
so its rounded end keeps its shape, on `--motion-duration` / `ease-brand-out`,
and does not animate under reduced motion. Name it with `aria-labelledby`
pointing at the visible title (the profile-completeness bar) or `aria-label`.
It sits straight on the page or a card, never in a card of its own.

## Auth pages

`features/auth/components`. `AuthShell`'s content is the page's `<main>`
landmark. No ember field and no page
gradient: the atmosphere is C's page, the kit's `Card` (lit top edge, offset
shadow, r16) and the one CTA. `AuthShell` is top-aligned below `sm`, so the
keyboard opening never moves the card, on `min-h-dvh`; its padding and the
switchers sit at `max(…, env(safe-area-inset-*))`. The secondary actions
(`authTextActionClassName`, shared by `AuthTextLink` and the login's mode
switch) are 44px rows in `--primary-ink`; forgot-password links back to login.
`AuthNotice` is the "code sent to …" line, and its `AuthNoticeAction` is a
44px-tall link button. The register logo picker wears `inputVariants`, whose
`default` tone also rings a well around a hidden input
(`has-[>input:focus-visible]`). `PortalLoginForm` is the login card without
behaviour; the gallery's `auth-states` section renders its error and pending
states through it. Autocomplete attributes are untouched.

## Motion

No animation dependency: CSS transitions and keyframes (`motion.css`,
`sheet.css`, `dock.css`, the kit's utilities), plus one IntersectionObserver
leaf. Base UI and vaul drive the overlay states.

| Token | Value | Use |
|---|---|---|
| `--motion-ease-out` | `cubic-bezier(.22, 1, .36, 1)` | every app enter and exit (`ease-brand-out`) |
| `--motion-ease-in-out` | `cubic-bezier(.4, 0, .2, 1)` | the landing's float (`ease-brand-in-out`) |
| `--motion-duration-fast` | 180ms | colour and state transitions; also Tailwind's default transition duration |
| `--motion-duration-press` | 120ms | press-in scale (Button, chips, the dock); release is the 180ms default |
| `--motion-duration-menu` / `-menu-exit` | 180 / 120ms | popover, dropdown, select |
| `--motion-duration-overlay` / `-overlay-exit` | 200 / 150ms | alert, dialog, toast |
| `--sheet-duration` / `-duration-close` | 240 / 200ms | the sheet (tokens under The sheet) |
| `--motion-duration-reduced` | 150ms | the opacity fade that replaces movement under reduced motion |
| `--motion-duration` / `-slow` | 420 / 800ms | landing reveals and card hovers |
| `--motion-distance`, `--motion-stagger`, `--motion-float-duration` | 24px, 80ms, 6s | landing reveal offset, reveal stagger, float loop |

| Primitive | Form | Notes |
|---|---|---|
| `Reveal` | `components/ui/reveal.tsx`, client leaf | flips `data-visible`; the animation is the `[data-reveal]` CSS |
| `reveal-group` | utility class | staggers direct children by `--motion-stagger` via `nth-child`, covers 8 |
| `float` | utility + keyframes | ±8px idle loop |
| `marquee` | utility + keyframes | `-50%` on a duplicated track, 80s linear, paused on hover and focus |
| `parallax` | utility, `animation-timeline: scroll()` | `@supports`-gated; without support the element just sits still |

Rules the CSS enforces:

- Only `opacity`, `translate` and (statically) `filter` animate. No
  layout-property animation. `translate` rather than `transform` so it never
  clobbers a layout transform.
- The hidden pre-reveal state lives inside `@media (scripting: enabled)`, so
  server HTML, crawlers and no-JS visitors always see the final visible state.
  **Never wrap an LCP element in `Reveal`** — with scripting on it starts at
  opacity 0 and delays the measured paint.
- `prefers-reduced-motion: reduce` stops every loop, drops every transition and
  forces reveals visible. No motion, no layout shift. That catch-all (1ms,
  unlayered `!important`) is what public pages get.
- In the app, reduced motion is gentler, not zero. A kit overlay (alert,
  dialog, menu, toast) keeps an opacity fade over `--motion-duration-reduced`
  through a layered `app:motion-reduce:duration-(--motion-duration-reduced)!`,
  which outranks the unlayered catch-all, and drops its movement with
  `motion-safe:`. The sheet cross-fades over 200ms (`sheet.css`). App spinners
  keep turning at 1.5s: a frozen spinner reads as a hang.
- The app kit's motion: one curve, `--motion-ease-out`, for every
  enter and exit; an exit is faster than its entry. Menu 180/120, overlay
  (alert, dialog, toast) 200/150, sheet 240/200. Press feedback
  (`app:active:duration-(--motion-duration-press)` on Button, also on chips and
  the dock) scales in at 120ms and releases on the 180ms default. A 100+/day
  action gets no animation: the dock's lens is instant. Route transitions
  (`<ViewTransition>`) are parked.
- `float` and `parallax` are off below `md`: they earn nothing at 390px and cost
  the most there.
- `will-change` only on `float` / `parallax`, never on a blurred surface.
- Blurred surfaces fade, they never translate: a moving `backdrop-filter`
  re-samples a moving region every frame. The hero chips, the step cards and the
  referral veil all pass `direction="none"` to `Reveal` for that reason.
- `@theme` retunes Tailwind's `--default-transition-duration` (180ms) and
  `--default-transition-timing-function` (the brand ease-out), so a bare
  `transition-colors` is already on the token system. Spell out a duration only
  when a component genuinely needs a different one.

## Dates

Dates render through `FormattedDate` (`components/ui/formatted-date.tsx`) or
`formatDateTime` (`utils/date-time.ts`), never a hand-rolled `Intl` call.
`FormattedDate` follows the app language: it reads `useOptionalLocale()`
(`i18n/LocaleProvider.tsx`, the non-throwing sibling of `useLocale`) and maps
it through `INTL_LOCALES`; an explicit `options.locale` still wins, and outside
a `LocaleProvider` it keeps the formatter's default. It renders
`options.fallback` (or "—") until mounted, so server and client agree.

## Verification harness

**Contrast matrix** — `__tests__/app/globals-contrast.test.ts` reads
`app/globals.css` directly, resolves `var()` and `color-mix()` the way a browser
does, and asserts WCAG AA on every `{foreground, surface}` semantic pair in
**three cascades**: light, the landing snapshot, and app dark. Direction C's
roles (the text ramp, the inks, the field edge) exist only in the app, so their
pairs run in light and app dark. The field edge is held to the 3:1 non-text bar.
It runs under `npm run test:ci`, so it is already in CI. This is what turns
"dark mode looks fine" into "dark mode is provably AA".

Two things it deliberately does not assert, both documented in the file itself:

- **Waived pairs**, each with a written reason and a 3:1 floor so a waiver cannot
  hide a real regression. `--primary` is the known one (a mid-tone where neither
  white at 4.27:1 nor black at 4.31:1 clears 4.5:1); `--error` / `--destructive` are
  pre-existing mid-tones. `--neutral` is graphite in the app (white on it is
  5.06:1 light, 3.25:1 dark) and the old `#1677ff` in the landing snapshot.
- **Tone-on-own-wash pairs** are asserted: each tone's ink
  (`--success-ink`, `--warning-ink`, `--info-ink`, `--neutral-ink`,
  `--error-ink`) on its own 8% wash over a card and over the page, and bare on
  a card. The fill mid-tones cannot do it (`--warning` on its wash was 1.80:1
  in light), which is why each tone has a text step.

**Colour-literal lint** — `no-restricted-syntax` in `eslint.config.mjs` bans raw
palette utilities (`bg-white`, `text-amber-700`, …) and hex/`rgba()` inside
arbitrary-value utilities across `app/`, `components/` and `features/`. Without it
the token contract erodes one PR at a time. Seven files are allowlisted, each for a
stated reason and each carrying a `theme-invariant:` comment at the site: the
camera viewfinder, the photo-carousel scrim, the JET partner banner's fixed
artwork, the JET post-login drawer (whose sheet is white in both themes because
the mockups are), and the three QR / payment-mark surfaces that need a permanent
light plate to stay scannable or visible.

`npm run e2e` (Playwright, chromium, local only — D-8). Four assertions:
a full-page screenshot baseline per viewport, a no-horizontal-overflow sweep at
320/360/390/768/1024/1440/1920, a reduced-motion render, and a JS-disabled pass
that proves the server HTML carries every heading and all six FAQ answers.

Screenshots force reveals visible and images eager before shooting — the reveal
*behaviour* is what the no-JS and reduced-motion cases assert; the screenshots
only judge layout. Baselines are macOS-rendered; regenerate them on the same
platform (`npm run e2e:update`) and never gate CI on them without first
generating Linux baselines in a container.

**UI kit gallery** — `/dev/ui` renders every `components/ui` primitive in its
variants and states with no session, `/dev/ui/overlays` holds a trigger per
dialog, drawer, popover, menu, select, tooltip and toast, and `/dev/ui/portal`
renders the portal compounds (the mobile dock, the shared stat, rating, review
and person components). A shell part that reads the session or the router joins
through its presentational half, the way `PortalBottomNavBar` sits under
`PortalBottomNav`: props in, fixtures from the gallery, hooks only in the thin
wrapper. `e2e/ui-gallery.spec.ts` keeps one baseline per `data-gallery` section and
one per opened overlay, in both themes at both viewports, so a restyle diffs where
it landed. They compare exactly: the config's 1% budget suits a full-page landing,
but a recoloured 16px icon is ~0.005% of a section. The gallery's own chrome
(`data-gallery-chrome`: the page links and the floating theme switcher) is hidden
before every shot. `next dev` serves the gallery; a production build 404s it unless the server runs with `UI_GALLERY=1`,
which `playwright.config.ts` sets for the server it starts. A new primitive or
variant goes into its gallery section, then
`npm run e2e:update -- e2e/ui-gallery.spec.ts` refreshes the baselines. The
landing-only primitives stay with the landing specs.

## SEO surfaces

`app/robots.ts`, `app/sitemap.ts` and `lib/site.ts` (`NEXT_PUBLIC_SITE_URL`,
which also feeds `metadataBase`). The OG image is a static
`app/(landing)/(b2c)/opengraph-image.jpg` — a 1200x630 crop of the real rendered
hero, regenerated from the Playwright baseline when the hero changes.
`Organization` JSON-LD ships in the landing layout; `FAQPage` stays out until
every FAQ answer is final copy (D-7).

## Landing primitives

- `Section` (`components/ui/section.tsx`, RSC) — container width (1200px content,
  15px gutters), `--space-section` rhythm, `isolation: isolate`, and the
  `frame` variant (`none` | `rounded` | `rounded-bottom`) which also decides
  clipping. Art that deliberately bleeds past a section edge belongs in a
  `frame="none"` section or on the page wrapper.
- `SectionHeader` — emits one heading (h2 by default; the page's single `h1`
  lives in the hero) plus optional subtitle.
- `AmbientGlow` (`components/ui/ambient-glow.tsx`, RSC) — the blurred brand
  ellipse group. `aria-hidden`, `pointer-events-none`, percentage-positioned so
  it scales with its parent, clamped to 1440px so the glow never drifts off the
  composition on ultra-wide.

Landing type is `Heading level="display" | "section" | "card"` and
`Text size="body-lg" | "body" | "caption"`. The CMS `h1`-`h6` levels and
`xs`-`xl` sizes are untouched — portal and admin depend on them.

Landing CTA is `Button variant="brand" size="pill"`.

## Landing shell

The B2C landing lives in a nested route group, `app/(landing)/(b2c)/`, so its
layout wraps only `/`. `app/(landing)/business/` has its own layout with the
same recipe (see **Route-scoped overrides** below) and must not inherit this
shell.

`app/(landing)/boom/` — the iPhone-raffle promo — is a sibling with the same
recipe: static `dark` class, `--font-sans → --font-inter`, `color-scheme: dark`,
its own nav and footer, its own metadata. It reuses `Section`/`SectionHeader`,
`AmbientGlow`, `Reveal`, `StoreBadges`, `MaybeLink`, the `glass` utilities and
the B2C `FaqSection` (which now takes optional `id`/`className` so both pages
can drive their own anchor and rhythm). Its only new design-system entries are
`--gradient-cta-soft` (+ the `brand-soft` button variant, for a CTA sitting on
an orange field) and `--gradient-glass-icon-flat` (a step disc on a brand
surface, where the normal gradient's top stop *is* the surface).

The promo's figures — participant counter, progress bar, draw board, stats —
are static copy in `page.i18n.ts`, marked `TODO(data)`. The public endpoint
`GET /api/promotions/iphone-raffle/current/` would cover the counter, the
progress bar and two of the four stats, but exposes no per-draw winners.

`_shared/MaybeLink.tsx` is the D-10 "no `href="#"`" rule as one component; both
footers and the promo's legal links use it.

`(b2c)/layout.tsx` owns: the static `dark` class (D-3 — no provider, no JS), the
`--font-sans → --font-inter` swap (D-1, landing only), `color-scheme: dark`, the
nav, `<main>`, the footer, and the route metadata.

Surfaces: `--surface-contrast` is the solid maximum-contrast surface used by the
nav, both drawer sheets and the store badges (`#000` dark, `#fff` light).

Drawers reuse `components/ui/drawer.tsx`. Pass `direction="top"` to **both** the
root and `DrawerContent` — Vaul keeps `direction` on the root, so the content
cannot read it. A top sheet flips the edge, moves the drag handle below the
content, and skips the visual-viewport keyboard compensation, which only makes
sense for a bottom-anchored sheet.

`LanguageSwitcher` has three trigger shapes: `label` (default, CMS), `icon`
(globe only, portal chrome), `icon-label` (globe + label + caret, landing nav).
In the app the trigger's text is `app:text-primary-ink`; the landing keeps its
own colours. A trigger that shows the locale names itself with it first
(label-in-name).

**Links with no URL render as plain text, never `href="#"`** (D-10). All footer
links, legal links and contact rows are in that state today — see
`features/landing/b2c.links.ts` and the `TODO(copy)` markers in
`app/(landing)/(b2c)/page.i18n.ts`.

### Route-scoped overrides (`/business`)

The B2B landing consumes the shared system unchanged except for four semantic
values, which it re-points on **its own layout wrapper** as a `style` object —
not in `:root`/`.dark`. Nothing outside `/business` sees them, so the B2C
landing still resolves `--card` to `#282828` and `--foreground-muted` to
`#F5F5F5`.

| Token | `/business` value | Shared dark value | Why scoped |
|---|---|---|---|
| `--card` | `#160906` | `--ink-850` `#282828` | A **warm** near-black — `--ink-950` lifted toward the brand. It is the B2B card surface and nothing else's. Promoting it to a semantic would need a light counterpart nobody has designed, and would change every CMS card. |
| `--foreground-muted` | `--ink-350` `#AAAAAA` | `--ink-50` `#F5F5F5` | B2B body copy is a true grey; B2C's is flat against `--foreground` by design (D5). Both are correct for their own page. |
| `--border-strong` | `rgb(255 255 255 / 0.25)` | `rgb(255 255 255 / 0.22)` | 0.03 alpha on a 1px hairline. Scoped only because it rides along with the block. |
| `--primary-foreground` | `--ink-0` `#FFFFFF` | `--ink-50` `#F5F5F5` | D-5 contrast: lifts solid-CTA labels from 3.60:1 to 4.27:1. See *Known limitations*. |

`--scrim-vignette` used to sit here as a fifth override, for the about-section
photo overlay. `company_image.webp` ships that vignette composited in, so the
overlay and the token are both gone.

If a light B2B landing is ever designed, these four need light counterparts —
and nothing else does, because everything underneath is already dual-theme.
If a third surface ever wants the warm panel, promote `#160906` to a semantic
*then*, not speculatively now.

`--ink-350` (`#AAAAAA`) and `--blur-ambient-md` (`135px`) are the only two
values the B2B landing added to the shared `:root`; both are theme-independent
primitives, consistent with the rest of the ink and blur ladders.

## Left to the file

These rules are complete in their comments, so this doc does not restate them:

- **`base.css`:** the element defaults (`html`/`body` colours, `border-border`,
  the `--accent` selection tint, `[data-focus-ring]`), the app-only touch
  baseline (`touch-action: manipulation`, no label selection or callout on
  controls, no overscroll on the app's `<html>`), and the `pt-safe`, `pb-safe`,
  `pl-safe`, `pr-safe` utilities. `pb-safe-offset` and `mobile-bleed` have no
  consumer.
- **`globals.css`, after the tokens:** the dark-map filters for Leaflet and
  2GIS MapGL, the `.map-picker-2gis:fullscreen` layout, and the ePay / Halyk
  widget overrides (`.iframeBox`, `.iframeClass`, `.widgetScreen`, third-party
  markup that forces literals and `!important`).
- **`@theme inline`:** the `--color-*`, `--radius-*`, `--shadow-*`,
  `--drop-shadow-*`, `--blur-*` and `--ease-*` utility mappings; each points at
  a token described above.
- **The landing snapshot** (`.dark, body:has(> .dark)`): every value, with its
  D1–D10 reason, including the dead `--portal-dock-*` entries.
- **The dock's layout** (`dock.css`: list, item, label and avatar classes) and
  vaul's retimed keyframes (`sheet.css`).

## Known limitations

- **Text on the brand orange fails WCAG AA below 18.66px bold.** `#D84A1B` is a
  mid-tone: the best available text colour on it is white at **4.27:1**, black at
  4.31:1 — neither reaches 4.5:1, so no recolouring of the *text* fixes it. The
  three ways out are a darker bar, 18.66px+ bold text (large-text threshold is
  3:1, which white clears), or an explicit waiver. **Shipped as-is, waived
  pending design.** This affects the B2C orange legal bar at 14px and the B2B
  solid CTA labels (18px semibold desktop / 16px mobile — just under the
  large-text threshold), which is why `/business` overrides
  `--primary-foreground` to pure white: 3.92:1 → 4.27:1, the best reachable
  without a design change.
- **Brand orange as *text* does pass**, contrary to what the B2B plan's §6.2
  estimated: measured, `#D84A1B` is **4.75:1** on `--background` `#0D0402` and
  **4.57:1** on the B2B card `#160906`. So the B2B function kickers, tariff
  em-dashes, FAQ glyphs and the step-card index are all AA-compliant as drawn,
  and needed no recolour.
  The other pair the plan flagged, review meta `#999999` on the translucent
  card, measures **5.87:1** and passes — no change needed.
- **Landing first-load JS is ~262 KB gzip against a ≤140 KB target.** Dropping
  the `@/components/ui` barrel from the root layout already removed recharts
  (~170 KB gzip). What is left is React itself (~69 KB) plus Base UI, pulled in
  by the app-wide `TooltipProvider`/`ToastProvider` and by the landing's own
  language switcher and drawers. Getting under the target means moving those
  providers out of the root layout into the CMS layouts, or lazy-loading the
  drawers — both are cross-surface changes, not landing-local ones.
- **No `hreflang`, no per-locale canonical URLs** (D-9). Locale is cookie-only
  (`NEXT_LOCALE`), there are no `/[locale]` routes, so per-locale URLs do not
  exist to point at. URL-based locales are a separate project.
- The B2B landing (`app/(landing)/business/page.tsx`) still hardcodes its own
  green-era palette in ~44 places and will visibly diverge from the B2C
  landing until it is migrated (D-11, follow-up ticket).
- The supplied DS is dark-only (A2). Light `--warning` (`#faad14`) and `--info`
  (`#1668dc`) are Ant's documented light siblings; the app's other light values
  are direction C's light counterpart. A light-theme DS export removes the
  guess.
- In light, chart slots 3 and 5 sit under 3:1 on white (Chart series).
