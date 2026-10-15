# p5.brush Natural Media — Style Prompt

> **An open style.** Unlike the other styles in this library, almost nothing here is a fixed rule. The only thing that defines the style is the **medium**: marks made with p5.brush (its pencils, pens, markers, charcoal, hatching, watercolour fills and flow fields), on paper. Everything else in this file (the sketchbook page, the depth layers, the colour arriving, the light, the palettes, the camera moves, the sound) is a **suggested toolkit** learned from one demo, *First Light*. Use what serves the user's idea, change it, or leave it out. A p5.brush film can be ink-only, flat, abstract, night-time, urban, graphic, fast, with no landscape and no bird.
> **Hard facts** are only the technical ones about how p5.brush and the render pipeline behave: §2 (engine and compositing) and §9 (pitfalls). They are true whatever the film looks like.
> **First Light is an example, not a template.** Never reuse its story (drop → sunrise → bird → dive → margin), its subject, its palette, its camera route, its score or its end card. Start from the user's prompt.
>
> The look our demo used: a sketchbook landscape painted by a generative brush, with graphite underdrawing, faceted watercolour glazes that pool at their edges, pen and pencil marks, gouache whites, and real light (bloom, rays, sparkle) over the paper. The world sat in painted depth layers that slide past each other, and colour *arrived* across the page as a wet front.
> References for that look (grammar only): plein-air watercolour sketchbooks (pencil first, glazes over, paper left white for light); layered paper-theatre and multiplane animation (flat painted planes at different depths). Borrow the grammar, never a specific artwork, character, layout or melody.

## 1. Essence, and what it is not

The one constant: **the marks are p5.brush marks.** Below are traits that make a frame read as "painted with p5.brush" in one glance; they are strong defaults, not requirements:

- **Faceted translucent glazes.** Every coloured area is a p5.brush watercolour fill: a stack of slightly deformed translucent polygons whose edges darken where pigment pools. Large areas are built from several overlapping bands, never one flat shape.
- **Pigment multiplies, light adds.** Paint darkens the paper and never lightens it; whites are either unpainted paper (reserves) or opaque gouache painted last. Sun, sparkle, glow and rays are light on top of the page, never paint.
- **Depth by painted planes.** Five to seven layers (sky, far range, hills, a far shore, water or ground, a near bank, a blurred foreground) move at different speeds. Far planes are cool, pale and violet; near planes are warm, saturated and textured.
- **The underdrawing shows.** Graphite contours are drawn first and stay visible under the colour, like a real study.
- **The page is an object.** Cotton paper with mottling and tooth; the painting ends in a ragged edge and a spray of dabs; the margin holds handwriting.

Not Watercolor Brush (that style paints ribbon strokes with bristle tracks and no faceting; here the glaze polygons are the mark), not Urban Sketch (no fineliner-led reportage; pencil supports, colour leads), not Impasto (nothing opaque except gouache whites), not a flat vector illustration with a texture on top.

## 2. Materials & rendering

- **Engine: the standalone build of p5.brush** (`/node_modules/p5.brush/dist/brush.esm.js`, no p5.js). Every frame is `clear → draw → brush.render()`. Every mark reseeds the brush RNG from its own id (`seeded(id, …)`), so any frame renders alone, in any order, on any worker.
- **Layers as sprites.** Each depth plane is painted once at load with p5.brush onto ONE shared WebGL canvas (p5.brush keeps GPU resources per context), then turned into a "paper × pigment" sprite cut out by its silhouette, so nearer planes hide farther ones. Paint at world scale (1 sprite px = 1 world px) over a region well past the frame, so parallax never shows an edge.
- **Live pigment** (characters, splashes, pencil being drawn) is drawn each frame on a white brush canvas and **multiplied** onto the composite. Before multiplying a character, reserve paper under its silhouette so it reads as a body, not a tint.
- **Gouache** (foam, highlights on paint, snow) is opaque off-white painted after the pigment pass; a white fill in a multiply layer does nothing.
- **Fills**: `fillBleed` 0.005–0.03 (higher bleed on big shapes makes zig-zag spikes), `fillTexture(0.4–0.55, 0.15–0.35)`, opacity 150–245, two passes for depth of colour. Sample big bands every ≤ 24 px so facets stay small.
- **Marks**: `HB`, `2B`, `cpencil` for graphite and grass; `pen` for ink accents and contours; `marker` and `pastel` for dry-brush streaks; `spray` for water spray. Grass is hundreds of short strokes plus tapered blade clumps.
- **Light pass** (screen / lighter): sun bloom, god rays drawn at quarter resolution and blurred, sparkles as four-point stars on a 12 fps twinkle grid, dust in the light.
- **Post**: contrast ×1.1–1.15 and saturation ×1.2, a soft glow, a warm/cool grade, vignette, then paper tooth multiplied over the page.

## 3. Colour logic

