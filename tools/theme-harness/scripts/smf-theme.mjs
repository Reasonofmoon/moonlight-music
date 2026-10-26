// Symbolic MIDI evidence only; never evidence of perceptual identity in audio.
import { readFileSync } from 'node:fs';

/** Synchronous SMF inspector. tracks are physical MTrk descriptors (conductor = 0).
 * Metadata arrays retain physical track and tick. Dangling notes are not invented.
 * Same-track/channel/pitch overlaps pair FIFO and are reported, not silently lost.
 * Malformed structure throws; musical/event anomalies are returned in issues. */
export function inspectMidi(fileOrBuffer) {
  const b = typeof fileOrBuffer === 'string' || fileOrBuffer instanceof URL
    ? readFileSync(fileOrBuffer) : Buffer.from(fileOrBuffer);
  let p = 0;
  const need = (n, limit = b.length) => {
    if (p + n > limit) throw new Error(`Truncated SMF at byte ${p}`);
  };
  const u16 = () => { need(2); const v = b.readUInt16BE(p); p += 2; return v; };
  const u32 = () => { need(4); const v = b.readUInt32BE(p); p += 4; return v; };
  const tag = () => { need(4); const v = b.toString('ascii', p, p + 4); p += 4; return v; };
  const vlq = limit => {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      need(1, limit); const x = b[p++]; v = v * 128 + (x & 127);
      if (!(x & 128)) return v;
    }
    throw new Error(`Invalid VLQ at byte ${p - 4}`);
  };
  if (tag() !== 'MThd') throw new Error('Missing MThd');
  const headerLength = u32();
  if (headerLength < 6) throw new Error('SMF header shorter than 6 bytes');
  need(headerLength);
  const headerEnd = p + headerLength;
  const format = u16(), trackCount = u16(), division = u16();
  if (division & 0x8000) throw new Error('SMPTE division is unsupported; PPQ required');
  if (!division) throw new Error('PPQ must be positive');
  if (format > 2 || !trackCount || (format === 0 && trackCount !== 1)) {
    throw new Error('Invalid SMF format/track count');
  }
  p = headerEnd;
  const result = { format, ppq: division, tracks: [], notes: [], issues: [],
    tempos: [], timeSignatures: [], keySignatures: [] };
  const issue = (code, track, tick, detail = {}) =>
    result.issues.push({ code, track, tick, ...detail });
  while (p < b.length && result.tracks.length < trackCount) {
    const chunk = tag(), size = u32(); need(size);
    const end = p + size;
    if (chunk !== 'MTrk') { p = end; continue; }
    const track = result.tracks.length, active = new Map();
    const info = { track, name: null, endTick: 0, eventCount: 0, hasEndOfTrack: false };
    result.tracks.push(info);
    let tick = 0, running = 0;
    while (p < end) {
      tick += vlq(end); need(1, end);
      let status = b[p];
      if (status < 128) {
        if (!running) throw new Error(`Running status without status in track ${track}`);
        status = running;
      } else p++;
      info.eventCount++;
      if (status === 0xff) {
        running = 0; need(1, end); const type = b[p++], len = vlq(end);
        need(len, end); const data = b.subarray(p, p + len); p += len;
        if (type === 0x03) info.name = data.toString('utf8');
        if (type === 0x51 && len === 3) {
          const microsecondsPerQuarter = data.readUIntBE(0, 3);
          if (!microsecondsPerQuarter) issue('invalid-tempo', track, tick);
          else result.tempos.push({ track, tick, microsecondsPerQuarter,
            bpm: 60000000 / microsecondsPerQuarter });
        }
        if (type === 0x58 && len === 4) result.timeSignatures.push({ track, tick,
          numerator: data[0], denominator: 2 ** data[1],
          clocksPerClick: data[2], thirtySecondsPerQuarter: data[3] });
        if (type === 0x59 && len === 2) {
          const sharpsFlats = data.readInt8(0), mode = data[1];
          result.keySignatures.push({ track, tick, sharpsFlats,
            mode: mode === 0 ? 'major' : mode === 1 ? 'minor' : 'invalid' });
          if (sharpsFlats < -7 || sharpsFlats > 7 || mode > 1)
            issue('invalid-key-signature', track, tick);
        }
        if ([0x51, 0x58, 0x59, 0x2f].includes(type) &&
            len !== ({ 81: 3, 88: 4, 89: 2, 47: 0 })[type])
          issue('invalid-meta-length', track, tick, { type, length: len });
        if (type === 0x2f) {
          info.hasEndOfTrack = true;
          if (p !== end) issue('bytes-after-end-of-track', track, tick, { bytes: end - p });
          p = end; break;
        }
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        running = 0; const len = vlq(end); need(len, end); p += len; continue;
      }
      if (status < 0x80 || status >= 0xf0) throw new Error(`Unsupported status ${status}`);
      running = status;
      const kind = status >> 4, channel = status & 15;
      const len = kind === 0xc || kind === 0xd ? 1 : 2;
      need(len, end); const a = b[p++], v = len === 2 ? b[p++] : 0;
      if (a > 127 || v > 127) throw new Error(`Invalid channel data in track ${track}`);
      if (kind !== 8 && kind !== 9) continue;
      const key = `${channel}:${a}`, queue = active.get(key) ?? [];
      if (kind === 9 && v > 0) {
        if (queue.length) issue('overlapping-note', track, tick, { channel, pitch: a });
        queue.push({ track, channel, pitch: a, startTick: tick, velocity: v });
        active.set(key, queue);
      } else if (queue.length) {
        result.notes.push({ ...queue.shift(), endTick: tick });
      } else issue('unmatched-note-off', track, tick, { channel, pitch: a });
    }
    info.endTick = tick;
    if (!info.hasEndOfTrack) issue('missing-end-of-track', track, tick);
    for (const queue of active.values()) for (const note of queue)
      issue('dangling-note-on', track, tick, { channel: note.channel,
        pitch: note.pitch, startTick: note.startTick });
  }
  if (result.tracks.length !== trackCount) throw new Error('Missing declared MTrk chunks');
  if (p < b.length) issue('trailing-bytes', null, null, { bytes: b.length - p });
  result.notes.sort((a, z) => a.track - z.track || a.startTick - z.startTick || a.pitch - z.pitch);
  for (const field of ['tempos', 'timeSignatures', 'keySignatures'])
    result[field].sort((a, z) => a.tick - z.tick || a.track - z.track);
  return result;
}

