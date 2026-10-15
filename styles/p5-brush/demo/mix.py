"""First Light: original score + sound design, driven by the film's events.json (window.EV) -> out/mix.wav.

Score: D major with a lydian lift, 96 BPM, 4/4 (one beat = 0.625 s), in the style's acoustic palette:
harp, flute, light strings, kalimba, glockenspiel, hand chimes, bowed vibraphone, horn, timpani.
One true silence (bar 6, beats 21-23): only the hovering wings; the splash is the first sound after it.
Run from anywhere: LIB defaults to the library root three folders up.
"""
import json, os, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, LIB)
from core.audio import sampler as S                                  # noqa: E402
from core.audio.sfx import SR, add, bp, lp, hp, noise, norm, t_, env_exp, thump, whoosh, limit  # noqa: E402

DUR = 24.0
BEAT = 0.625
ev = json.load(open(os.path.join(HERE, 'events.json'), encoding='utf-8'))
EV = ev['ev'] if isinstance(ev, dict) else ev
rng = np.random.default_rng(44)
S.seed(44)
N = int(DUR * SR)


def buf(): return np.zeros((N, 2), np.float32)


def at(type_):
    return [e for e in EV if e['type'] == type_]


def b(n): return n * BEAT   # beat -> seconds


# ---------------------------------------------------------------- score
notes = []   # (t, inst, pitch, dur, vel, pan[, gain])
def n(t, inst, p, d, v, pan=0.0, g=1.0): notes.append((t, inst, p, d, v, pan, g))

