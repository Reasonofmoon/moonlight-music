# 테마 계승 하네스 v1: 계약과 판정 범위

## 1. 상태와 운영 원칙

기존 문제는 생성 파일의 존재와 곡의 정체성을 같은 완료 조건으로 취급한 데 있다. 하네스는 별도 장부를 유지한다.

- `sourceProvenance`: 작품·판본·권리·추출 위치.
- `midiIntegrity`: 파일 구조와 실제 이벤트의 건전성.
- `symbolicMotifMatch`: 실제 MIDI에서 선언한 음형 변형의 대응.
- `referenceLineage`: MIDI→렌더→실제 업로드의 바이트 계보.
- `generationLineage`: 플랫폼에 실제 투입된 부모/Voice/결과 ID.
- `audibleThemeReview`: 사람이 원전/참조/출력의 대응을 들은 기록.
- `visualThemeResponse`: 잠긴 음악 큐에 영상이 응답하는 계획과 결과.

`PASS`: 요청 단계까지 필요한 기록이 새 파일과 일치한다. `BLOCKED`: 증거·선택·청취가 미완이다. `FAIL`: 현재 파일/관계/값이 기록과 모순된다. 이 구분은 미청취 음원을 나쁜 음악으로 판정하지 않는다.

불변량은 주제마다 정한다. 동일 조성·BPM·코드·음색은 충분조건이 아니다. 반대로 이조·템포 변화·확대/축소·장르 편성은 허용된 변형일 수 있다. 반전/역행/단조화처럼 인지에 큰 변화가 생기는 변형은 미리 지도와 기준 청취 구간을 승인한다.

일반적인 2음 셀이나 하행 음계만으로 특정 클래식 테마를 인증하지 않는다. 기본 여권은 의미 있는 주제 프레이즈, 리듬과 프레이즈 말미/종지 맥락을 포함한다. 코드의 ‘주 프레이즈 4음 이상·분리된 주 프레이즈 2회 귀환’은 공백을 막는 운영 기본값이지 음악학적 충분조건이나 보편적인 임계값이 아니다. 사람이 특징성과 식별성을 검토해야 한다. 셀만 빌려 새 곡을 쓸 때는 ‘모티프 파생 신작’으로 범위를 낮추고, 원곡 테마가 보존됐다는 인증은 하지 않는다.

## 2. 단계별 사전 조건

| 진입 대상 | 통과에 필요한 증거 | 차단하는 대표 누락 |
|---|---|---|
| `midi` | 원전 여권, 실제 악보 해시/위치, 사용자 테마/장르 계획 승인, 장르별 현재 책 적용 기록 | 원전명만 교체, 2음만 일반적으로 하행, 책 목록만 첨부 |
| `instrumental` | 승인된 blueprint, 실제 SMF 조표/박자/템포/길이·무결성, 주제 위치 대조, MIDI↔WAV 렌더 영수증, 비용 승인 | `ok:true`만 존재, 잘못된 멜로디, 현재 WAV와 다른 업로드 |
| `comparison` | 승인한 모든 장르, 업로드 ID/해시, 실제 결과 부모, 타임코드 청취 리뷰, 비교판 | 생성 성공·RMS만 기록, 일부 장르 ONLY 실행을 전체로 표시 |
| `vocal` | 사용자 장르/A/B 선택, 테마 담당 성부·훅·가사 운율 계획, 정확한 기악 부모 또는 승인된 새 bed | 들은 기악곡 대신 원래 참조 WAV로 조용히 회귀, 코드만 계승 |
| `mv` | 실제 보컬 입력/Voice, 보컬 테마 청취, 사용자 take 선택, 오디오 잠금, 음악 큐 지도, 음악에 연결된 샷·영상 책 적용 | persona 이름만 프롬프트, 가사/소품 중심 샷만 존재 |
| `clips` | 같은 잠긴 오디오의 애니매틱/스타일 리뷰와 사용자 승인, 클립 예산 | 스타일 시안 선택을 음악 테마 확인으로 오인, 전체 유료 생성 선행 |
| `deliver` | 사용 구간 전체 QC, 실제 렌더 입력 보컬, 최종 오디오 비교 증거, 물리적 개연성 | 해상도/길이만 맞음, 잘못된 take, 손실 인코딩 파일의 단순 해시 비교 |
| `publish` | 위 모든 조건과 정확한 배포 파일의 별도 공개 승인 | 제작/비용 승인을 공개 승인으로 확대 |