Defaults that worked in a painted landscape; pick a different logic when the idea needs it (monochrome ink, neon night, two-colour print, black paper with light pigments).

- **Two temperatures.** A warm key (the light source and what it touches: peach, gold, coral rims) against cool shade (violet, cobalt, blue-green). Light-facing faces of every form get a warm rim; the other side gets a violet glaze.
- **Aerial perspective** (when there is depth): farther planes are lighter, cooler and less saturated; the nearest planes carry the purest greens and the darkest darks.
- **Paper is the white.** Never paint pure white; reserve it, or add gouache.
- **The hero owns one saturated hue** that no background uses (e.g. kingfisher cobalt + orange against a gold-violet world), so it is findable at thumbnail size.
- **Accents are tiny and rhythmic**: poppies, buttercups, lupine spikes; a scatter of small saturated dots reads as life.
- Example palettes: dawn lake (cobalt → peach sky, violet range, pine greens, gold road on the water; hero cobalt/orange); autumn orchard (teal sky, rust and ochre trees, plum shadows; hero a red kite); winter harbour (grey-lilac sky, slate water, white reserves; hero a yellow ferry).

## 4. Type & subtitles

- All text is **written on the page**, in ink, revealed left to right like handwriting, and moves with the camera: a casual hand (e.g. Caveat) for notes and dates, an elegant italic serif (e.g. Cormorant Garamond Italic) for titles. Fonts are OFL, self-hosted.
- Notes live in the **margin** beside what they describe, with a short pencil leader.
- Subtitles, if there is a voice: handwritten lines in the lower margin or a strip of paper at the bottom, ink at ~85 %, never a box. Hold ≥ max(1.8 s, speech + 0.6 s); a title ≥ 4 s; report every text in `window.TEXTS` with its screen box.

## 5. Motion quality

- **Camera and light move every frame, smoothly** (monotone keyframe tracks, cubic easing). Characters' lines and washes **boil on twos** (re-seeded 12 times a second); the painted world does not boil.
- **Painting-in is a motion**: pencil contours draw on by length; colour arrives through an arrival field with a ragged wet front and a thin darker rim; flowers and dabs pop in staggered.
- **Fast action gets painted motion blur**: two or three fading ghosts of the pose plus dry-brush streaks along the path; fast flutter gets extra translucent wing passes.
- **Water and air move gently**: ripples drift and boil at 8 fps, sparkles twinkle, mist bands drift, foreground grasses sway (skew `0.018·sin(1.15t)+0.007·sin(2.7t+1)`).
- Anticipation, action, follow-through on every meaningful move (a lift before a dive; a burst before a climb).

## 6. Camera grammar

A 2.5D camera over painted planes: the camera position `c` and zoom `z`; a plane of depth `d` sees `m = lerp(1, d, P)` of the move, where parallax `P` ramps 0 → 1 when the world wakes and back to 0 when the page is revealed as a flat object. A vocabulary, not a route.

| Move | What it expresses | Can serve |
|---|---|---|
| Close on blank paper, slow pull | before anything exists | a first idea; a dawn; a question |
| Crane down through the planes | arriving in a place | a valley; a city; a reef |
| Lateral dolly with full parallax | a world with depth, observed | a landscape; a procession; a street |
| Whip toward an entrance, then follow | something alive arrives | an animal; a vehicle; a messenger |
| Push-in to the hero (≥ ⅓ frame) | attention, held breath | a hunt; a decision; a reveal |
| Punch-in with a short shake | impact | a splash; a door slam; a catch |
| Crane up after the subject | release, a new level | a take-off; a launch; a summit |
| Pull back to the whole page, parallax flattening | the painting as an object; scale | an ending; a diary entry; a summary |

Framing: keep every parallax shot inside the painting (`|c − edge| ≥ 960 / z`); far planes barely zoom, so push-ins feel deep. Transitions: colour arrival, a page reveal, ink or water spreading, a continuous move; no dissolves, no hard cuts inside the page.

## 7. Sound palette

What our demo used, as a starting point. Choose the music and sound for the user's subject: a p5.brush film can carry jazz, electronics, a choir or near-silence just as well.

- **Music**: acoustic and luminous: harp, flute, light strings, kalimba, glockenspiel, hand chimes, bowed vibraphone, a soft horn and timpani for the peak. Sampled (`core/audio/sampler.py`), never generic piano-and-strings.
- **Foley of the medium**: graphite scratch (band-passed noise 1.6–7.5 kHz with grain clicks) for every pencil line and handwritten word; a wet-brush "shhh" for blooms and the arriving colour, panned along its sweep; a water-drop plink.
- **Foley of the world**: birdsong (synthesised chirps), wind, water lapping, wingbeats panned with the subject, a whoosh crossing the stereo field, splashes built from a thump + bright crash + droplets.
- **Silence**: a bar of true silence, ambience included, before the peak; only the subject's own sound may remain (a flutter, a breath). The first sound after it is the most important sound in the film.
- **Mix**: J-cut the place's ambience before its colour arrives; foley high-passed ~90 Hz; music under key foley; −14 LUFS master.

