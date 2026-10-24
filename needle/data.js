// ════════════ 바늘 찾기 — 데이터 (원작: Find The Needle, FindTheNeedleDev) ════════════
// 원작 pck·세이브는 암호화돼 있고 저작자가 복호화를 금지해서 코드는 열지 않았음.
// 확인 출처: 스팀 스크린샷·트레일러 프레임(이름·가격·레벨 수), 사용자 PC의 원작 settings.cfg(기술 ID·키 이름).
// src: 'orig' = 원작 화면에서 이름·가격 확인, 'name' = 이름만 확인(가격 추정), 'guess' = 추정
// 원작 표기: 'HAND WORK', 'YARD BUILDING', 'HAY LINES', 'POWER', 'PROCESSING', 'AUTOMATION', 'WATER', 'PROSPECTING', 'SELLING', 'FITNESS'

export const STRAND_PRICE = 0.0222;          // 원작 판매대 A간판 "$0.0222 PER STRAND"
export const PILE_STRANDS = 6000000;         // 원작 소개 "about six million strands"
export const BELT_CAP = 600;                 // 원작 settings.cfg yard/belt_cap=600 (마당에 굴러다니는 건초 덩이 상한)
export const BUCKET_BASE = 600;              // 원작 화면 "0 / 600"

export const CATS = [
  { k: 'hand', en: 'HAND WORK', ko: '손일', col: '#e8913a', d: '맨손과 연장' },
  { k: 'yard', en: 'YARD BUILDING', ko: '마당 건설', col: '#7f9bb0', d: '건설 거리·재료' },
  { k: 'lines', en: 'HAY LINES', ko: '건초 라인', col: '#8fc46a', d: '벨트·분배기·합류기' },
  { k: 'power', en: 'POWER', ko: '전력', col: '#e8c23a', d: '발전기와 전선' },
  { k: 'proc', en: 'PROCESSING', ko: '가공', col: '#4cc6b4', d: '베일·포장' },
  { k: 'auto', en: 'AUTOMATION', ko: '자동화', col: '#ef6a3a', d: '갈퀴·로봇 팔' },
  { k: 'pros', en: 'PROSPECTING', ko: '탐사', col: '#b08af0', d: '금속 탐지기·스캐너' },
  { k: 'sell', en: 'SELLING', ko: '판매', col: '#f0607a', d: '건초 시세' },
  { k: 'fit', en: 'FITNESS', ko: '체력', col: '#f08ac8', d: '걷기·점프·체력' },
];

// 비용 배열 헬퍼: base 에서 시작해 mul 배씩
const G = (base, mul, n) => Array.from({ length: n }, (_, i) => Math.round(base * Math.pow(mul, i) * 100) / 100);

