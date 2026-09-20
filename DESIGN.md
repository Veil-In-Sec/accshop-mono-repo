# Design System: AccShop — Grey + Logo Structural Edition

## 1. Visual Theme & Atmosphere
Structural, humanized, quiet-confidence. The entire site lives in a single grey family (cold zinc/charcoal) with one accent — logo Periwinkle #5362AD. No emerald, no amber, no red leak. The structure is architectural: 12-col implied grid, hairline dividers, card bays with consistent 24px radius. Humanized through real faces (Avatar stacks, testimonial), hand-written microcopy, and warm greys — not sterile. Interactive at every layer: hover lift, tab switches, accordion, dialogs, and focus rings all use the same spring.

- Density: Balanced (5) — landing airy with structural rhythm, dashboard bento dense but breathing
- Variance: Structured Asymmetric (5) — hero split 1.05/0.95, feature 3-up with middle accent, testimonial 2+1 masonry, single-column <768px
- Motion: Interactive (6) — spring stiffness 100, damping 20, 150ms hover, 60ms stagger, transform + opacity only

## 2. Color Palette & Roles — GREY + LOGO ONLY
- **Void** (#0f0f12) oklch(0.145 0.004 285) — app canvas
- **Surface** (#18181b) zinc-900 — cards, panels
- **Surface Hover** (#232326) — card hover, table row hover
- **Muted** (#27272a) zinc-800 — secondary fills, skeleton
- **Border Hairline** (rgba(255,255,255,0.07)) — every border, divider, ring 1px
- **Ghost** (rgba(255,255,255,0.04–0.06)) — pill containers, nav bg, input fills
- **Ink** (#fafafa) — primary text
- **Stone** (#a1a1aa) — secondary text, descriptions (replaces muted-foreground)
- **Dim** (#71717a) — captions, metadata, step numbers
- **Periwinkle #5362AD** oklch(0.54 0.125 276) — SOLE accent. CTAs, active tabs/pills, focus ring, chart line, badge fill, avatar fallback, link hover. Saturation 62% muted, never neon. Soft tint rgba(83,98,173,0.12–0.15) for fills/borders.
- **Why only two hues:** Every decorative element, success badge, status pill is remapped to grey + periwinkle. "Delivered/Verified" uses Periwinkle 15% fill + Periwinkle text, not emerald. Pending uses Grey 8% fill + Zinc text. This keeps brand tight and structural.
- Banned: pure black #000000, pure white cards, any hue outside grey/white/periwinkle (no emerald, amber, red except destructive form errors at 10% opacity), warm greys, neon glow, second accent.

## 3. Typography Rules — Outfit Only
- **Display:** Outfit 600–700, -0.03em tracking, 0.95 leading. clamp(2.2rem, 5vw, 3.25rem). White for heroes, Stone for subhead.
- **Body:** Outfit 400, 1.6 leading, max 65ch, Stone. Emphasis White.
- **Meta/Mono:** JetBrains Mono 11–12px Dim for timestamps, amounts, codes.
- **Eyebrow:** 11–12px uppercase tracking-widest Dim, often with 6px Periwinkle dot.
- **Numeric:** Tabular-nums for prices, counts.
- **No:** Inter, serif, gradient h1, >45px unscaled hero on mobile.

## 4. Component Stylings — shadcn/ui ownership, structural
* **Button Primary:** pill rounded-full h-11 px-7 bg #5362AD text-white 14px semibold shadow 0 8px 24px rgba(83,98,173,0.32) hover #4351a0 active translate-y-px. Focus ring #5362AD/20. Uses `components/ui/button.tsx:6` cva default variant bg-primary.
* **Button Secondary/Ghost:** pill border white/10 bg Ghost text Stone hover white/8, same height. Used for secondary hero CTA, dialogs.
* **Button White:** pill bg white text zinc-900 hover zinc-100 — for contrast on dark cards.
* **Card:** `components/ui/card.tsx:5` — rounded-[24px] border white/7 bg Surface p-6 shadow 0 12px 32px rgba(0,0,0,0.4) + inset white/6. Accent card: p-[1px] gradient from Periwinkle/20 to transparent. Hover: border white/12, translate-y-[-2px] on interactive cards.
* **Tabs:** `components/ui/tabs.tsx:5` — pill container bg Ghost + border white/7 p-1. Trigger rounded-full px-4 py-1.5 text-sm, active bg white text zinc-900 shadow-sm, inactive Stone hover white. Used in Hero preview + Dashboard categories — fully interactive, keyboard nav via Radix.
* **Avatar:** `components/ui/avatar.tsx:7` — size 8–10, rounded-full ring 1 white/10, fallback bg #5362AD text-white. Stack with -space-x-2 border Surface. Humanizes trust bar + testimonials. Images via picsum.photos 80x80 or ui-avatars.
* **Accordion:** `components/ui/accordion.tsx:7` — divide white/6, trigger flex justify-between py-5 text-[15px] weight 500 tracking-tight text Zinc-100, content pb-5 text-sm Stone. Interactive with chevron rotation, focus ring Periwinkle.
* **Dialog:** `components/ui/dialog.tsx:7` — overlay bg black/60 backdrop-blur-sm, content Surface border white/8 rounded-[24px] max-w-md p-6. Used for product quick-view, keep focus trap, close on Esc.
* **Badge:** pill text-[10px] semibold tracking-wide, bg Periwinkle/15 text #8b9bff ring Periwinkle/20. No colored variants leak.
* **Table:** header Dim 12px uppercase, rows border white/5 hover Surface Hover, interactive cells with hover white. Built from `components/ui/table.tsx:7`.
* **Inputs:** label 13px Stone, InputGroup border white/10 bg Ghost rounded-xl, focus border Periwinkle/50 ring Periwinkle/20.
* **Interactive states:** hover transitions 150ms ease, focus-visible ring 3 Periwinkle/50, active press 1px down, disabled opacity 50. No custom cursor, no outer glow.

## 5. Layout Principles — Structural
- Container max-w-6xl (1152px) centered, 24px gutters, section py clamp 4rem–6rem. Every section top has 1px hairline gradient transparent→white/8→transparent.
- 12-col mental grid: Hero 7/5 split, Features 4/4/4, Testimonial 8/4 or 3 cards, FAQ centered 720px.
- Background grid: linear-gradient white/3 1px every 48px + radial mask ellipse 80% 60% at 50% 0%. Orbs: 340–880px blur 60–90px at 4–14% opacity (Periwinkle + White only).
- Card bays use p-[1px] wrapper for accent border, inner radius 23px.
- No overlapping, no absolute stacking, no 3 identical cards — middle always accented.
- Mobile: everything collapses single column, pill nav becomes horizontal scroll, hero card stacks below copy, tabs become full-width.

## 6. Motion & Interaction — Humanized
- Spring: stiffness 100, damping 20. Animate transform + opacity only. Grain/noise fixed.
- Perpetual micro: Avatar stack gentle float 6s, hero badge pulse on DELIVERED not spin.
- Stagger: feature 60ms cascade, testimonial 80ms, product grid 40ms on tab change.
- Hover: cards lift -2px + border white/12, buttons darken 8%, tabs slide indicator.
- Dialog: Radix overlay fade + content scale 98→100, focus trap, close on overlay click.
- Reduced-motion: disable orb drift and float, keep fade.

## 7. Anti-Patterns (Banned)
- No hue outside grey/white/Periwinkle — no emerald, amber, red pills (remapped to grey+logo), no pure black, no warm grey contamination
- No Inter, no serif, no gradient h1, no 3 equal flat cards
- No neon glow, no oversaturated accent >70%, no second accent
- No overlapping type on images, no centered hero, no absolute stack
- No generic avatars — use picsum.photos 80–100 or initials fallback periwinkle
- No circular spinners — skeleton pulse rounded-[12px] bg Muted
- No SYSTEM METRICS fake numbers, no LABEL // YEAR, no AI clichés (Seamless, Elevate, Unleash)
- No custom cursor, no scroll-jack, no horizontal overflow on mobile, no broken a11y (keep Radix aria, keyboard, focus ring)

## 8. Fluid Interaction — Apple discipline, structural restraint
Apple fluid-interface rules applied without breaking the grey + logo system:
- **House springs:** critically damped default (`bounce 0, ~0.55s` via `components/reveal.tsx`, `springDefault`/`springSnappy`). Bounce (`0.2`) only for momentum gestures. Reveal/Stagger/Mount/Pressable primitives; interruptible by construction (springs start from live values).
- **Response:** press feedback instant on pointer-down (`.pressable`, scale 0.97 / 100ms); global `data-slot=button` :active kept.
- **Materials:** floating chrome uses `.material-chrome` (translucent bar, 20px blur + saturate, bright top edge, heavier `.material-chrome--scrolled` + `.scroll-edge-b` fade — never a hard divider). Sticky table heads use `.thead-material`. Never stack translucency.
- **Wayfinding:** scroll-spy nav (landing) + `layoutId` spring pills (`portal-nav-pill`, `portal-category-pill`, `admin-nav-pill`) with `aria-current`; enter/exit along symmetric paths.
- **Type:** `.type-display` (-0.03em / 0.95), `.type-title` (-0.02em / 1.1), `.type-body` (0 / 1.6), `.type-meta` (mono 11px), `.eyebrow` (11px uppercase + periwinkle dot). Outfit kept as brand face with Apple tracking/leading discipline.
- **Structural motion budget:** 60ms stagger, -2px lift (`.lift`), transform + opacity only, 11s+ ambient loops, cross-fade under `prefers-reduced-motion` (MotionConfig `always`), solid surfaces under `prefers-reduced-transparency`, defined borders under `prefers-contrast: more`.
