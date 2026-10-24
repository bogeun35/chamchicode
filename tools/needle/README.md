# 바늘 찾기 검증 도구

`needle.html` 의 테스트 API(`window.needle`)를 헤드리스 크롬으로 찔러 재는 스크립트들.
정적 서버: `node tools/balance/tuna/serve.js 8831 .` (저장소 루트). playwright-core 경로는 스크립트 첫 줄에 박혀 있음.
실제 GPU 로 돌려야 시간이 맞는다(`--use-angle=d3d11`). swiftshader 는 GPU 시간이 엉뚱한 GL 호출에 붙어 측정이 틀어짐.

| 파일 | 하는 일 |
|---|---|
| `early-bot.cjs none\|carry\|smart` | 맨손 왕복 봇 — 첫 $1·장난감 삽·$10 까지 왕복 횟수 |
| `mid-bot.cjs` (env `BF=1` 벨트 먼저, `STEP`) | 연장·벨트·쇠스랑·전기($90)까지 시간과 분당 수입 |
| `frame-prof.cjs <라벨> [url]` (env `GPU=1`) | 가만히/파는 중/덩이 500개 프레임 시간 + CPU 프로파일 상위 함수 |
| `mp-test.cjs` | 방장+손님 2인 협동 18항목 (실제 Firebase `games/nd_코드`, 끝나면 방 지움) |

함정: 봇에서 연장이 다 찬 뒤 다시 `primary(…, true)` 를 부르면 들고 있던 걸 더미에 도로 던진다(한 번만 부를 것).
매 프레임 `needle.step()`(렌더 포함)을 부르면 느리니 걷기는 `tp` + `stepOnly(dt, n)`.