// col = 원작 트리의 "N STEPS" 열, up = 붙어 있는 카드(업그레이드 상자로 표시), req = 선행
export const TECH = [
  // ── 손일 HAND WORK ── (트레일러 프레임: Toy Shovel $1.00 · Spade · Broom $10.00 · Bucket Licence · Bigger Spade $15 0/5 · Pitchfork $25 · Better Broom 0/3 · Bigger Toy Shovel 0/2 · Bigger Bucket $25 · Smooth Pouring $25 · Wheelbarrow Licence)
  { id: 'bare_hands', cat: 'hand', col: 0, en: 'Bare Hands', ko: '맨손', icon: '✋', cost: [0], own: true, src: 'name', d: '처음부터 가진 손. 건초를 한 움큼(3가닥)씩 집는다.' }, // 원작 "You start by hand"(스팀 데모 소개). 한 번에 몇 가닥인지는 추정
  { id: 'hand_carry', cat: 'hand', up: 'bare_hands', en: 'Hand Carry', ko: '한 움큼', cost: [0.1, 0.25, 0.6, 1.5, 4], src: 'guess', d: '손으로 한 번에 집는 가닥 3→5→8→12→16→20', eff: l => [3, 5, 8, 12, 16, 20][l] }, // 추정: 첫 $1(장난감 삽)까지 10여 번 왕복이 되게
  { id: 'grab_reach', cat: 'hand', up: 'bare_hands', en: 'Grab Reach', ko: '팔 길이', cost: G(2, 2, 4), src: 'guess', d: '집고 쏟는 거리 +0.4m' },
  { id: 'toy_shovel', cat: 'hand', col: 1, req: ['bare_hands'], en: 'Toy Shovel', ko: '장난감 삽', icon: '🪣', cost: [1], src: 'orig', d: '빨간 플라스틱 삽. 한 번에 15가닥.', tool: 'toy' },
  { id: 'toy_shovel_size', cat: 'hand', col: 2, req: ['toy_shovel'], en: 'Bigger Toy Shovel', ko: '더 큰 장난감 삽', icon: '🪣', cost: [2, 5], src: 'name', d: '장난감 삽 +5가닥' },
  { id: 'spade', cat: 'hand', col: 1, req: ['bare_hands'], en: 'Spade', ko: '삽', icon: '♠', cost: [4], src: 'name', d: '진짜 삽. 한 번에 30가닥.', tool: 'spade' },
  { id: 'shovel_size', cat: 'hand', col: 2, req: ['spade'], en: 'Bigger Spade', ko: '더 큰 삽', icon: '♠', cost: [15, 24, 38, 60, 95], src: 'orig', d: '삽 +8가닥' },
  { id: 'broom', cat: 'hand', col: 1, req: ['bare_hands'], en: 'Broom', ko: '빗자루', icon: '🧹', cost: [10], src: 'orig', d: '바닥에 흘린 건초를 쓸어 모은다.', tool: 'broom' },
  { id: 'broom_bristles', cat: 'hand', col: 2, req: ['broom'], en: 'Better Broom', ko: '더 좋은 빗자루', icon: '🧹', cost: [12, 30, 70], src: 'name', d: '쓰는 폭 +0.5m' },
  { id: 'bucket', cat: 'hand', col: 1, req: ['bare_hands'], en: 'Bucket Licence', ko: '양동이 허가증', icon: '🪣', cost: [15], src: 'name', d: '600가닥 담는 양동이. 들고 가서 벨트에 붓는다.', tool: 'bucket' },
  { id: 'pitchfork', cat: 'hand', col: 2, req: ['spade'], en: 'Pitchfork', ko: '쇠스랑', icon: '🔱', cost: [25], src: 'orig', d: '한 번에 80가닥 푹.', tool: 'fork' },
  { id: 'fork_size', cat: 'hand', col: 3, req: ['pitchfork'], en: 'Bigger Pitchfork', ko: '더 큰 쇠스랑', icon: '🔱', cost: G(40, 1.55, 5), src: 'name', d: '쇠스랑 +25가닥' },
  { id: 'bucket_size', cat: 'hand', col: 3, req: ['bucket'], en: 'Bigger Bucket', ko: '더 큰 양동이', icon: '🪣', cost: G(25, 1.6, 5), src: 'orig', d: '양동이 +300가닥' },
  { id: 'smooth_pour', cat: 'hand', col: 3, req: ['bucket'], en: 'Smooth Pouring', ko: '부드럽게 붓기', icon: '🫗', cost: G(25, 1.8, 3), src: 'orig', d: '붓는 속도 +60%' },
  { id: 'wheelbarrow', cat: 'hand', col: 3, req: ['bucket'], en: 'Wheelbarrow Licence', ko: '외바퀴 손수레 허가증', icon: '🛒', cost: [60], src: 'name', d: '2,500가닥 싣는 손수레. 밀고 다니며 쏟는다.', tool: 'barrow' },
  { id: 'barrow_size', cat: 'hand', up: 'wheelbarrow', en: 'Bigger Barrow', ko: '더 큰 손수레', cost: G(70, 1.6, 5), src: 'guess', d: '손수레 +1,000가닥' },
  { id: 'dump_hatch', cat: 'hand', up: 'wheelbarrow', en: 'Dump Hatch', ko: '덤프 해치', cost: [90], src: 'guess', d: '손수레를 한 번에 쏟는다' },
  { id: 'easy_swing', cat: 'hand', up: 'spade', en: 'Easy Swing', ko: '가벼운 스윙', cost: G(6, 1.8, 5), src: 'guess', d: '삽질 속도 +12%' },
  { id: 'yard_vac', cat: 'hand', col: 4, req: ['wheelbarrow'], en: 'Yard Vac', ko: '마당 청소기', icon: '🌀', cost: [320], src: 'guess', d: '건초를 빨아들이고(왼쪽) 뿜는다(오른쪽). 1,500가닥.', tool: 'vac' },

  // ── 마당 건설 YARD BUILDING ── (스크린샷: Waste Less Material $100.00 0/3 · Extend the Shed $150 0/6)
  { id: 'build_reach', cat: 'yard', col: 1, req: ['belt'], en: 'Build Reach', ko: '건설 거리', icon: '📐', cost: G(20, 1.8, 4), src: 'guess', d: '설치 가능한 거리 +2m' },
  { id: 'waste_less', cat: 'yard', col: 2, req: ['build_reach'], en: 'Waste Less Material', ko: '재료 아끼기', icon: '🪵', cost: [100, 160, 260], src: 'orig', d: '건설비 -10%' },

  // ── 건초 라인 HAY LINES ── (스크린샷: Conveyor Plans · Faster Belt Motor $15 0/12 · Alternating Splitter · Belt Joiner · Priority Arm)
  { id: 'belt', cat: 'lines', col: 1, req: ['bare_hands'], en: 'Conveyor Plans', ko: '컨베이어 설계도', icon: '➖', cost: [3], src: 'name', d: '벨트를 깔 수 있다. B 로 건설.', build: ['belt'] },
  { id: 'belt_speed', cat: 'lines', up: 'belt', en: 'Faster Belt Motor', ko: '더 빠른 벨트 모터', cost: G(15, 1.35, 12), src: 'orig', d: '벨트 속도 +15%' },
  { id: 'splitter', cat: 'lines', col: 2, req: ['belt'], en: 'Alternating Splitter', ko: '교대 분배기', icon: '⑂', cost: [20], src: 'name', d: '들어온 건초를 왼쪽·오른쪽으로 번갈아 보낸다.', build: ['splitter'] },
  { id: 'joiner', cat: 'lines', col: 3, req: ['splitter'], en: 'Belt Joiner', ko: '벨트 합류기', icon: '⑃', cost: [35], src: 'name', d: '벨트 끝을 다른 벨트 옆구리에 붙여 합칠 수 있다.' },

  // ── 전력 POWER ── (스크린샷: Electricity · Bigger Boiler $80 0/6 · Bigger Firebox $60 0/5 · Power Pole · Longer Spans $100 0/5 · Longer Drops $90 0/4, 영상: Electricity $90)
  { id: 'electricity', cat: 'power', col: 2, req: ['belt'], en: 'Electricity', ko: '전기', icon: '⚡', cost: [90], src: 'orig', d: '건초를 태우는 증기 발전기. 기계 근처에 두면 전기가 간다.', build: ['generator'] },
  { id: 'generator_output', cat: 'power', up: 'electricity', en: 'Bigger Boiler', ko: '더 큰 보일러', cost: G(80, 1.5, 6), src: 'orig', d: '발전량 +2' },
  { id: 'firebox', cat: 'power', up: 'electricity', en: 'Bigger Firebox', ko: '더 큰 화실', cost: G(60, 1.5, 5), src: 'orig', d: '연료 칸 +50% · 연소 효율 +10%' },
  { id: 'pole', cat: 'power', col: 3, req: ['electricity'], en: 'Power Pole', ko: '전봇대', icon: '🗼', cost: [40], src: 'name', d: '전기를 멀리 보낸다.', build: ['pole'] },
  { id: 'pole_span', cat: 'power', up: 'pole', en: 'Longer Spans', ko: '더 긴 전선', cost: G(100, 1.5, 5), src: 'orig', d: '전봇대 사이 거리 +2m' },
  { id: 'pole_drop', cat: 'power', up: 'pole', en: 'Longer Drops', ko: '더 긴 인입선', cost: G(90, 1.5, 4), src: 'orig', d: '전봇대 주변 전기 반경 +1m' },

  // ── 자동화 AUTOMATION ── (영상: Hay Piston Rake $60.00 · Small Arm Plans · Arm Speed $30 · Arm Carry Size $30 · Standard Arm Plans $150.00 · Long-Reach Arm Plans · Wider Rake Head 0/5 · Faster Return Spring 0/5)
  { id: 'rake', cat: 'auto', col: 2, req: ['belt'], en: 'Hay Piston Rake', ko: '건초 피스톤 갈퀴', icon: '⫸', cost: [60], src: 'orig', d: '더미 가장자리를 긁어 앞의 벨트로 밀어낸다. 전기 불필요(스프링).', build: ['rake'] },
  { id: 'rake_bite', cat: 'auto', up: 'rake', en: 'Wider Rake Head', ko: '넓은 갈퀴 머리', cost: G(40, 1.55, 5), src: 'name', d: '한 번에 긁는 양 +30%' },
  { id: 'rake_speed', cat: 'auto', up: 'rake', en: 'Faster Return Spring', ko: '빠른 복귀 스프링', cost: G(40, 1.55, 5), src: 'name', d: '갈퀴 속도 +15%' },
  { id: 'arm_small', cat: 'auto', col: 3, req: ['electricity'], en: 'Small Arm Plans', ko: '소형 팔 설계도', icon: '🦾', cost: [120], src: 'name', d: '더미에서 건초를 집어 근처 벨트·기계에 놓는 로봇 팔. 전기 필요.', build: ['arm_small'] },
  { id: 'arm_speed', cat: 'auto', up: 'arm_small', en: 'Arm Speed', ko: '팔 속도', cost: G(30, 1.45, 8), src: 'orig', d: '모든 팔 속도 +12%' },
  { id: 'arm_payload', cat: 'auto', up: 'arm_small', en: 'Arm Carry Size', ko: '팔 운반량', cost: G(30, 1.45, 8), src: 'orig', d: '모든 팔 운반량 +20%' },
  { id: 'arm_standard', cat: 'auto', col: 4, req: ['arm_small'], en: 'Standard Arm Plans', ko: '표준 팔 설계도', icon: '🦾', cost: [150], src: 'orig', d: '더 멀리, 더 많이 집는 팔.', build: ['arm_standard'] },
  { id: 'arm_long', cat: 'auto', col: 5, req: ['arm_standard'], en: 'Long-Reach Arm Plans', ko: '장거리 팔 설계도', icon: '🦾', cost: [600], src: 'name', d: '반경 5.5m 팔.', build: ['arm_long'] },

  // ── 가공 PROCESSING ── (스크린샷: Larger Bale Chamber $50 0/6 · Faster Bale Press $50 0/6 · Raise Bale Quality $50 0/5 · Wrapper Plans)
  { id: 'compressor', cat: 'proc', col: 3, req: ['electricity'], en: 'Compressor Plans', ko: '압축기 설계도', icon: '🧱', cost: [140], src: 'guess', d: '건초를 베일로 압축. 베일은 가닥값보다 비싸게 팔린다.', build: ['compressor'] },
  { id: 'compressor_batch', cat: 'proc', up: 'compressor', en: 'Larger Bale Chamber', ko: '더 큰 베일 실', cost: G(50, 1.5, 6), src: 'orig', d: '베일 한 개 +60가닥' },
  { id: 'compressor_speed', cat: 'proc', up: 'compressor', en: 'Faster Bale Press', ko: '더 빠른 베일 압착', cost: G(50, 1.5, 6), src: 'orig', d: '압착 속도 +15%' },
  { id: 'bale_quality', cat: 'proc', up: 'compressor', en: 'Raise Bale Quality', ko: '베일 품질 향상', cost: G(50, 1.5, 5), src: 'orig', d: '베일 값 +8%' },
  { id: 'wrapper', cat: 'proc', col: 4, req: ['compressor'], en: 'Wrapper Plans', ko: '포장기 설계도', icon: '🎁', cost: [260], src: 'name', d: '베일을 비닐로 감싸 더 비싸게.', build: ['wrapper'] },
  { id: 'wrapper_speed', cat: 'proc', up: 'wrapper', en: 'Faster Wrapping', ko: '포장 속도', cost: G(60, 1.5, 5), src: 'guess', d: '포장 속도 +15%' },
  { id: 'foil_quality', cat: 'proc', up: 'wrapper', en: 'Foil Quality', ko: '포장지 품질', cost: G(60, 1.5, 5), src: 'guess', d: '포장 베일 값 +8%' },

  // ── 탐사 PROSPECTING ── (settings.cfg: scanner_mk1 · scan_speed · scan_batch)
  { id: 'detector', cat: 'pros', col: 0, en: 'Metal Detector', ko: '금속 탐지기', icon: '📡', cost: [0], own: true, src: 'name', d: '처음부터 가진 탐지기. 바늘에 가까울수록 빨리 삑삑.' },
  { id: 'detector_range', cat: 'pros', up: 'detector', en: 'Wider Coil', ko: '넓은 코일', cost: G(8, 2, 5), src: 'guess', d: '탐지 거리 +0.5m' },
  { id: 'scanner_mk1', cat: 'pros', col: 3, req: ['electricity'], en: 'Hay Scanner Mk1', ko: '건초 스캐너 Mk1', icon: '🔍', cost: [300], src: 'name', d: '벨트에 끼워 지나가는 건초 속 바늘을 찾아 빼낸다. 전기 필요.', build: ['scanner'] },
  { id: 'scan_speed', cat: 'pros', up: 'scanner_mk1', en: 'Scan Speed', ko: '스캔 속도', cost: G(80, 1.5, 5), src: 'name', d: '스캐너 통과 속도 +20%' },

  // ── 판매 SELLING ── (settings.cfg: hay_price)
  { id: 'hay_price', cat: 'sell', col: 1, req: ['bare_hands'], en: 'Haggle', ko: '건초 시세 협상', icon: '💲', cost: G(3, 1.75, 10), src: 'guess', d: '가닥 값 +10%' },

  // ── 체력 FITNESS ── (settings.cfg: work_boots · strong_back · second_wind · jump_height)
  { id: 'work_boots', cat: 'fit', col: 1, req: ['bare_hands'], en: 'Work Boots', ko: '작업화', icon: '🥾', cost: G(4, 1.9, 5), src: 'name', d: '걷기 속도 +8%' },
  { id: 'strong_back', cat: 'fit', col: 2, req: ['work_boots'], en: 'Strong Back', ko: '튼튼한 허리', icon: '💪', cost: G(10, 1.9, 5), src: 'name', d: '양동이·손수레 들고 걷기 +10% · 연장 운반량 +6%' },
  { id: 'second_wind', cat: 'fit', col: 2, req: ['work_boots'], en: 'Second Wind', ko: '두 번째 숨', icon: '🫁', cost: G(8, 2, 3), src: 'name', d: '달리기 체력 회복 +40%' },
  { id: 'jump_height', cat: 'fit', col: 3, req: ['second_wind'], en: 'Jump Height', ko: '높이뛰기', icon: '🦘', cost: G(15, 2, 3), src: 'name', d: '점프 +20%' },
];
export const TECH_BY = Object.fromEntries(TECH.map(t => [t.id, t]));