/** Exact declared pitch/rhythm matching, not contour matching. pitchMap is an
 * explicit absolute target pitch per source index, before optional transpose.
 * Onsets use cumulative source durations * ppq * timeScale (never actual gates).
 * Extra notes are permitted, but cannot shift anchors or substitute wrong pitches.
 * maxSpanTicks bounds the declared and each matched note's span from startTick.
 * matchedNotes contains actual notes in source order. No physical note is reused. */
export function matchMotif(parsed, source, options = {}) {
  const issues = [], fail = message => ({ pass: false, matchedNotes: [], issues: [message] });
  const { track, startTick, transpose = 0, timeScale = 1, pitchMap,
    onsetToleranceTicks = 12, durationToleranceTicks = 24, maxSpanTicks } = options;
  const { pitches, durationsQuarter } = source ?? {};
  const midiPitch = n => Number.isInteger(n) && n >= 0 && n <= 127;
  if (!Array.isArray(pitches) || !pitches.length || !pitches.every(midiPitch) ||
      !Array.isArray(durationsQuarter) || pitches.length !== durationsQuarter.length ||
      !durationsQuarter.every(n => Number.isFinite(n) && n > 0))
    return fail('Invalid source pitches/durationsQuarter');
  if (!parsed || !Number.isFinite(parsed.ppq) || parsed.ppq <= 0 || !Array.isArray(parsed.notes))
    return fail('Invalid parsed MIDI');
  if (!Number.isInteger(track) || track < 0 || !Number.isFinite(startTick) || startTick < 0 ||
      !Number.isInteger(transpose) || !Number.isFinite(timeScale) || timeScale <= 0 ||
      ![onsetToleranceTicks, durationToleranceTicks].every(n => Number.isFinite(n) && n >= 0) ||
      (maxSpanTicks !== undefined && (!Number.isFinite(maxSpanTicks) || maxSpanTicks <= 0)))
    return fail('Invalid track/startTick/transformation/tolerances/span');
  if (pitchMap !== undefined && (!Array.isArray(pitchMap) ||
      pitchMap.length !== pitches.length || !pitchMap.every(midiPitch)))
    return fail('pitchMap must explicitly supply one MIDI pitch per source note');
  let cursor = startTick;
  const expected = pitches.map((pitch, i) => {
    const duration = durationsQuarter[i] * parsed.ppq * timeScale;
    const note = { pitch: (pitchMap?.[i] ?? pitch) + transpose, startTick: cursor, duration };
    cursor += duration; return note;
  });
  if (!expected.every(n => midiPitch(n.pitch))) return fail('Transformed pitch outside MIDI range');
  if (maxSpanTicks !== undefined && cursor - startTick > maxSpanTicks)
    return fail('Declared motif exceeds maxSpanTicks');
  const actual = parsed.notes.filter(n => n.track === track && midiPitch(n.pitch) &&
    Number.isFinite(n.startTick) && Number.isFinite(n.endTick) && n.endTick >= n.startTick);
  const candidates = expected.map(e => actual.map((n, i) => ({ n, i }))
    .filter(({ n }) => n.pitch === e.pitch &&
      Math.abs(n.startTick - e.startTick) <= onsetToleranceTicks &&
      Math.abs(n.endTick - n.startTick - e.duration) <= durationToleranceTicks &&
      (maxSpanTicks === undefined || n.endTick - startTick <= maxSpanTicks))
    .sort((a, b) => Math.abs(a.n.startTick - e.startTick) - Math.abs(b.n.startTick - e.startTick) ||
      Math.abs(a.n.endTick - a.n.startTick - e.duration) -
      Math.abs(b.n.endTick - b.n.startTick - e.duration))
    .map(({ i }) => i));
  // Augmenting-path assignment avoids greedy failure on nearby repeated pitches.
  const owner = new Map(), assignment = new Map();
  function assign(index, visited) {
    for (const candidate of candidates[index]) {
      if (visited.has(candidate)) continue;
      visited.add(candidate);
      const previous = owner.get(candidate);
      if (previous === undefined || assign(previous, visited)) {
        owner.set(candidate, index); assignment.set(index, candidate); return true;
      }
    }
    return false;
  }
  for (let i = 0; i < expected.length; i++) if (!assign(i, new Set())) {
    const e = expected[i];
    issues.push(`Source note ${i}: no unused pitch ${e.pitch} at tick ${e.startTick} ` +
      `(onset ±${onsetToleranceTicks}, duration ${e.duration} ±${durationToleranceTicks})`);
  }
  const matchedNotes = expected.flatMap((_, i) => assignment.has(i) ? [actual[assignment.get(i)]] : []);
  return { pass: issues.length === 0, matchedNotes, issues };
}