초안 비교판과 저비용 검토 자료는 만들 수 있다. 다만 결과를 인증 후보로 표시하지 않는다. `comparison`은 사람이 듣기 위한 화면을 만드는 순간이 아니라, 다음 보컬 단계로 넘어갈 수 있는 비교·검토가 완료된 시점이다.

## 3. 파일 모델

프로젝트 루트 `project.json`은 `assets[]`를 갖는다. 각 항목:

```json
{"id":"instrumental-a","type":"instrumental","path":"audio/genre-a.m4a","sha256":"실제 64자리 해시","themeRevision":"theme-r1","parents":["reference-a"],"serviceId":"실제 Suno clip UUID"}
```

모든 path는 루트 안의 상대 경로다. 심볼릭 링크로 밖을 가리키는 것도 거부한다. 복사본·별칭을 바꾸면 해시를 다시 계산하고 관련 리뷰를 다시 받는다. 파일명·태그·manifest의 `complete`만으로는 승인하지 않는다.

`passport` JSON에는 `themeId/revision/sourceId/sourceSha256/edition/rights/locator/identityStatement/invariants/units/returnPolicy`가 필요하다. `units[]`는 `id/role/pitches/durationsQuarter`다. `primary_phrase`와 `derived_cell`을 구별한다. 모든 unit ID는 비어 있지 않고 고유해야 한다. 같은 실제 MIDI 노트나 겹치는 구간을 두 번의 회귀로 세지 않는다. C4=60, 길이는 4분음표 단위다.

`plan`은 `themeId/themeRevision/genreIds/genreBlueprintHashes`를 갖는다. 각 `blueprint`는 `genreId/themeRevision/expectedMidi/motifOccurrences`를 갖는다. project의 같은 필드는 이 봉인된 파일과 같아야 한다. `ONLY` 실행은 기존 모음 전체 manifest를 덮어쓰지 말고 해당 장르 산출물만 갱신한다.

`expectedMidi`는 `ppq/endTick/tempoMPQ/timeSignature/keySignature/monophonicTracks`다. 조표는 `[sharpsFlats,"major"|"minor"]`, 트랙은 물리적 MTrk의 0 기반 인덱스다. 지휘 트랙이 0이면 첫 악기는 1이다. v1은 단일 템포·단일 조표·단일 박자표를 전제로 한다. 변박/템포 맵은 별도 파서 계약을 확장하기 전에는 무시하고 통과시키지 않는다.

`motifOccurrences`는 `unitId/section/track/startTick/transpose/timeScale` 및 틱 허용 오차를 기록한다. `pitchMap`을 쓰면 각 원음의 목표 MIDI pitch를 전부 명시한다. 실제 MIDI의 음높이·누적 시작점·길이를 대조하며 임의의 반주 트랙에서 비슷한 윤곽을 찾지 않는다. gate 짧음은 선언된 articulation 허용 오차 안에서만 인정한다. 장식음을 넣을 수 있지만 핵심 음의 위치를 바꾼다면 변형 지도를 다시 선언한다.

`render-receipt`는 정확한 MIDI/참조 WAV ID와 SHA-256, 렌더러, `roundTripEventsChecked`, gate와 release 차이를 갖는다. v1은 렌더러의 왕복 이벤트 비교 기록을 확인하지만 임의 렌더러를 재실행하거나 그 음질을 인증하지는 않는다.

`upload-record`는 `inputAssetId/inputSha256/inputBinding/serviceUploadId/captureId/captureBinding`이다. inputBinding과 captureBinding은 아래 메타데이터 스냅샷이며, 캡처를 교체한 후 새 파일 해시만 등록해도 이전 업로드 증거는 무효다. 참조 asset의 `serviceId`와 일치해야 한다. 실제 업로드 때 기록하지 않았다면 사후 현재 파일을 해시했다고 소급 인증하지 않는다.

