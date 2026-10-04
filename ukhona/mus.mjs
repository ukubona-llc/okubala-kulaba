#!/usr/bin/env node
// mus.mjs — first take at an ndjson-like, human/machine-readable, queryable music cache.
//   node mus.mjs build            -> writes music.ndjson
//   node mus.mjs q 'k=edge felt=bII-I'      -> filter records (AND of key=value; dotted keys ok; ~= is substring)
//   node mus.mjs next V7          -> next-token distribution from a state
//
// One record per line. Every record has "k" (kind) and "L" (layer 1|2|3 = Engine|Data|Embodied).
// Pentad (index.md V): tension -> release -> tension ... -> I'. Edge records ARE next-token prediction.

import fs from "node:fs";
const OUT = "music.ndjson";
const NAMES = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
const cents = r => 1200 * Math.log2(r);
const rec = [];
const put = o => rec.push(o);

// ── L1 ENGINE: the acoustic dimension (1st class) ───────────────────────────
// II. 12TET is a biased sample of the harmonic series: err = how far partial n sits from nearest 12TET pitch.
for (let n = 1; n <= 16; n++) {
  const c = cents(n), semi = Math.round(c / 100);
  put({ k: "partial", L: 1, n, ratio: n, cents: +c.toFixed(2), pc: semi % 12, oct: Math.floor(semi / 12),
        err_c: +(c - semi * 100).toFixed(2) });           // e.g. n=7 -> -31c, n=11 -> -49c: the sample's blind spots
}

// ── L1 → L2 sampling: root (chromatic) × interval × stack × chord ──────────
NAMES.forEach((name, pc) => put({ k: "root", L: 2, pc, name }));

const JI = { 0:"1/1",1:"16/15",2:"9/8",3:"6/5",4:"5/4",5:"4/3",6:"45/32",7:"3/2",8:"8/5",9:"5/3",10:"9/5",11:"15/8" };
const IV = ["P1","m2","M2","m3","M3","P4","TT","P5","m6","M6","m7","M7"];
IV.forEach((name, semi) => {
  const [a, b] = JI[semi].split("/").map(Number);
  put({ k: "interval", L: 2, semi, name, just: JI[semi], err_c: +(semi * 100 - cents(a / b)).toFixed(2) });
});

// stacks: entirely diatonic building blocks (stacked 3rds), as semitone steps between adjacent members
const STACKS = {
  maj:   [4,3],   min:  [3,4],   dim:  [3,3],   aug:  [4,4],
  maj7:  [4,3,4], dom7: [4,3,3], min7: [3,4,3], hdim7:[3,3,4], dim7: [3,3,3],
};
Object.entries(STACKS).forEach(([id, steps]) => put({ k: "stack", L: 2, id, steps }));

// TEARS (index.md IV): Tension, Extension, Alteration, Rootless. Tags on a chord, queryable.
// genres constrain which chords are legal "tokens" (III).
const chord = (id, root, stack, o = {}) => put({
  k: "chord", L: 2, id, root, stack,
  pcs: [...new Set([0, ...STACKS[stack].reduce((a, s) => [...a, a[a.length - 1] + s], [0])].map(x => x))]
        .map(x => (root + x) % 12).sort((a, b) => a - b),
  tears: { T: o.T ?? [], E: o.E ?? [], A: o.A ?? [], R: o.R ?? false },
  genres: o.genres ?? ["classical"],
});
chord("D",   2, "maj");
chord("A",   9, "maj");
chord("A7",  9, "dom7", { T: ["b7"] });
chord("A/C#",9, "maj");                                    // V6 : bass = 3rd
chord("Em",  4, "min");
chord("Bm",  11,"min");
chord("Bm7", 11,"min7");
chord("G",   7, "maj");
chord("Gmaj7",7,"maj7",{ E: ["7"] });
chord("Cdim7/G#",0,"dim7",{ T:["dim"], R:true });          // illustrative rootless/leading-tone sonority

