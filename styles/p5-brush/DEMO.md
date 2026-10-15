# p5.brush Natural Media — our demo

One example among many, and only a suggestion: this style is open (see STYLE.md), so *First Light* shows one thing p5.brush can do, not how a p5.brush film must look. Don't reuse its story, arc, shots, props, palette, score or timings; reuse its engine code only as tools.

Demo: *First Light* (24 s) · `p5-brush.mp4` · [**watch or download** (release `first-light`)](https://github.com/JarifHassan/lemo-opuscar-43-styles/releases/tag/first-light) · source in [`demo/`](demo/)

## Story & structure

A drop of gold lands on a blank sketchbook page and blooms into the sun. Sunrise colour sweeps across a pencilled valley and paints it: violet peaks with sunlit ridges and snow, a pine shore, a lake with the sun's road on it, a meadow in flower. A kingfisher-blue bird swoops in, hovers over the water, dives, and bursts out with a fish; it climbs through the sun, off the painting and into the page's margin, where it becomes a pencil sketch beside a handwritten note. The camera pulls back to the whole page on a desk.

Arc: blank → the world painted (setup) → the hunt and the dive (turn) → the bird leaves the painting, the page as an object (ending that echoes the blank opening). Native moves spent: a drop becomes the subject (0.6 s), colour arrives (3.1–7 s), the painted planes (throughout), light over paint, the page remembers (splash spatter stays), out of the painting (19.4 s).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0–3.1 | close on blank paper where the sun will be | slow pull, z 1.55 → 1.22 | the drop lands on beat 1 and blooms; pencil lines race out |
| 2 | 3.1–7.5 | the valley | crane down through the planes, parallax ramps in | colour arrives from the sun with a wet front |
| 3 | 7.5–10.6 | wide | lateral dolly right → left, full parallax | god rays, sparkle, mist, birds |
| 4 | 10.6–12.5 | the bird enters large from the left | whip toward it, then follow and push | ghosts + dry-brush streaks |
| 5 | 12.5–13.75 | hover over the water | slow push to z 1.7, bird ≈ ⅓ of the frame | flutter blur; music falls away |
| 6 | 13.75–14.4 | the dive | tilt down with it | true silence except the wings and the whistle |
| 7 | 14.4–15.0 | splash | punch-in + short shake | crown, column, gouache foam, spatter that stays |
| 8 | 15.0–17.5 | burst with the fish, climb | crane up after it | full score |
| 9 | 17.5–20.2 | past the sun, out of the painting | pull back, parallax flattens to 0 | the bird turns to pencil in the margin |
| 10 | 20.0–24.0 | the page on the desk | settle at z 0.55 | title, notes and date written on; a pencil on the desk |

## Score structure

96 BPM, 4/4, D major with a lydian G♯; 9.6 bars. Bar 1: glockenspiel ping on the drop, hand chimes, bowed vibraphone. Bar 2: rising harp arpeggio and a string swell on the sunrise (beat 5). Bar 3: IV, first flute phrase. Bar 4: kalimba ostinato in eighths, flute answer. Bar 5: a flute run lands on beat 17 with the bird, glockenspiel sparkle. Bar 6: everything thins to one bowed note, then **true silence from beat 21** (only the hover flutter and the dive whistle). Beat 23: the splash (foley only). Beat 24: timpani and gran cassa swell into the burst, harp glissando, strings, horns, flute tune at full. Bar 8: IVmaj7 → ii → V, the flute comes down. Bar 9: rolled D(add9) harp chord, chimes, three falling glockenspiel notes; ring out. Mix −14 LUFS; the score is gated to zero through the silence so reverb tails don't leak.

## Palette & props

Sky `#2b5aa8` → `#6a92cf` → `#cdbfd3` → `#f0bc9c` → `#f9b979`; sun rim `#ff9f2e`, core reserved; range `#7f7fbf` with sunlit faces `#f7a283` and shade `#4f4d8c`; hills `#6b9a96` / `#4f8a6c`; pines `#28533a` with sunlit tips `#b5cc62`; lake `#f4bf92` → `#2a589f`, sun's road `#ffb851`; meadow `#c4dc6a` → `#3f7a35`; flowers poppy `#e23b26`, lupine `#7d52c0`, buttercup `#f7c512`. The bird: cobalt `#1d5fc4`, turquoise back `#25b5e0`, orange breast `#ea7a2c`, white throat (reserve), dagger beak `#16161c`. Desk `#a99677`, paper `#f4efe2`.

## End card

The page itself is the end card: "First Light" (Cormorant Garamond italic), "the blue bird · a p5.brush study", "14 June · the lake at dawn", "kingfisher · 6:12 a.m." beside the pencilled bird. This library's demo carries no other sign-off; a user's film carries no copy of this card.

## Build notes

- `sh demo/build.sh` (≈ 15 min with 4 workers on a laptop): fetches fonts → `events.mjs` → `video.mjs` → `mix.py` → `mux.sh` (grain 1).
- Files: `engine.js` (the engine, see STYLE.md §10), `world.js` (six layers: sky, mountains, hills, forest, lake, meadow, plus blurred reeds), `bird.js` (rig), `film.js` (timeline, camera, frame composition, `EV`, `TEXTS`), `mix.py` (score + sound from `events.json`), `index.html`, `fonts/`.
- Load takes ~40 s per worker (the layers are painted once); a frame takes 0.5–2.5 s.
- Frame order per render: desk + page → layers (masked by arrival × page fray) → wet-front tint → sun bloom and rays → paper reserve under the bird → live brush layer (multiply) → gouache → foreground reeds → small lights → handwriting → post → paper tooth → the pencil on the desk.
- Pitfalls tied to this demo: the dive end point is the bird's body, not its beak, so the splash covers the hand-over; the margin note sits left of the pencil bird so the wings never cross it.
