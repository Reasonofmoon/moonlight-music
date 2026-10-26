# Theme-lineage harness

Evidence-consistency gates for source-derived music and music videos. Node.js 22+, built-in modules only.

## Run

From this directory:

```sh
node --test scripts/gate.test.mjs scripts/smf-theme.test.mjs
```

Copy `assets/project.template.json` into a private project directory. Register real relative files, SHA-256 hashes, observed service inputs, scoped user choices and honest human-review records.

```sh
node scripts/gate.mjs /absolute/private-project/project.json --target mv --report /absolute/private-project/gate-report.json
```

Targets: midi, instrumental, comparison, vocal, mv, clips, deliver, publish. Exit 0 means the evidence contract passes; exit 1 is a contradiction and exit 2 is missing evidence. The unfilled template intentionally blocks.

Read [the gate contract](references/gate-contract.md) before using the checker.

## What a pass does not mean

MIDI validity, symbolic note correspondence, actual service ancestry, audible theme identity and visual response are separate claims. This checker cannot hear polyphonic audio, authenticate a human, automatically judge video physics, or intercept every external tool call. Human listening and scoped approvals remain mandatory. Do not invent retrospective approvals.

The two optional fixed video actions in guard-run.mjs map keyframes to the mv gate and clips to the clips gate. They require the separately installed, trusted suno-musicvideo helper in the documented sibling layout; its implementation and credentials are not included here. Arbitrary commands and caller-selected lower gates are not accepted. Default action mode is preflight only.

## Public boundary

Only reusable code, draft templates, documentation and regression fixtures are in this folder. No private audits, raw transcripts, account identifiers, credentials, book PDFs, unreleased tracks, or MV work files are included. The music catalogue and seven published tracks are unchanged.

The Fauré MIDI fixture contains only six note events extracted from the earlier generated reference MIDI, with original timing metadata retained. It is not the full arrangement or a Suno recording. It tests declared pitch/rhythm augmentation only and does not certify preservation of the original work or any generated audio. The synthetic-ledger tests are explicitly fixtures and cannot authorize production through the normal CLI.

No reuse licence for the existing music recordings or lyrics is granted by publishing these tools.
