# 참치파크 (PICO PARK 1·2 이식)

이 폴더는 **배포본만** 담는다. 플레이는 [`source-play/`](source-play/)에서 하고,
[`../coop.html`](../coop.html) 이 그리로 보낸다.

- `source-play/` — 원작 데이터에서 복원한 실제 라운드. 현재 **9개**
  (2편 1-1~1-4, 4-1, 4-3, 4-4, 10-2, 11-4). 2~8인 온라인 협동.
- `campaign/`, `rebuild/` — **원작 배치가 아닌 기믹 데모.** 원작 라운드로 세지 말 것.
  옛 메뉴가 "플레이 가능한 맵 94개"로 표시하던 것들인데, 전부 같은 평지 템플릿 하나였다.
- `source-runtime/full-scope-status.json` — 전체 범위와 진행 상태.

## 이 게임을 더 만들려면

**이 저장소에는 만드는 도구가 없다.** 런타임·장치 모듈·테스트·추출 스크립트·분석 리포트는
전부 작업 저장소에 있다:

> **https://github.com/bogeun35/VONE2** → `reference-analysis/`
> 시작점: `reference-analysis/HANDOFF.md`

거기에 현재 상태, 원작 근거(사망선·카메라 등 네이티브 주소 포함), 함정 목록,
남은 작업(`remaining-work.json`), 장치 추가 절차가 전부 들어 있다.

빌드 파이프라인도 그쪽에 있다:
```
reference-analysis/source-migration/
  node package-source-play.cjs            # 스테이지 데이터 생성
  node deploy-source-play.cjs <버전>       # 이 저장소로 복사 + 캐시 버전 갱신
```