# bar 1: the drop. a glockenspiel ping on beat 1, chimes, a bowed pad breathing in
n(b(1), 'glockenspiel', 'A6', 1.2, .55, .35); n(b(1) + .02, 'hand_chimes', 'F#5', 2.0, .35, .3)
n(0.9, 'vibraphone_bowed', 'D4', 4.0, .32, -.2); n(1.2, 'vibraphone_bowed', 'A4', 3.8, .28, .2)
for i, p in enumerate(['E6', 'A5', 'F#6']): n(1.6 + i * b(1), 'glockenspiel', p, .8, .22, .4 - i * .2)
# bar 2: sunrise. a rising harp arpeggio, strings swell in
for i, p in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4', 'C#5', 'E5', 'F#5', 'A5', 'C#6', 'E6']): n(b(5) + i * b(.25), 'harp', p, 2.2, .45 + i * .02, -.5 + i * .09)
for p, v, pan in [('D4', .32, -.3), ('F#4', .3, 0), ('A4', .3, .3)]: n(b(5), 'violins', p, 4.6, v, pan)
n(b(5), 'cellos', 'D3', 4.6, .36, -.2); n(b(5), 'violas', 'A3', 4.6, .28, .1)
# bar 3: IV with the raised 4th; the flute's first phrase
for p, pan in [('G4', -.3), ('B4', 0), ('D5', .3)]: n(b(8), 'violins', p, 2.6, .3, pan)
n(b(8), 'cellos', 'G2', 2.6, .36); n(b(8), 'harp', 'G2', 2.0, .5, -.3)
for t, p, d in [(b(8), 'A5', b(2)), (b(10), 'F#5', b(1)), (b(11), 'G#5', b(.5)), (b(11.5), 'E5', b(.5))]: n(t, 'flute', p, d, .5, .15)
# bar 4: the wide. a kalimba ostinato starts, the flute answers
for i in range(16): n(b(12) + i * b(.5), 'kalimba', ['D5', 'A4', 'F#4', 'A4'][i % 4], .6, .42 if i % 4 == 0 else .32, .35)
n(b(12), 'harp', 'D2', 2.5, .55, -.3); n(b(12), 'contrabass_pizz', 'D2', 1.0, .5, -.2); n(b(14), 'contrabass_pizz', 'B1', 1.0, .45, -.2)
for p in ['D4', 'F#4', 'A4']: n(b(12), 'violins', p, 2.5, .26, 0)
for t, p, d in [(b(12), 'D6', b(1.5)), (b(13.5), 'C#6', b(.5)), (b(14), 'B5', b(1)), (b(15), 'A5', b(1))]: n(t, 'flute', p, d, .52, .15)
# bar 5: the bird. a flute run lands on beat 17, glockenspiel sparkle, the groove moves to IV
run = ['D5', 'E5', 'F#5', 'G#5', 'A5', 'B5', 'C#6', 'D6']
for i, p in enumerate(run): n(b(17) - (len(run) - i) * .045, 'flute_stac', p, .1, .5 + i * .04, -.4 + i * .1)
n(b(17), 'flute', 'D6', b(1.5), .62, .2)
for i, p in enumerate(['D6', 'F#6', 'A6', 'D7']): n(b(17) + i * .16, 'glockenspiel', p, .8, .45, .3)
for i in range(8): n(b(16) + i * b(.5), 'kalimba', ['G4', 'D5', 'B4', 'D5'][i % 4], .6, .36, .35)
for p, pan in [('G4', -.3), ('B4', -.1), ('D5', .1), ('F#5', .3)]: n(b(16), 'violins', p, 2.5, .34, pan)
n(b(16), 'cellos', 'G2', 2.5, .4); n(b(16), 'contrabass_pizz', 'G1', 1.0, .5)
for t, p, d in [(b(18.5), 'C#6', b(.5)), (b(19), 'B5', b(1))]: n(t, 'flute', p, d, .5, .2)
# bar 6: hover. everything thins to a high bowed note, then nothing (beats 21-23)
n(b(20), 'vibraphone_bowed', 'E5', b(1) + .3, .3, .1); n(b(20), 'violin', 'A5', b(1) + .2, .22, -.1)
# bar 7: the burst. timpani roll swells into beat 24, harp glissando, the full tune
notes.append(dict(t=14.45, inst='gran_cassa', pitch='cresc', dur=.55, vel=.35, pan=0))
n(b(24), 'timpani', 'D3', 1.6, .62, -.1); n(b(24), 'gran_cassa', 'hit', 1.2, .4, 0)
for i, p in enumerate(['D3', 'E3', 'F#3', 'A3', 'B3', 'D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5', 'B5', 'D6']): n(b(24) + i * .022, 'harp', p, 1.6, .5 + i * .02, -.6 + i * .08)
for p, v, pan in [('D4', .45, -.4), ('F#4', .42, -.15), ('A4', .42, .15), ('D5', .4, .4)]: n(b(24), 'violins', p, 2.5, v, pan)
n(b(24), 'violas', 'A3', 2.5, .38); n(b(24), 'cellos', 'D3', 2.5, .45, -.2); n(b(24), 'contrabass', 'D2', 2.5, .35, -.2)
n(b(24), 'horn', 'D4', 2.5, .32, -.3); n(b(24), 'horn', 'A4', 2.5, .28, .3)
for t, p, d in [(b(24), 'A5', b(1)), (b(25), 'D6', b(1.5)), (b(26.5), 'C#6', b(.5)), (b(27), 'B5', b(1))]: n(t, 'flute', p, d, .62, .1); n(t, 'glockenspiel', p.replace('5', '6').replace('6', '6'), .6, .25, .4)
for i in range(8): n(b(24) + i * b(.5), 'kalimba', ['D5', 'A4', 'F#5', 'A4'][i % 4], .6, .38, .35)
# bar 8: past the sun. IV maj7 -> ii9 -> V; the flute comes down
for p, pan in [('G4', -.3), ('B4', -.1), ('D5', .1), ('F#5', .3)]: n(b(28), 'violins', p, b(2), .38, pan)
for p, pan in [('E4', -.2), ('G4', 0), ('B4', .2)]: n(b(30), 'violins', p, b(1), .34, pan)
for p in ['E4', 'A4', 'C#5']: n(b(31), 'violins', p, b(1), .34, 0)
n(b(28), 'cellos', 'G2', b(2), .42); n(b(30), 'cellos', 'E2', b(1), .4); n(b(31), 'cellos', 'A2', b(1), .4)
for t, p, d in [(b(28), 'A5', b(1)), (b(29), 'G5', b(.5)), (b(29.5), 'F#5', b(.5)), (b(30), 'E5', b(2))]: n(t, 'flute', p, d, .55, .1)
for i, p in enumerate(['G3', 'D4', 'B4', 'F#5', 'E3', 'B3', 'G4', 'A4']): n(b(28) + i * b(.5), 'harp', p, 1.5, .42, -.3 + (i % 4) * .2)
n(b(28), 'glockenspiel', 'A6', 1.0, .3, .5)
# bar 9: home. a rolled D(add9) in the harp, chimes, three last glockenspiel notes, ring out
for i, p in enumerate(['D3', 'A3', 'E4', 'F#4', 'A4', 'D5', 'E5']): n(b(32) + i * .06, 'harp', p, 3.6, .5, -.4 + i * .13)
n(b(32), 'hand_chimes', 'D6', 3.5, .4, .3)
for p, pan in [('D4', -.3), ('A4', 0), ('E5', .3)]: n(b(32), 'violins', p, 3.6, .3, pan)
n(b(32), 'cellos', 'D3', 3.6, .36); n(b(32), 'vibraphone_bowed', 'F#5', 3.6, .25, .2)
for i, p in enumerate(['A6', 'F#6', 'D6']): n(b(33) + i * b(1), 'glockenspiel', p, 1.6, .32 - i * .05, .4 - i * .2)