`generation-record`는 `inputAssetId/inputSha256/inputBinding/inputServiceId/outputAssetId/outputServiceId/outputBinding/voiceId/observedVia/observedAt/captureId/captureBinding`이다. 입력·출력·캡처의 바이트와 관련 메타데이터를 관찰 시점에 봉인한다. observedVia는 service-response 또는 ui-capture다. 결과 asset도 input을 부모로 갖는다. 스크린샷·서비스 응답은 비밀 헤더와 쿠키를 제거하고 필요한 ID/설정만 보관한다. 프롬프트의 보존 요청은 관찰 기록이 아니다.

## 4. 책 적용 기록

각 장르 `bookBasis[].evidenceId`는 `book-evidence`를 가리킨다. 그 JSON에는 실제 책/판본, 장, PDF 페이지와 인쇄 페이지, 해당 원리의 한정된 요약, 이번 편곡 선택, 적용 마디, genreId, checkedForRevision, checkedAt을 쓴다. EPUB나 페이지 없는 자료는 숫자를 꾸미지 말고 위치 식별자와 ‘해당 없음’을 명시한다. 책 전체를 재배포하거나 긴 인용을 하지 않는다.

음악·영상의 조언은 적용 범위를 지킨다. 예를 들어 드럼 타이밍 예제를 모든 악기의 보편 규칙으로, 특정 스트링 라이브러리의 CC1/CC11 매핑을 모든 GM 악기의 규칙으로 일반화하지 않는다. 음악 책을 읽었다는 사실이 MIDI/오디오 테마 보존을 대신하지 않는다.

MV direction에는 `bookEvidenceIds[]`가 필요하다. 영상 책 기록의 domain은 direction이며 현재 revision에 대해 읽은 원리와 실제 큐/샷 선택이 있어야 한다. 스토리·색채·소품의 반복과 음악 주제의 반복을 구분한다.

## 5. 사람의 리뷰와 선택

리뷰/승인도 각각 파일로 보관하고 해시를 매긴다. 공통 필드:

- kind/status(accepted)/actor(kind user 또는 human, id)/observedAt
- targets: 관련 asset ID → 정확한 SHA-256
- bindings: 같은 ID → `{id,type,sha256,themeRevision,parents,serviceId}` 스냅샷. parents는 정렬하며 serviceId는 instrumental/vocal에만 실제 값을, 그 외는 null을 쓴다. 업로드의 service ID는 별도 업로드 기록이 봉인한다.
- choice: 승인 종류별 정확한 선택. genre-choice=`{genreId,selectedAssetId}`, vocal-choice=`{selectedAssetId,voiceId}`, route-change=`{route,inputAssetId,selectedInstrumentalId}`, style=`{animaticId}`, publish=`{assetId,destination}`. theme은 themeId/revision, plan은 planId/정렬된 genreIds, 비용은 stage/limit/unit 및 존재하는 action을 결합한다.
- recordingId: 실제 사용자 메시지·검토 기록을 필요한 범위로 저장한 capture asset
- notes: 무엇을 확인했는지 구체적인 근거

리뷰는 capture 자신과 모든 targets의 현재 해시에 묶인다. 사용자 선택·비용·스타일·공개는 actor.kind=user여야 한다. 에이전트가 ‘사용자 승인’ 값을 만들어 넣는 것은 승인 행위가 아니다. v1은 기록의 진위까지 인증하는 전자서명 시스템이 아니므로 실제 대화/선택과 대조해야 한다.

오디오 리뷰는 `audioHealthId`, `listeningComparisonId`, `negativeControlChecked`, `occurrences[]`도 갖는다. audio-health JSON에는 실제 디코드된 `audioId/sha256/result:decoded/durationSeconds/captureId/captureBinding`이 필요하며 리뷰 targets/bindings에도 넣는다. v1은 디코더를 대신 실행하지 않고 봉인된 분석 기록을 검사한다. 각 occurrence는 고유 `id`와 `unitId/section/start/end/referenceId/referenceStart/referenceEnd/foreground/notes`를 기록하며 출력 오디오 길이 안에 있어야 한다. 같은 타임코드의 중복은 회귀 2회가 아니다. 기본값으로 승인한 주 프레이즈가 시간상 분리된 두 구간에서 실제로 들려야 한다. A·B 모두를 targets에 넣는 것은 A 또는 B를 선택했다는 choice를 대신하지 않는다.

