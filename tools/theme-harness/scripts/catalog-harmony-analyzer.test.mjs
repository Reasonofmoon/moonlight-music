import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseKeySignature,
  parseBpmSpec,
  computeHarmonicDistance,
  verifyMotifTransformation,
  auditCatalogLineage,
} from './catalog-harmony-analyzer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

test('parseKeySignature and computeHarmonicDistance compute circle-of-fifths and semitone shifts for Mozart K.356 variations', () => {
  const cMaj = parseKeySignature('C major');
  assert.equal(cMaj.tonicPc, 0);

  // Orbit: C major -> A major (3 fifths away, +9 semitones)
  const orbitDist = computeHarmonicDistance('C major', 'A major');
  assert.equal(orbitDist.semitoneShift, 9);
  assert.equal(orbitDist.circleOfFifthsSteps, 3);

  // Ember Roads: C major -> E minor (relative major G major = 1 fifth step)
  const emberDist = computeHarmonicDistance('C major', 'E minor');
  assert.equal(emberDist.semitoneShift, 4);
  assert.equal(emberDist.circleOfFifthsSteps, 1);
  assert.equal(emberDist.modeChanged, true);
});

test('verifyMotifTransformation validates Fauré Op.17 No.3 6-note motif 1.5x augmentation into 6/8', () => {
  // E♭4 (63) – D♭4 (61) – C4 (60) – C4 (60) – B♭3 (58) – A♭3 (56)
  const faureMotif = {
    pitches: [63, 61, 60, 60, 58, 56],
    durationsQuarter: [1, 0.5, 0.5, 1, 0.5, 0.5],
  };
  const res = verifyMotifTransformation(faureMotif, {
    transposeSemitones: 0,
    timeScale: 1.5,
    quarterBpm: 84,
  });

  assert.equal(res.contourPreserved, true);
  assert.deepEqual(res.sourceIntervals, [-2, -1, 0, -2, -2]);
  assert.deepEqual(res.transformedDurationsQuarter, [1.5, 0.75, 0.75, 1.5, 0.75, 0.75]);
  assert.equal(res.totalQuarterBeats, 6);
});

test('auditCatalogLineage validates all 2 themes and 7 tracks in real catalog.json', () => {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'catalog.json'), 'utf8')
  );
  const report = auditCatalogLineage(catalog);
  assert.equal(report.valid, true, report.issues.join('; '));
  assert.equal(report.themeCount, 2);
  assert.equal(report.trackCount, 7);

  const track07 = report.trackAnalyses.find(
    (t) => t.id === '07-letters-without-words'
  );
  assert.ok(track07);
  assert.equal(track07.bpmInfo.quarterBpm, 84);
  assert.equal(track07.bpmInfo.dottedQuarterBpm, 56);
  assert.equal(track07.bpmInfo.isCompoundMeter, true);
});
