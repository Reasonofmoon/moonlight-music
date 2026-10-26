# 달의이성 · Music Archive

## 현재 상태

사용자의 배포 재개 요청에 따라 별도 음악 저장소와 GitHub Pages 공개를 진행합니다. 현재 2개 테마·7곡으로 구성되어 있습니다.

## 배포 파일

이 폴더에는 실제 catalog.json과 표준 AAC-LC M4A 음원 7개가 모두 들어 있습니다. 빌드나 npm 설치가 필요 없는 정적 웹사이트입니다. 전체 약 18MB이며, 각 음원은 25MB 미만입니다.

- index.html / styles.css / app.js: 감상 페이지
- catalog.json: 2개 테마, 7개 곡의 공개용 정보와 보컬 가사
- 01…07 .m4a: 48kHz stereo AAC-LC 스트리밍용 호환 파일
- .nojekyll: GitHub Pages 정적 제공

원래 M4A가 Opus 기반이어서 브라우저의 네이티브 AAC 인코더로 스트리밍용 변환을 했습니다. 원본 무손실 마스터를 의미하지 않습니다. 최신 Chromium에서 7개 파일의 메타데이터와 실제 재생, 필터를 확인했습니다. 실제 iOS Safari 기기 검수는 아직 하지 않았습니다.

회원가입·외부 폰트·추적 스크립트·별도 API 서버를 사용하지 않습니다. 내부 크레딧, 계정 이메일, 사용자 경로, 책 PDF, MIDI 작곡 코드와 비공개 작업 기록은 이 폴더에 넣지 않았습니다.

## 배포·운영

1. GitHub의 기존 Reasonofmoon 계정 인증을 마칩니다.
2. 전용 저장소 이름은 moonlight-music입니다.
3. 이 폴더의 13개 파일을 저장소 루트에 업로드합니다. 음원·가사를 포함한 모든 게시 파일은 공개 접근이 가능하므로 가시성을 확인합니다.
4. GitHub Pages에서 main 브랜치 루트를 선택합니다. 기존 다른 사이트나 도메인 설정은 변경하지 않습니다.
5. 실제 발급된 배포 URL에서 익명 접근, catalog.json, 음원 HTTP 요청과 재생, 가사, 모바일 레이아웃을 확인합니다.

## 새 테마·곡 추가

- themes에 고유 id와 실제 원전 출처를 추가합니다. status는 released 또는 in-progress입니다.
- tracks에 id, title, subtitle, genre, themeId, kind(instrumental/vocal), duration(초), audio(같은 저장소의 상대 .m4a 경로), description, design, links를 추가합니다. lyrics와 voice는 선택 사항입니다.
- design의 조성·BPM은 실제 오디오 분석이 아닌 MIDI·생성 설계값으로 표시됩니다.
- audio에는 외부 URL·상위 경로를 쓰지 않습니다. 확장자는 .m4a 또는 .aac입니다.
- 음원 파일을 추가하고 updatedAt을 갱신합니다. 개별 공유 주소는 #track=곡ID입니다.
- 매 공개 업데이트 전에 해당 변경에 대한 사용자 승인을 받고, 게시 후 실제 재생을 검증합니다.

## 권리

원전의 퍼블릭 도메인, 새 녹음·편곡·가사·보컬의 권리는 서로 다릅니다. 정확한 출처는 catalog.json과 페이지의 크레딧에 있습니다. 현대 녹음을 샘플링하지 않았습니다. 음악·가사의 재사용 라이선스는 부여하지 않습니다. 웹 재생은 파일을 전송하므로 다운로드 방지나 DRM을 제공하지 않습니다.

## 미리보기

별도로 전달한 Music-Archive-Preview.html에는 7곡을 내장했습니다. 이 폴더의 index.html은 JSON을 읽으므로 file://로 직접 여는 대신 웹 서버 또는 실제 배포 주소에서 사용하세요.