청취 절차:
1. 원전 프레이즈의 별도 단선율/피아노 기준 재생을 먼저 듣는다.
2. 같은 음량대에서 해당 MIDI, Suno 기악, 보컬의 대응 구간을 나란히 듣는다.
3. 주제 제시·변형·회귀의 타임코드를 표시한다. 음높이 윤곽, 상대 리듬, 강세, 프레이즈 끝/종지 맥락과 담당 성부를 설명한다.
4. 같은 조·템포·장르지만 다른 선율인 음원을 부정 대조군으로 듣는다. 짧은 셀의 우연 일치를 전체 테마로 오인하지 않는지 확인한다.
5. 애매하면 통과시키지 말고 미확인으로 남긴다. 인위적인 ‘유사도 80점’ 같은 보편 임계값은 쓰지 않는다.

자동 멜로디 추정·chroma/DTW는 향후 보조 어댑터다. 다성 악기·보컬·장식음·템포 변화에서 오탐이 있으므로 사람의 판단을 대체하지 않는다. CER/가사 정렬 점수는 선율 계승이나 딕션의 충분한 평가가 아니다.

## 6. 보컬과 MV 연결

`vocal.route=selected-instrumental`이면 `coverInputId`가 사용자가 들은 selectedInstrumentalId와 같아야 한다. 플랫폼에서는 소유한 그 기악 take의 공식 Remix/Cover 경로를 우선 사용한다.

새 보컬용 bed가 필요하면 route=rearranged-bed를 명시한다. 새 bed는 선택 기악곡을 부모로 갖고, 이전 대비 무엇이 바뀌었는지 책·마디 단위로 설명한다. 사용자 route-change 승인은 선택 기악·새 bed·보컬 계획의 현재 해시에 묶여야 한다. 이 예외도 출력 오디오 청취 게이트를 없애지 않는다.

보컬 계획에는 실제 `inputAssetId/voiceId/route`도 필요하다. `hookBindings[]`에는 source unit, 보컬/악기 담당 성부, 해당 곡 구간을 쓴다. `lyricPhraseMap[]`에는 가사와 음절/리듬/쉼표 배치를 넣는다. 원곡 동기를 반드시 가수가 불러야 하는 것은 아니지만, 피아노 응답이 담당한다면 그 역할을 사전에 선언하고 실제로 잘 들리는지 확인한다.

`audio-lock`은 selected vocal id/sha/revision, durationSeconds/durationEvidenceId를 고정한다. 길이 증거는 선택 보컬 청취 리뷰의 audioHealthId와 같아야 한다. 음악 지도 `music-map`은 같은 오디오 id/sha와 cues[]를 갖는다. 큐 ID는 고유하며 모든 start/end는 유한한 숫자로 0≤start<end≤잠긴 길이여야 한다. 기본 kind=theme 큐는 같은 unit의 `audibleOccurrenceId`를 선택 보컬 리뷰에서 찾아 그 청취 범위 안에 있어야 한다(반올림 오차 0.05초 허용). 주제가 쉬는 kind=contrast/rest 큐는 exceptionReason을 명시한다. 큐는 source unit, 시간, 음악적 기능, 영상 응답을 연결한다. 모든 컷을 박자에 강제로 맞추는 장치가 아니라, 감정·프레이즈·재현이 영상과 어떤 관계인지 설명하는 장치다.

각 shot은 고유 id와 start/end/cueId/continuityId/physicalCause를 갖는다. 시간은 잠긴 오디오 안에 있고 선언한 큐와 실제로 교차해야 한다. 컷을 음표 시작점에 억지로 맞출 필요는 없다. 가사 단어만으로 연결하지 않는다. 오디오가 바뀌면 정렬 가사·큐·샷·애니매틱·후속 리뷰는 재검토한다. 원전의 musical motif와 편지/창문 같은 visual motif는 서로를 대신하지 않는다.