// 원작 settings.cfg builds_placed: cabinet, belt, generator, pole, rake, u_joiner, joiner, arm, compressor, arm_standard, u_splitter, splitter, wrapper, scanner
// cost = 설치비(추정), power = 전력 소모 단위(추정), r = 몸 반경
export const BUILD = {
  belt:        { ko: '컨베이어 벨트', en: 'Belt', icon: '➖', cost: 1.5, perM: true, d: '끝점을 두 번 찍어 깐다. m당 가격.' },
  splitter:    { ko: '교대 분배기', en: 'Alternating Splitter', icon: '⑂', cost: 12, r: .55, d: '입구 1 · 출구 2 (번갈아)' },
  generator:   { ko: '증기 발전기', en: 'Generator', icon: '⚡', cost: 45, r: 1.1, power: 0, d: '건초를 넣으면(벨트·직접) 태워서 전기를 만든다.' },
  pole:        { ko: '전봇대', en: 'Power Pole', icon: '🗼', cost: 6, r: .25, d: '전기를 이어 준다.' },
  rake:        { ko: '건초 피스톤 갈퀴', en: 'Hay Piston Rake', icon: '⫸', cost: 25, r: .7, d: '더미 쪽을 보게 놓으면 뒤로 긁어 벨트에 떨어뜨린다.' },
  arm_small:   { ko: '소형 팔', en: 'Small Arm', icon: '🦾', cost: 30, r: .5, power: 1, reach: 2.6, pay: 30, cyc: 2.6, d: '반경 2.6m · 30가닥/회' }, // 운반량은 추정: 손(쇠스랑)보다 너무 약해서 2배 남짓으로
  arm_standard:{ ko: '표준 팔', en: 'Standard Arm', icon: '🦾', cost: 80, r: .6, power: 2, reach: 3.8, pay: 80, cyc: 2.8, d: '반경 3.8m · 80가닥/회' },
  arm_long:    { ko: '장거리 팔', en: 'Long-Reach Arm', icon: '🦾', cost: 220, r: .7, power: 3, reach: 5.5, pay: 160, cyc: 3.2, d: '반경 5.5m · 160가닥/회' },
  compressor:  { ko: '압축기', en: 'Compressor', icon: '🧱', cost: 60, r: 1.0, power: 2, d: '건초 → 베일 (베일 값 = 가닥값 ×1.3)' },
  wrapper:     { ko: '포장기', en: 'Wrapper', icon: '🎁', cost: 90, r: 1.0, power: 2, d: '베일 → 포장 베일 (×1.6)' },
  scanner:     { ko: '건초 스캐너', en: 'Scanner Mk1', icon: '🔍', cost: 120, r: .8, power: 2, d: '지나가는 건초 속 바늘을 빼서 옆 쟁반에 둔다.' },
  cabinet:     { ko: '바늘 진열장', en: 'Needle Cabinet', icon: '🗄', cost: 0, r: .8, max: 1, d: '찾은 바늘을 진열한다.' },
};

