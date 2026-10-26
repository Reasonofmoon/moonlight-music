import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inspectMidi, matchMotif } from './smf-theme.mjs';

const vlq = n => {
  const out = [n & 127];
  while ((n = Math.floor(n / 128))) out.unshift((n & 127) | 128);
  return out;
};
const chunk = (tag, data) => {
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  return Buffer.concat([Buffer.from(tag), size, Buffer.from(data)]);
};
const track = events => {
  let tick = 0;
  const bytes = events.map(([time, ...data]) => {
    const delta = time - tick; tick = time;
    return [...vlq(delta), ...data];
  }).flat();
  return chunk('MTrk', [...bytes, 0, 255, 47, 0]);
};
const smf = (tracks, division = 480) => {
  const h = Buffer.alloc(6);
  h.writeUInt16BE(tracks.length === 1 ? 0 : 1, 0);
  h.writeUInt16BE(tracks.length, 2); h.writeUInt16BE(division, 4);
  return Buffer.concat([chunk('MThd', h), ...tracks]);
};
const meta = track([[0, 255, 81, 3, 7, 161, 32], [0, 255, 88, 4, 3, 2, 24, 8],
  [0, 255, 89, 2, 253, 1]]);
const source = { pitches: [60, 62, 62, 65], durationsQuarter: [1, .5, .5, 1] };
const opts = { track: 1, startTick: 960, transpose: 2, timeScale: 1.5,
  onsetToleranceTicks: 12, durationToleranceTicks: 12 };
