# Cinematic Scroll Experience — Design

Date: 2026-06-10
Status: Approved (sitewide scope, earthy tonal palette)

## Goal

Every page of the Clara Mendes storefront gets a cinematic scroll experience:
a painted WebGL texture background that reacts to the cursor, chapter-based
section reveals driven by scroll, fluid color transitions between chapters
and routes, and buttery smooth scrolling. All of it is progressive
enhancement — SSR markup, SEO, LCP, and the no-JS experience are unchanged.

## Architecture (Approach A — persistent app-shell canvas)

One `CinematicProvider` mounted inside `ClaraShell` owns three session
singletons, booted via dynamic import after hydration goes idle:

| Unit | Responsibility |
| --- | --- |
| `app/components/cinematic/CinematicProvider.tsx` | Lifecycle: idle boot, Three.js renderer on a fixed full-viewport canvas (z-index −1), Lenis instance, pointer/scroll/resize listeners, palette lerping, route-change rescans, teardown |
| `app/components/cinematic/paintedShader.ts` | GLSL vertex/fragment (domain-warped fbm "painted" noise) + named palettes `umber`, `linen`, `clay`, `ink` from brand tokens |
| `app/components/cinematic/chapterOrchestrator.ts` | Framework-free: scans `[data-chapter]` sections, creates GSAP ScrollTriggers for palette switching and `[data-reveal]` rise/fade tweens (once), MutationObserver → debounced `ScrollTrigger.refresh()` for infinite scroll, returns cleanup |

New dependencies: `three`, `gsap` (ScrollTrigger included), `lenis`,
`@types/three` (dev). Loaded lazily in a separate client chunk.

## Painted background

Fullscreen quad, domain-warped fbm fragment shader. Uniforms: `uTime` (slow
drift), `uPointer` (spring-damped cursor, displaces warp origin; autonomous
drift on touch), `uScrollVel` (directional flow from Lenis velocity), three
palette colors lerped on the CPU ~3%/frame toward the target — fluid
transitions between chapters and across navigations for free. DPR capped at
1.5 (1.25 mobile), no antialiasing, rAF naturally pauses on hidden tabs.
Existing CSS grain/noise overlays stay on top.

## Chapters

Sections opt in with `data-chapter="<palette>"`; crossing the midpoint sets
the target palette. `data-reveal` children get a staggered rise/fade
(transform/opacity only, `once: true`, `autoAlpha` so no-JS never hides
content). Pages without chapters default to `linen`.

Assignments: homepage hero untouched (already cinematic); below it quick-shop
= linen, collections carousel = clay, atmosphere = umber, featured = linen,
story = ink. Our Story = clay → umber → ink. Commerce pages = ambient linen
default, no markup changes. Product card grids keep their existing CSS
animations (no double animation); infinite-scroll-appended cards are not
re-animated.

Surfaces switch from solid paper to translucent washes (~85% editorial, ~90%+
commerce) so paint shows through. Body keeps solid paper — without WebGL the
site is pixel-identical to today.

## Smooth scroll

Sitewide Lenis on window, `lerp: 0.1`, driven by GSAP ticker;
`lenis.on('scroll', ScrollTrigger.update)`. Touch stays native. Cart drawer
and mobile nav get `data-lenis-prevent`. Verify React Router
ScrollRestoration cooperation.

## Failure modes / accessibility

- `prefers-reduced-motion`: no Lenis, no reveals, single static painted frame.
- WebGL/chunk failure: try/catch, single `console.warn`, site identical to today.

## Testing

typecheck / lint / build; preview: chapter transitions, reveals fire once,
collection infinite scroll + sort under Lenis, cart drawer scroll, palette
continuity across navigation, clean console.