최종 QC에는 실제 사용한 모든 클립 구간과 물리적 개연성 검토가 필요하다. 늦게 생긴 오류를 피하려고 초반만 쓸 수는 있지만 사용 범위가 정말 깨끗하다는 근거가 있어야 한다. 오디오 비교는 MP3→AAC 같은 손실 인코딩 차이를 고려해 시간 정렬·커버리지·PCM/지문 및 청취를 검토한다. 화면 해상도/재생 길이만 같다고 같은 보컬이라고 하지 않는다.

## 7. 하네스 구현 범위

구현됨: 상대 경로·SHA-256·revision, 승인 장르 집합과 blueprint 해시, 실제 SMF 구조/주요 메타, 선언된 MIDI 음형 대응, 렌더/업로드/서비스 부모·Voice 관계, 해시 결합 리뷰/선택, 예산 기록, 보컬 훅 계획, 음악 큐/샷 관계, 애니매틱/최종 QC 기록, 단계별 종료코드, 정확한 choice와 캡처/서비스 메타데이터 결합, 중복 실제 노트 재사용 금지, 디코딩 길이·청취 구간에 연결된 큐/샷 검사, 고정 두 영상 액션의 미실행 차단.

미구현/사람 또는 어댑터 필요: 악보 자동 판독, 플랫폼 응답의 독립 재수집/전자서명, 다성 오디오의 신뢰할 수 있는 테마 추출·청음 판단, 실제 연주 가능성 전체, 영상 자동 물리 검증, 최종 MP4 오디오 추출/정렬 알고리즘, 모든 MCP/브라우저 호출의 전역 차단. 검사기는 이런 결과의 봉인된 증거를 요구하지만 대신 계산했다고 주장하지 않는다.

`guard-run.mjs`는 임의 명령과 --target을 받지 않는다. 고정된 `generate-keyframes`는 mv, `generate-clips`는 clips 게이트로 내부 연결한다. 기본은 예비 검사이고 --execute에서만 기존 suno-musicvideo의 고정 Higgsfield 헬퍼를 호출한다. 그 외 명령의 자동 실행 어댑터는 없다. 직접 MCP/브라우저 호출은 스킬의 운영 규칙과 에이전트가 통제한다.

실행 어댑터는 추가로 `project.mv.configId`(type mv-config, 실제 mv-work/mv.json)와 `productionShotsId`(type production-shots, 같은 폴더 shots.json)를 요구한다. production shots는 기존 헬퍼용 배열이며 각 id/n/from/to/cueId/continuityId와 img/vid 프롬프트를 갖는다. 고수준 shot-plan의 id/start/end/cue/continuity와 일치해야 한다. direction-review와, clips의 경우 style 승인도 실제 두 파일을 targets/bindings에 봉인해야 한다. `spend[stage].action`은 `{name,shotNumbers,configSha256,shotsSha256}`로 정확한 액션·배치를 결합하고 비용 승인 choice에도 포함한다. 호출자가 임의 work 폴더나 다른 실행 파일을 끼울 수 없다. `--shots 1,2`는 이 승인 배치와 같아야 한다. 키프레임/클립 단가는 여전히 관찰한 서비스 견적에 근거하며 검사기가 서비스 잔액을 독립 조회하는 것은 아니다. 강제적인 조직 수준 배포에는 검증된 action ticket만 받는 별도 도구 게이트웨이가 필요하다. 비용 한도도 실제 서비스 제공자의 한도/잔액과 대조해야 한다.

회귀 테스트의 완성형 ledger는 가짜 사람/가짜 음원을 담은 fixture다. 일반 CLI에서는 BLOCKED이며 실제 제작 승인에 쓸 수 없다. 테스트에서만 `allowFixtures:true`로 상태 기계를 검사한다. 별도로 실제 Fauré MIDI fixture의 6음 기호 대조를 수행한다. 어느 쪽도 기존 Suno·뮤비의 청취 인증을 소급해서 만들지 않는다.