events = [dict(t=x[0], inst=x[1], pitch=x[2], dur=x[3], vel=x[4], pan=x[5], gain=x[6]) if isinstance(x, tuple) else x for x in notes]
music = S.render(events, dur=DUR + 2, master=False)[:N]
music = S.room(music, size=.55, mix=.24)
# the silence is total: nothing from the score between beat 21 and the burst (reverb tails included)
fade = np.ones(N, np.float32); a, z = int(b(21) * SR), int(b(21.4) * SR); fade[a:z] = np.linspace(1, 0, z - a); fade[z:int(b(24) * SR) - 2400] = 0
fade[int(b(24) * SR) - 2400:int(b(24) * SR)] = np.linspace(0, 1, 2400)
fade[int(14.45 * SR):int(b(24) * SR)] = np.maximum(fade[int(14.45 * SR):int(b(24) * SR)], np.linspace(0, 1, int(b(24) * SR) - int(14.45 * SR)))   # the timpani/drum swell
music *= fade[:, None]

# ---------------------------------------------------------------- sound design
fx = buf()
def silence_gate(t): return 0.0 if b(21.2) < t < b(23) else 1.0


def pan_sweep(x, at_, p0, p1, gain=1.0):
    s = int(at_ * SR); e = min(N, s + len(x)); x = x[:e - s]
    p = np.linspace(p0, p1, len(x)); l, r = np.cos((p + 1) * np.pi / 4), np.sin((p + 1) * np.pi / 4)
    fx[s:e, 0] += x * l * 1.414 * gain; fx[s:e, 1] += x * r * 1.414 * gain


def pencil(d, rate=6.0):
    x = bp(noise(d), 1600, 7500)
    grain = 0.35 + np.abs(lp(noise(d), 40)) * 4
    strokes = np.sin(np.pi * ((t_(d) * rate + rng.random()) % 1)) ** 1.5
    clicks = (rng.random(len(x)) > 0.9993) * rng.random(len(x)) * 3
    return norm(x * np.clip(grain, 0, 1.4) * strokes + hp(clicks, 3000)) * np.sin(np.pi * t_(d) / d) ** .3


def plink(f=1200, v=1.0, d=.18):
    tt = t_(d); ph = 2 * np.pi * np.cumsum(f * (1 - .45 * (1 - np.exp(-tt / .02)))) / SR
    return norm(np.sin(ph) * env_exp(d, .035) + bp(noise(d), 2000, 6000) * env_exp(d, .004) * .3) * v


def wet(d, lo=700, hi=4200):
    x = bp(noise(d), lo, hi) * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * t_(d)))
    return norm(x * np.sin(np.pi * t_(d) / d) ** 1.5)


def chirp(f0, f1, d=.09):
    tt = t_(d); f = f0 + (f1 - f0) * (tt / d) ** .7; ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + .25 * np.sin(2 * ph)) * np.sin(np.pi * tt / d) ** 2


def song(seed):
    r = np.random.default_rng(seed); k = r.integers(3, 7); out = np.zeros(int(1.2 * SR))
    for i in range(k):
        f0 = r.uniform(2600, 4800); x = chirp(f0, f0 * r.uniform(.6, 1.5), r.uniform(.05, .12)); s = int(i * r.uniform(.09, .16) * SR)
        out[s:s + len(x)] += x * r.uniform(.5, 1)
    return out


def flap(v=1.0):
    d = .09; return norm(bp(noise(d), 180, 1300) * np.sin(np.pi * t_(d) / d) ** 2 * env_exp(d, .05)) * v