// ── L2 DATA from the engine: transitions = next-token prediction ───────────
// from/to are functional states (Roman numerals) so the same cache compares Bach, gospel, flamenco, hymns.
// felt = how it FEELS, not what it is (user's V6->V7 ~ bII-I Phrygian vibe). regime: "<->" marks a regime change.
// bass: scale-degree motion of the bass (b2>1 = Phrygian half-step arrival). w = weight (count or prob), null until counted.
const edge = (from, to, o = {}) => put({
  k: "edge", L: 2, from, to, w: o.w ?? null,
  bass: o.bass ?? null, felt: o.felt ?? null, regime: o.regime ?? "->",
  phase: o.phase ?? "release", corpus: o.corpus ?? "theory",
});
edge("V7", "I",   { bass: "5>1", phase: "release",  w: null });
edge("V",  "V7",  { bass: "5>5", phase: "tension" });
edge("I",  "V",   { bass: "1>5", phase: "tension" });
edge("IV", "V",   { bass: "4>5", phase: "tension" });
edge("V6", "V7",  { bass: "3>5", felt: "bII-I", phase: "tension", corpus: "air-A", regime: "->" }); // Phrygian vibe, per analysis
edge("bII","I",   { bass: "b2>1", felt: "bII-I", phase: "release", corpus: "theory" });
edge("I",  "IV",  { bass: "1>4", regime: "<->", phase: "tension" });                              // plagal = regime shift (illustrative)

// ── L2/L3 pieces: events on a timeline, + embodied slot ────────────────────
put({ k: "piece", L: 2, id: "air", title: "Air (Orch. Suite 3, BWV 1068)", composer: "J.S. Bach",
      key: "D", meter: "4/4", tempo: "Adagio", bars: 19, form: "A:||B:||", src: "Air0.pdf", verified: false });
// DRAFT skeleton — only what the score visibly anchors; fill the rest from the Roman-numeral analysis in index.md.
const ev = (bar, beat, chord, fn, phase, o = {}) => put({
  k: "event", L: 2, piece: "air", bar, beat, chord, fn, phase, bass: o.bass ?? null, mel: o.mel ?? null,
  felt: o.felt ?? null, mark: o.mark ?? null, verified: false,
});
ev(1,  1, "D", "I", "release", { bass: "D3", mel: "F#5", mark: "opening, tied melody" });
ev(19, 1, "A", "V", "tension", { mark: "trill (tr) over cadence" });
ev(19, 3, "D", "I'", "release", { bass: "D2", mark: "fermata, final" });

// L3 EMBODIED: experience of engine+data (3rd class). Free-text + tags, attached to any record by ref.
put({ k: "felt", L: 3, ref: { piece: "air", bar: null }, tags: ["phrygian","bII-I","ache"],
      note: "V6 -> V7 in Part A lands like bII-I; the half-step pull is the feeling", by: "A." });

fs.writeFileSync;
// ── CLI ─────────────────────────────────────────────────────────────────────
const [cmd, ...args] = process.argv.slice(2);
const load = () => fs.readFileSync(OUT, "utf8").trim().split("\n").map(l => JSON.parse(l));
const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);

if (cmd === "build") {
  fs.writeFileSync(OUT, rec.map(r => JSON.stringify(r)).join("\n") + "\n");
  console.log(`${rec.length} records -> ${OUT}`);
} else if (cmd === "q") {
  const tests = args.map(a => { const m = a.match(/^([\w.]+)(~?=)(.*)$/); return { p: m[1], sub: m[2] === "~=", v: m[3] }; });
  for (const r of load())
    if (tests.every(t => { const x = get(r, t.p); const s = Array.isArray(x) ? x.join(",") : String(x);
                          return t.sub ? s.includes(t.v) : s === t.v; })) console.log(JSON.stringify(r));
} else if (cmd === "next") {
  const out = load().filter(r => r.k === "edge" && r.from === args[0]);
  const tot = out.reduce((a, e) => a + (e.w ?? 1), 0);
  out.forEach(e => console.log(`${e.from} ${e.regime} ${e.to}  p=${((e.w ?? 1) / tot).toFixed(2)}  bass=${e.bass} felt=${e.felt ?? "-"}`));
} else console.log("usage: build | q key=val ... | next STATE");