## 8. Native moves

A menu, not a checklist. Invent new moves from what p5.brush can do: hatching that builds a shadow, a flow field that becomes wind or current, charcoal smudged into smoke, a marker line that turns into the path a character walks.

- **Colour arrives.** A wet front sweeps from a cause (the sun, a lamp, a spill) across the pencilled page, painting the world as it passes. *Fits content like:* a sunrise over a city; a power grid coming back on; spring reaching a valley.
- **A drop becomes the subject.** One drop of pigment lands on blank paper and blooms into the thing the film is about. *Fits content like:* a sun; a planet; a drop of ink that becomes a map.
- **The painted planes.** Full multiplane parallax over p5.brush glazes, so a flat painting becomes a place you travel through. *Fits content like:* a mountain pass; an aquarium; a skyline at dusk.
- **Light over paint.** Bloom, rays and sparkle laid on the glazes so the page glows. *Fits content like:* a lighthouse; a stage; a forge.
- **Out of the painting.** A subject crosses the painting's ragged edge and becomes a pencil sketch in the margin, beside a handwritten note. *Fits content like:* a field-guide entry; an artist's diary; the last frame of a story.
- **The page remembers.** Spatter from an impact stays on the paper to the end. *Fits content like:* a splash; a spilled coffee; a stamp.

## 9. Pitfalls of the medium

- Large fills with high `fillBleed` grow zig-zag spikes → keep bleed ≤ 0.03 and build large areas from bands.
- `brush.clear()` with no colour gives transparent *white*; for a multiply layer clear to `#ffffff` explicitly.
- A new WebGL canvas per sprite makes p5.brush mix GPU resources between contexts → paint every sprite on one shared canvas, then `brush.load(live)` once.
- Painting sprites at module top level blocks the page's load event (the render tools time out at 30 s) → start after `load`, set `READY` when done (the tools wait up to 180 s).
- Feathered silhouette masks leave a paper halo around every shape → mask the exact polygon, blur ≤ 1 px.
- White in the pigment layer is invisible → reserves (paper) or gouache (opaque, after the pigment).
- A character on a mid-depth plane zooms less than the camera → scale the character for the push-in, or give it a nearer depth.
- Parallax reveals sprite and painting edges → paint past the frame and check the camera bounds per shot.
- Brush names: `pen`, `rotring`, `2B`, `HB`, `2H`, `cpencil`, `pastel`, `crayon`, `charcoal`, `spray`, `marker`; anything else throws.

## 10. Engine

`demo/engine.js`: `initBrush` (live canvas), `seeded`, `fillPoly` / `stroke` / `dot` / `solid` (seeded brush shortcuts in world coordinates), geometry (`partial`, `blob`, `ring`, `band`, `blade`, `place`), `view` / `toScreen` / `set2D` / `withView` (2.5D camera with parallax), `sprite` + `doneSprites` (layers painted once), `Arrival` (colour-arrival mask and wet front), `paperMottle` / `paperTooth`, light (`glowAt`, `star`, `softRays`), `post`, `write` (handwriting reveal). `demo/world.js` holds the layer recipes (`paint`, `silhouettes`, `pencil` per layer); `demo/bird.js` is a posable bird rig (lift, fold, fish, colour → pencil). A minimal new use, a lighthouse plane:

```js
LAYERS.push({ id: 'cliff', depth: 0.7,
  paint() { fillPoly('rock', '#6b5f7a', 230, band(-300, 900, x => 700 - x * 0.2, () => 1500, 20));
            fillPoly('lamp', '#ffd36e', 220, blob('lamp', 520, 480, 30, 30)); stroke('tower', 'pen', '#2a2733', 1, [[520, 700], [520, 500]]); },
  silhouettes: () => [band(-300, 900, x => 700 - x * 0.2, () => 1500, 20)], pencil: () => [] });
```

Then add a `glowAt` at the lamp's screen position in the light pass.

## 11. Variation space

You decide almost everything: subject, place, characters, look within p5.brush (watercolour or ink, layered or flat, landscape or abstract), palette, light, music, opening, ending and camera path. Only the medium is fixed. The examples below are deliberately unlike *First Light*; go further than them.

- Structures: **a field-guide page** (one creature, its habitat painted in around it, notes written as it acts); **a day on one view** (dawn, noon, dusk, night re-glazed over the same pencil drawing); **a journey across planes** (one long lateral move through five places separated by mist).
- Openings: **a pencil line racing across blank paper** and becoming a horizon; **a close-up of a glaze drying**, pulled back to reveal what it is; **a handwritten question in the margin**, answered by painting.
- Endings: **the subject leaves the painting** and becomes a sketch beside a note; **colour drains** back to pencil as the light goes, one lit window left; **the page is turned** and the next spread is blank.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