# paper room tone, the whole film
add(fx, norm(lp(noise(DUR), 700)) * .012, 0, 1.0)
# pencil underdrawing and the writing at the end
for e in at('pencil'): add(fx, pencil(e['d']), e['t'], .13, rng.uniform(-.4, .4))
for e in at('write'): add(fx, pencil(e['d'], rate=9), e['t'], .11, .0)
# the drop and its bloom
e = at('drop')[0]; add(fx, plink(1300), e['t'], .5, .3); add(fx, plink(2100, .5, .1), e['t'] + .05, .2, .35)
e = at('bloom')[0]; add(fx, wet(e['d'], 500, 2500), e['t'], .14, .3)
# the colour arriving: a wet brush sweeping from the sun (right) across the sheet
e = at('wash')[0]; pan_sweep(wet(e['d']), e['t'], .7, -.7, .2)
# ambience: birds J-cut in before the colour reaches them; wind; water once the lake is painted
amb = buf()
tb = at('birdsJ')[0]['t']; t = tb
while t < DUR - .8:
    if silence_gate(t) and silence_gate(t + 1.2): add(amb, song(int(t * 100)), t, rng.uniform(.04, .09) * min(1, (t - tb) / 1.5 + .2), rng.uniform(-.8, .8))
    t += rng.uniform(.7, 1.9)
wind = norm(bp(noise(DUR), 150, 900)) * (0.6 + 0.4 * np.sin(2 * np.pi * .13 * t_(DUR)))
water = norm(lp(noise(DUR), 500)) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * .7 * t_(DUR)))) * np.clip((t_(DUR) - 5) / 2, 0, 1)
add(amb, wind * np.clip((t_(DUR) - 3.5) / 3, 0, 1), 0, .03, -.2); add(amb, water, 0, .035, .1)
gate = np.array([silence_gate(x) for x in np.arange(0, N, 480) / SR]).repeat(480)[:N]
gate = np.convolve(gate, np.ones(4800) / 4800, mode='same')
amb *= gate[:, None]
fx += amb
# the bird: a pass-by whoosh that crosses the stereo field, wingbeats, the hover, the dive
e = at('pass')[0]; pan_sweep(whoosh(.6), e['t'] - .15, -.9, .5, .35)
for e in at('flap'): add(fx, flap(e.get('v', 1)), e['t'], .22, e.get('pan', 0))
e = at('hover')[0]; d = e['d'] + .05
flutter = norm(bp(noise(d), 160, 1100)) * (0.5 + 0.5 * np.sin(2 * np.pi * 10 * t_(d))) ** 2 * np.clip(t_(d) / .2, 0, 1)
add(fx, flutter, e['t'], .16, .05)
e = at('dive')[0]; d = at('splash')[0]['t'] - e['t']
tt = t_(d); ph = 2 * np.pi * np.cumsum(2600 - 1700 * (tt / d) ** 1.4) / SR
whistle = (np.sin(ph) * .25 + bp(noise(d), 1200, 5000) * .8) * (tt / d) ** 2
add(fx, norm(whistle), e['t'], .22, 0)
# the splash: the first sound after the silence. a thump, a bright crash, a bubbly gurgle, droplets
ts = at('splash')[0]['t']
add(fx, thump(1.0, 58), ts, .55); add(fx, thump(.7, 95), ts + .01, .3)
cr = hp(noise(1.2), 900) * env_exp(1.2, .18); add(fx, norm(cr), ts, .32, -.15); add(fx, norm(hp(noise(1.2), 900) * env_exp(1.2, .16)), ts + .006, .32, .15)
for i in range(14): add(fx, plink(rng.uniform(500, 1100), rng.uniform(.4, .9), .12), ts + .03 + rng.random() * .25, .12, rng.uniform(-.5, .5))
for i in range(18): add(fx, plink(rng.uniform(1500, 3200), rng.uniform(.3, .8), .1), ts + .25 + rng.random() * 1.1, .1, rng.uniform(-.7, .7))
e = at('under')[0]; add(fx, norm(lp(noise(e['d']), 350) * np.sin(np.pi * t_(e['d']) / e['d'])), e['t'], .12)
tb = at('burst')[0]['t']; add(fx, thump(.6, 80), tb, .3); add(fx, norm(hp(noise(.6), 1200) * env_exp(.6, .12)), tb, .25); pan_sweep(whoosh(.5), tb, 0, .4, .25)
e = at('drips')[0]
for i in range(16): add(fx, plink(rng.uniform(1800, 3600), .6, .08), e['t'] + rng.random() * e['d'], .09, rng.uniform(-.3, .6))

# ---------------------------------------------------------------- mix
fx[:, 0] = hp(fx[:, 0], 90); fx[:, 1] = hp(fx[:, 1], 90)
mix = music * 0.85 + fx
for c in range(2): mix[:, c] = limit(mix[:, c], .92)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
used = sorted({e['inst'] for e in events})
open(os.path.join(HERE, 'out', 'instruments.txt'), 'w', encoding='utf-8').write('\n'.join(used) + '\n\n' + '\n'.join(S.credits(used)))
print('mix.wav', mix.shape, 'peak', float(np.abs(mix).max()), 'instruments', used)
