# 쿵짝항구 검증 도구

`rhythm.html` 을 자동으로 확인하는 스크립트 모음. 기준값과 배경은 [docs/rhythm/README.md](../../docs/rhythm/README.md) 4절.

## 준비

1. 저장소 폴더를 정적 서버로 8766 포트에 띄운다 (어느 서버든 됨. 예: `npx serve -l 8766 .`).
2. 원격 디버깅 포트를 연 크롬을 띄운다. 기본값은 `http://localhost:9224` (헤드리스 권장: `chrome --headless=new --remote-debugging-port=9224`).
3. `npm i puppeteer-core` (다른 위치에 있으면 `PUPPETEER_CORE=<경로>` 로 지정).
4. 스크린샷·결과는 `tools/rhythm/out/` 에 쌓인다 (없으면 만들 것).

## 스크립트

| 파일 | 하는 일 | 실행 예 |
|---|---|---|
| smoke.js | 5곡 완벽/+60ms/무입력 봇, 페이지 오류, 아이폰13 로드 | `RFILE=rhythm.html node smoke.js` |
| bots.js | 사람 흉내 봇(초보·보통·능숙) × 5곡 × 시드 10 + 꼼수 봇 | `node bots.js 127.0.0.1 cur` |
| align.js | 정답 음마다 링이 과녁에 닿는 시각 − 정답 시각 | `node align.js sushi,salute 127.0.0.1` |
| pix.js | 화면 픽셀만으로 정답 전후 움직임 확인(검증 훅 없이) | `node pix.js 127.0.0.1 cur` |
| shots.js / mob.js | 정답 순간 화면 캡처(데스크톱 / 아이폰13) | `node shots.js 127.0.0.1 cur` |
| prac.js | 연습 단계 길이·자동 진행 | `node prac.js 127.0.0.1 cur` |
| spec.js (+page-lib2.js) | 곡 오프라인 렌더 → 대역 비율·박 온셋·신호 대 반주·스펙트로그램 | `node spec.js 127.0.0.1 cur sushi gull` |
| flow-hub.js | 허브 → 보정 → 5곡 연습·본게임·결과를 실제 터치/마우스로 | `node flow-hub.js iphone` (iphone / land / desk) |
| flow-real-audio.js | 실제 오디오 모드: 늦은 예약·버림·큐 로그 대조 | `node flow-real-audio.js` |
| perf.js | 곡별 프레임 간격·긴 작업·그리기 시간·메모리 | `RFILE=rhythm.html node perf.js` |
| montage.js | 스크린샷 여러 장을 한 장으로 | `node montage.js out/m.png 3 a.png b.png c.png` |

- `lib.js` 의 `open(host, 'before')` 는 이전 판과 비교할 때 쓴다. 이전 판 파일 경로는 `RH_BEFORE` 로 준다.
- 스크립트 여러 개를 동시에 돌리면 localStorage 가 섞이지 않게 호스트를 127.0.0.1, 127.0.0.2 처럼 나눠 준다.