// 원작 트레일러의 진열장 이름표 (RESEARCH 등급 · 희귀도 표기 그대로). 이번 더미에는 12개.
export const NEEDLES = [
  { k: 'bent', en: 'BENT PIN', ko: '굽은 핀', tier: 1, odds: '1:2', col: '#d8b040' },
  { k: 'sewing', en: 'SEWING', ko: '바느질 바늘', tier: 1, odds: '1:4', col: '#d8d8e0' },
  { k: 'safety', en: 'SAFETY PIN', ko: '옷핀', tier: 1, odds: '1:8', col: '#e0e0e8' },
  { k: 'push', en: 'PUSH PIN', ko: '압정 핀', tier: 1, odds: '1:16', col: '#d83030' },
  { k: 'darning', en: 'DARNING', ko: '꿰매기 바늘', tier: 2, odds: '1:2', col: '#cfd4dc' },
  { k: 'hat', en: 'HAT PIN', ko: '모자 핀', tier: 2, odds: '1:4', col: '#f0f0ff' },
  { k: 'bodkin', en: 'BODKIN', ko: '돗바늘', tier: 2, odds: '1:2', col: '#c8ccd4' },
  { k: 'crochet', en: 'CROCHET', ko: '코바늘', tier: 2, odds: '1:4', col: '#d0d0d8' },
  { k: 'awl', en: 'LEATHER AWL', ko: '가죽 송곳', tier: 2, odds: '1:8', col: '#6a4a30' },
  { k: 'knitting', en: 'KNITTING', ko: '뜨개바늘', tier: 2, odds: '1:16', col: '#e0c060' },
  { k: 'syringe', en: 'SYRINGE', ko: '주사기', tier: 3, odds: '1:24', col: '#cfe8f0' },
  { k: 'phono', en: 'PHONOGRAPH', ko: '축음기 바늘', tier: 3, odds: '1:48', col: '#c8a040' },
];

