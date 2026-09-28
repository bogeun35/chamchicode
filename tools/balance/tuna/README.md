# 참치 타이쿤 밸런스·검증 도구

`tuna.html` 의 디버그 API(`window.tuna`)를 헤드리스 크롬으로 찔러, 게임 로직만 최대 속도로 돌려 재는 스크립트들. 배경은 `docs/tuna/HANDOFF.md`.

## 준비

```
node tools/balance/tuna/serve.js 8766 .          # 저장소 루트를 정적 서버로 (포트, 루트)
```

- 헤드리스 크롬을 원격 디버깅 포트로 띄운다(기본 `http://localhost:9224`, 바꾸려면 `CDP_URL`).
- puppeteer-core 가 전역에 없으면 `PUPPETEER_CORE` 에 경로를 준다.
- 결과 JSON 은 `tools/balance/tuna/out/` (바꾸려면 `OUT_DIR`). `out/` 은 커밋하지 않는다.

## 공통 환경변수

| 변수 | 뜻 | 예 |
|---|---|---|
| `TUNA_URL` | 잴 파일 주소. 원본을 계속 고칠 수 있게 **스냅샷 사본**을 쓴다 | `http://127.0.0.2:8766/tuna-bal-a.html` |
| `TUNA_PRE` | 시작 전에 페이지에서 실행할 코드 | `tuna.enterGame('hard')` |
| `TUNA_MAXV` | 최대 항해 수(비우면 클리어까지) | `25` |

여러 판을 동시에 돌릴 때는 주소 호스트를 `127.0.0.2`, `127.0.0.3` … 으로 바꿔 localStorage 를 분리한다. PowerShell 은 빈 문자열 인자를 버리므로 값은 환경변수로 넘긴다.

## 스크립트

| 파일 | 하는 일 | 사용 |
|---|---|---|
| `progress-full.js` | 새 세이브 → 클리어(리바이어던)까지 항해↔항구 구매 반복. 숙련·유물 구매는 게임 규칙(`masteryCan`/`relicUpCost`)을 따름. 마일스톤·유물 기록 포함. **클리어 시간은 이걸로 잰다** | `node progress-full.js <라벨> chase\|center` |
| `progress.js` | 위의 옛 판(숙련 구매가 1.x 규칙). `early.js` 가 구매 로직을 가져다 씀 | 같음 |
| `early.js` | 초반 N항해 표: 첫 포획 초·포획 수·골드·레벨·화면 물고기·최대 콤보 | `TUNA_MAXV=25 node early.js <라벨> chase\|center\|cluster` |
| `relic-table.js` | `progress-full.js` 결과에서 유물 단계별 수집 시각표 | `node relic-table.js out/E-progress-<라벨>.json` |
| `balance.js` | 뷰포트 4종 × 봇 3종으로 스폰 분포(가장자리 비율)·그물 면적비·포획 비교 | `REPS=4 node balance.js <라벨>` |
| `species.js` | 어종 21종 해금 세이브로 어종별 등장·포획·포획률 | `node species.js <라벨> normal\|hard <항해수> [어장번호]` |
| `serve.js` | 캐시 끈 정적 서버 | `node serve.js <포트> <루트>` |

## 봇

| 봇 | 뜻 |
|---|---|
| `chase` | 가장 값진·가까운 물고기를 700px/s 로 쫓는 적극 플레이 |
| `cluster` | 물고기가 가장 많이 모인 곳으로 1200px/s (사람형) |
| `center` | 그물을 화면 가운데 고정한 방치 플레이 |

## 2.1 기준값 (비교용)

`progress-full.js`, 1280×720: 일반 chase 79분 · center 115분, 하드 chase 100분 · center 169분. 목표는 일반 적극 70~90분, 방치 ≥ 적극×1.15, 하드 = 일반×1.2~1.6.
