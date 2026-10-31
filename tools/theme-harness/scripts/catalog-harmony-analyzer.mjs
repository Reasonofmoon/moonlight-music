/**
 * REA Track 7 — Moonlight Music (달의이성 음악 서재)
 *
 * Applies:
 *   - Vital (#017), Dexed (#018), & Surge XT (#019) MIDI Pitch-Class / Circle-of-Fifths Harmonic Distance Engine
 *   - Riffusion (#047) Tempo & Compound-Meter Bar Timing Calculator
 *   - Classical Motif Interval Contour & Rhythmic Augmentation Verifier for catalog.json
 */

const PITCH_CLASS_MAP = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  'D♭': 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  'E♭': 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  'F♯': 6,
  Gb: 6,
  'G♭': 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  'A♭': 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  'B♭': 10,
  B: 11,
  Cb: 11,
};

/**
 * Parses a key signature string like "C major", "E minor", "A♭ major"
 * into tonic pitch class (0..11), mode ("major" | "minor"), and relative major pitch class.
 */
export function parseKeySignature(keyStr) {
  const m = String(keyStr || '')
    .trim()
    .match(/^([A-G][#♯b♭]?)\s+(major|minor)$/i);
  if (!m) {
    throw new Error(`Invalid key signature: ${keyStr}`);
  }
  const tonicName = m[1];
  const mode = m[2].toLowerCase();
  const tonicPc = PITCH_CLASS_MAP[tonicName];
  if (tonicPc === undefined) {
    throw new Error(`Unknown tonic note: ${tonicName}`);
  }
  // Relative major pitch class: minor + 3 semitones mod 12
  const relativeMajorPc = mode === 'minor' ? (tonicPc + 3) % 12 : tonicPc;
  return {
    raw: keyStr,
    tonicName,
    tonicPc,
    mode,
    relativeMajorPc,
  };
}

/**
 * Parses a BPM specification from catalog.json (either a number like 72
 * or a compound-meter string like "84 (4분음표) · 점4분음표 56").
 */
export function parseBpmSpec(bpmField) {
  if (typeof bpmField === 'number' && Number.isFinite(bpmField) && bpmField > 0) {
    return {
      quarterBpm: bpmField,
      dottedQuarterBpm: null,
      isCompoundMeter: false,
    };
  }
  const str = String(bpmField || '').trim();
  const numbers = (str.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (numbers.length === 0) {
    throw new Error(`Unable to parse BPM from: ${bpmField}`);
  }
  const quarterBpm = numbers[0];
  const dottedMatch = str.match(/점4분음표\s*(\d+(?:\.\d+)?)/);
  const dottedQuarterBpm = dottedMatch ? Number(dottedMatch[1]) : null;
  return {
    quarterBpm,
    dottedQuarterBpm,
    isCompoundMeter: dottedQuarterBpm !== null,
  };
}

/**
 * Computes the shortest circle-of-fifths distance (0..6 steps) and semitone transposition
 * between two key signatures.
 */
export function computeHarmonicDistance(sourceKeyStr, targetKeyStr) {
  const src = parseKeySignature(sourceKeyStr);
  const tgt = parseKeySignature(targetKeyStr);

  const semitoneShift = (tgt.tonicPc - src.tonicPc + 12) % 12;
  // Circle of fifths position using relative major pitch classes: (pc * 7) mod 12
  const srcFifthPos = (src.relativeMajorPc * 7) % 12;
  const tgtFifthPos = (tgt.relativeMajorPc * 7) % 12;
  const rawFifthDiff = Math.abs(tgtFifthPos - srcFifthPos);
  const circleOfFifthsSteps = Math.min(rawFifthDiff, 12 - rawFifthDiff);

  return {
    sourceKey: src.raw,
    targetKey: tgt.raw,
    semitoneShift,
    circleOfFifthsSteps,
    modeChanged: src.mode !== tgt.mode,
    isRelativePair: src.relativeMajorPc === tgt.relativeMajorPc && src.mode !== tgt.mode,
  };
}

/**
 * Verifies a motif pitch/rhythm transformation (e.g., Fauré Op.17 No.3 6-note motif
 * E♭–D♭–C–C–B♭–A♭ stretched 1.5x into 6/8).
 */
export function verifyMotifTransformation(sourceMotif, options = {}) {
  const { pitches, durationsQuarter } = sourceMotif;
  if (
    !Array.isArray(pitches) ||
    pitches.length < 2 ||
    !Array.isArray(durationsQuarter) ||
    durationsQuarter.length !== pitches.length
  ) {
    throw new Error('sourceMotif must have matching pitches and durationsQuarter arrays (len >= 2)');
  }

  const transposeSemitones = Number(options.transposeSemitones ?? 0);
  const timeScale = Number(options.timeScale ?? 1.0);
  const quarterBpm = Number(options.quarterBpm ?? 84);

  const sourceIntervals = [];
  for (let i = 1; i < pitches.length; i++) {
    sourceIntervals.push(pitches[i] - pitches[i - 1]);
  }

  const transformedPitches = pitches.map((p) => p + transposeSemitones);
  const transformedIntervals = [];
  for (let i = 1; i < transformedPitches.length; i++) {
    transformedIntervals.push(transformedPitches[i] - transformedPitches[i - 1]);
  }

  const transformedDurationsQuarter = durationsQuarter.map((d) =>
    Number((d * timeScale).toFixed(4))
  );
  const totalQuarterBeats = transformedDurationsQuarter.reduce((a, b) => a + b, 0);
  const motifDurationSeconds = Number(((totalQuarterBeats * 60) / quarterBpm).toFixed(3));

  const contourPreserved = sourceIntervals.every(
    (interval, idx) => Math.sign(interval) === Math.sign(transformedIntervals[idx])
  );

  return {
    sourcePitches: pitches,
    transformedPitches,
    sourceIntervals,
    transformedIntervals,
    transformedDurationsQuarter,
    totalQuarterBeats,
    motifDurationSeconds,
    contourPreserved,
  };
}

/**
 * Audits the entire `catalog.json` structure for theme-track harmonic lineage,
 * BPM parsing, and audio asset completeness.
 */
export function auditCatalogLineage(catalog, themeDefaultKeys = {
  'mozart-light': 'C major',
  'faure-letters': 'A♭ major',
}) {
  const issues = [];
  const themeIds = new Set((catalog.themes || []).map((t) => t.id));
  const trackAnalyses = [];

  for (const track of catalog.tracks || []) {
    if (!themeIds.has(track.themeId)) {
      issues.push(`Track ${track.id}: unknown themeId "${track.themeId}"`);
    }
    if (!track.audio || !track.audio.endsWith('.m4a')) {
      issues.push(`Track ${track.id}: missing or non-m4a audio filename`);
    }
    if (!Number.isFinite(track.duration) || track.duration <= 0) {
      issues.push(`Track ${track.id}: invalid duration ${track.duration}`);
    }

    const baseKey = themeDefaultKeys[track.themeId] || 'C major';
    const harmony = computeHarmonicDistance(baseKey, track.design?.key);
    const bpmInfo = parseBpmSpec(track.design?.bpm);

    trackAnalyses.push({
      id: track.id,
      title: track.title,
      themeId: track.themeId,
      kind: track.kind,
      key: track.design?.key,
      bpmInfo,
      harmony,
    });
  }

  return {
    valid: issues.length === 0,
    themeCount: (catalog.themes || []).length,
    trackCount: trackAnalyses.length,
    issues,
    trackAnalyses,
  };
}