function melody({ pitches = source.pitches.map(p => p + 2), scale = 1.5,
  gate = 0, shift = 0, extras = [], omit = -1 } = {}) {
  let tick = 960;
  const events = [];
  source.durationsQuarter.forEach((d, i) => {
    if (i !== omit) {
      events.push([tick + shift, 0x90, pitches[i], 90]);
      events.push([tick + shift + d * 480 * scale - gate, 0x80, pitches[i], 0]);
    }
    tick += d * 480 * scale;
  });
  return track([...events, ...extras].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
}
const parse = config => inspectMidi(smf([meta, melody(config)]));

test('metadata, signed key signature, physical tracks and note count', () => {
  const p = parse();
  assert.equal(p.format, 1); assert.equal(p.ppq, 480);
  assert.equal(p.tracks.length, 2); assert.equal(p.notes.length, 4);
  assert.equal(p.tempos[0].bpm, 120);
  assert.equal(p.timeSignatures[0].numerator, 3);
  assert.equal(p.timeSignatures[0].denominator, 4);
  assert.equal(p.keySignatures[0].sharpsFlats, -3);
  assert.equal(p.keySignatures[0].mode, 'minor');
  assert.equal(p.notes[0].track, 1); assert.deepEqual(p.issues, []);
});
test('declared transposition and augmentation pass; undeclared transforms fail', () => {
  const p = parse();
  assert.equal(matchMotif(p, source, opts).pass, true);
  assert.equal(matchMotif(p, source, { ...opts, transpose: 0 }).pass, false);
  assert.equal(matchMotif(p, source, { ...opts, timeScale: 1 }).pass, false);
});
test('same-key wrong theme and contour-only pitches do not pass', () => {
  assert.equal(matchMotif(parse({ pitches: [62, 64, 64, 69] }), source, opts).pass, false);
  assert.equal(matchMotif(parse({ pitches: [64, 66, 66, 69] }), source, opts).pass, false);
});
test('explicit pitch map is accepted only when declared', () => {
  const pitchMap = [63, 61, 61, 70], p = parse({ pitches: pitchMap });
  assert.equal(matchMotif(p, source, opts).pass, false);
  assert.equal(matchMotif(p, source, { ...opts, transpose: 0, pitchMap }).pass, true);
  assert.equal(matchMotif(p, source, { ...opts, pitchMap: [63] }).pass, false);
});
test('ornaments cannot replace missing anchors or shift cumulative onset positions', () => {
  const extras = [[960, 0x90, 64, 80], [1000, 0x80, 64, 0],
    [1665, 0x90, 64, 80], [1680, 0x80, 64, 0]];
  assert.equal(matchMotif(parse({ extras }), source, opts).pass, true);
  assert.equal(matchMotif(parse({ extras, omit: 1 }), source, opts).pass, false);
  assert.equal(matchMotif(parse({ shift: 20 }), source, opts).pass, false);
});
test('accompaniment or wrong physical track cannot satisfy theme', () => {
  const p = inspectMidi(smf([meta, track([]), melody()]));
  assert.equal(matchMotif(p, source, opts).pass, false);
  assert.equal(matchMotif(p, source, { ...opts, track: 2 }).pass, true);
  assert.equal(matchMotif(parse(), source, { ...opts, track: 0 }).pass, false);
});
test('gate shortfall passes at tolerance but fails one tick outside', () => {
  assert.equal(matchMotif(parse({ gate: 12 }), source, opts).pass, true);
  assert.equal(matchMotif(parse({ gate: 13 }), source, opts).pass, false);
});
test('running status, velocity-zero off and FIFO overlapping note pairing', () => {
  const p = inspectMidi(smf([track([[0, 0x90, 60, 80], [10, 60, 90],
    [20, 60, 0], [30, 0x80, 60, 64], [40, 0x80, 61, 0], [50, 0x90, 62, 99]])]));
  assert.deepEqual(p.notes.map(n => [n.startTick, n.endTick, n.velocity]), [[0, 20, 80], [10, 30, 90]]);
  assert.deepEqual(p.issues.map(i => i.code), ['overlapping-note', 'unmatched-note-off', 'dangling-note-on']);
  assert.equal(p.issues.at(-1).startTick, 50);
  const s = { pitches: [62], durationsQuarter: [1] };
  assert.equal(matchMotif(p, s, { track: 0, startTick: 50 }).pass, false);
});
test('same pitch pairing is isolated by physical track and channel', () => {
  const p = inspectMidi(smf([track([[0, 0x90, 60, 80], [5, 0x91, 60, 90],
    [10, 0x81, 60, 0], [20, 0x80, 60, 0]]),
    track([[0, 0x90, 60, 70], [40, 0x80, 60, 0]])]));
  assert.deepEqual(p.notes.map(n => [n.track, n.channel, n.startTick, n.endTick]),
    [[0, 0, 0, 20], [0, 1, 5, 10], [1, 0, 0, 40]]);
});
test('one note cannot satisfy repeated pitches; matching does not fail greedily', () => {
  const s = { pitches: [60, 60], durationsQuarter: [.01, .01] };
  const n = { track: 0, channel: 0, pitch: 60, startTick: 0, endTick: 5, velocity: 90 };
  assert.equal(matchMotif({ ppq: 480, notes: [n] }, s, { track: 0, startTick: 0 }).pass, false);
  // First source note can use either; second can only use the note at tick 5.
  const p = { ppq: 500, notes: [{ ...n, startTick: 5, endTick: 10 }, { ...n, startTick: -5, endTick: 0 }] };
  const m = matchMotif(p, s, { track: 0, startTick: 0, onsetToleranceTicks: 5 });
  assert.equal(m.pass, true); assert.notEqual(m.matchedNotes[0], m.matchedNotes[1]);
});
test('max span, invalid options, SMPTE and malformed structures reject', () => {
  assert.equal(matchMotif(parse(), source, { ...opts, maxSpanTicks: 2159 }).pass, false);
  assert.equal(matchMotif(parse(), source, { ...opts, maxSpanTicks: 2160 }).pass, true);
  assert.equal(matchMotif(parse(), source, { ...opts, timeScale: 0 }).pass, false);
  assert.throws(() => inspectMidi(smf([track([])], 0xe728)), /SMPTE/);
  assert.throws(() => inspectMidi(smf([track([[0, 60, 80]])])), /Running status/);
  assert.throws(() => inspectMidi(smf([track([])]).subarray(0, 21)), /Truncated/);
});

const actualPath = new URL('../assets/faure-midi-fixture.mid', import.meta.url);
test('six-note excerpt of actual Fauré MIDI passes declared augmentation and 12-tick gate tolerance', () => {
  const before = createHash('sha256').update(readFileSync(actualPath)).digest('hex');
  const p = inspectMidi(actualPath);
  const s = { pitches: [75, 73, 72, 72, 70, 68], durationsQuarter: [.75, .25, 1, .75, .25, 1] };
  const o = { track: 1, startTick: 5760, transpose: 0, timeScale: 1.5,
    onsetToleranceTicks: 12, durationToleranceTicks: 12 };
  const m = matchMotif(p, s, o);
  const after = createHash('sha256').update(readFileSync(actualPath)).digest('hex');
  const report = { file: actualPath, unchangedSha256: before, unchanged: before === after,
    format: p.format, ppq: p.ppq, tracks: p.tracks.length, parsedNotes: p.notes.length,
    parseIssues: p.issues, source: s, options: o, result: m,
    scope: 'Symbolic declared transformations only, not perceptual identity in generated audio.' };
  assert.equal(report.scope.startsWith('Symbolic'), true);
  console.log('FAURE', JSON.stringify({ pass: m.pass, ppq: p.ppq, notes: m.matchedNotes,
    issues: m.issues, parseIssues: p.issues.length, unchanged: before === after }));
  assert.equal(m.pass, true, JSON.stringify(m.issues));
  assert.equal(m.matchedNotes.length, 6); assert.equal(before, after);
});