// 미션(원작 show_missions 옵션은 있으나 문구는 확인 못 함 → 추정)
export const MISSIONS = [
  { id: 'first_strand', t: '건초 한 움큼을 집어 HAY IN 벨트에 올리기', hint: '더미를 보고 왼쪽 클릭으로 집고, 벨트를 보고 다시 클릭' },
  { id: 'carry', t: "연구에서 '한 움큼' 사기", hint: 'Tab(또는 SUPPLY CO. 단말기에서 E) → 손일 · 맨손 업그레이드. 한 번에 집는 양이 늘어난다' },
  { id: 'earn1', t: '$1.00 벌기', hint: '판매대 저울에 들어간 만큼 돈이 들어온다. 한 움큼을 더 올리면 금방' },
  { id: 'buy_tool', t: 'SUPPLY CO. 에서 연장 사기', hint: 'SUPPLY CO. 간판 앞 단말기에서 E (또는 Tab)' },
  { id: 'pickup_tool', t: '배달된 연장 줍기', hint: 'SUPPLY CO. 앞 팔레트에 놓인 연장을 보고 E' },
  { id: 'earn10', t: '$10 벌기', hint: '장난감 삽으로 퍼서 HAY IN 에 쏟자' },
  { id: 'belt', t: '컨베이어로 더미와 HAY IN 잇기', hint: '연구(Tab)에서 컨베이어 설계도 → B 로 건설 → 더미 옆에서 HAY IN 벨트 시작점까지. 이제 걷지 않고 판다' },
  { id: 'bucket', t: '양동이 허가증 사기', hint: '양동이에 모아 한 번에 붓기' },
  { id: 'detector', t: '금속 탐지기로 더미 훑기', hint: '2번 탐지기. 빨라지는 삑 소리를 따라가자' },
  { id: 'electric', t: '발전기를 놓고 건초로 불 붙이기', hint: '발전기 호퍼에 건초를 넣으면 탄다' },
  { id: 'arm', t: '로봇 팔 설치', hint: '더미 가장자리 + 벨트가 팔 반경 안에' },
  { id: 'needle', t: '바늘 1개 찾기', hint: '탐지기 · 스캐너 · 아니면 운' },
  { id: 'cabinet', t: '바늘을 진열장에 넣기', hint: '진열장을 설치하고 바늘을 든 채 E' },
  { id: 'all', t: '바늘 12개 모두 진열', hint: '더미 어딘가에 남아 있다' },
];
