(function(root){
'use strict';
const catalogue=[
 {
  "id": "pico1/battle/01",
  "title": "높이 대결",
  "mechanic": "시간이 끝났을 때 가장 높이 있는 사람이 승리",
  "evidence": "secondary-text-confirmed; gameplay not watched",
  "sourceActions": []
 },
 {
  "id": "pico1/battle/02",
  "title": "영역 차지",
  "mechanic": "공의 방향을 바꿔 더 넓은 영역 차지",
  "evidence": "secondary-text-confirmed; gameplay not watched",
  "sourceActions": []
 },
 {
  "id": "pico1/battle/03",
  "title": "점프 생존",
  "mechanic": "포탄을 피해 마지막까지 살아남기",
  "evidence": "secondary-text-confirmed; gameplay not watched",
  "sourceActions": []
 },
 {
  "id": "pico1/battle/04",
  "title": "시간 맞추기",
  "mechanic": "남은 시간을 0.01초에 가깝게 멈추기",
  "evidence": "secondary-text-confirmed; gameplay not watched",
  "sourceActions": []
 },
 {
  "id": "pico1/endless/01",
  "title": "끝없는 점프",
  "mechanic": "함께 포탄을 계속 피하기 · 맞으면 종료",
  "evidence": "secondary-text inventory; detailed rules need gameplay verification",
  "sourceActions": []
 },
 {
  "id": "pico1/endless/02",
  "title": "끝없는 블록 퍼즐",
  "mechanic": "떨어지는 블록으로 함께 줄 없애기",
  "evidence": "secondary-text inventory; detailed rules need gameplay verification",
  "sourceActions": []
 },
 {
  "id": "pico1/endless/03",
  "title": "끝없는 달리기",
  "mechanic": "흘러가는 장애물을 계속 뛰어넘기",
  "evidence": "secondary-text inventory; detailed rules need gameplay verification",
  "sourceActions": []
 },
 {
  "id": "pico1/endless/04",
  "title": "끝없는 비행",
  "mechanic": "밧줄로 연결된 채 날아서 지형 피하기 · 부딪히면 종료",
  "evidence": "secondary-text inventory; detailed rules need gameplay verification",
  "sourceActions": []
 },
 {
  "id": "pico1/world/01-01",
  "title": "1-1",
  "mechanic": "동료 쌓기 · 버튼 다리 · 승강기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Stack to send a scout over the gap; scout presses button extending bridge for others, then group uses lift to exit."
  ]
 },
 {
  "id": "pico1/world/01-02",
  "title": "1-2",
  "mechanic": "벽 밀기 · 떨어지는 기둥 · 발판 되돌리기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Push wall left for key, then right so pillar falls into gap; move next block across and return it toward left-behind players as a climbing aid."
  ]
 },
 {
  "id": "pico1/world/01-03",
  "title": "1-3",
  "mechanic": "위아래 경로의 버튼을 서로 열어 주기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Split upper/lower routes: upper player presses button for lower player; lower player places boxes on buttons to remove upper route barriers, then reunite."
  ]
 },
 {
  "id": "pico1/world/01-04",
  "title": "1-4",
  "mechanic": "이동 발판 · 탑승 인원에 반응하는 발판",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Ride moving platforms; enough players lower central platform to shelter from moving pillar, recover low key, exit via lift in turns."
  ]
 },
 {
  "id": "pico1/world/02-01",
  "title": "2-1",
  "mechanic": "밧줄로 연결된 동료와 함께 이동",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Rope-linked traversal: keep teammates on safe upper ground while one hangs below for key, then traverse gaps together."
  ]
 },
 {
  "id": "pico1/world/02-02",
  "title": "2-2",
  "mechanic": "밧줄에 매달려 동료의 착지 돕기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Suspend key collector by rope; descend right-side opening while lower players move left to pull falling allies inward; stack and pull last players up to door."
  ]
 },
 {
  "id": "pico1/world/02-03",
  "title": "2-3",
  "mechanic": "밧줄로 연결된 동료를 쌓아 운반",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Carry team as a stack on one running player; upper player temporarily jumps for key and returns to stack; take lift and exit in turns."
  ]
 },
 {
  "id": "pico1/world/02-04",
  "title": "2-4",
  "mechanic": "쌓은 높이를 조절하며 함께 건너기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Stack onto carrier, using spring/block where player count supplies them; control stack height under hanging obstacle. Secondary guide identifies single-pass collapsing bridge."
  ]
 },
 {
  "id": "pico1/world/03-01",
  "title": "3-1",
  "mechanic": "제한 시간 안에 동전 모으기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Collect all upper/lower coins within limit, use teammate as step for high coins; key appears after collection, exit before timer ends."
  ]
 },
 {
  "id": "pico1/world/03-02",
  "title": "3-2",
  "mechanic": "규칙 확인 필요",
  "evidence": "unverified",
  "sourceActions": []
 },
 {
  "id": "pico1/world/03-03",
  "title": "3-3",
  "mechanic": "제한 시간 안에 동전을 모아 열쇠 얻기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Collect all coins under timer, help teammate reach high coin positions; center key appears only after all coins, timer continues until escape."
  ]
 },
 {
  "id": "pico1/world/03-04",
  "title": "3-4",
  "mechanic": "버튼을 눌러 남은 시간 늘리기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Press route buttons to add one second each; distribute players across staircase tiers, collect highest-tier key and exit within extended time."
  ]
 },
 {
  "id": "pico1/world/04-01",
  "title": "4-1",
  "mechanic": "방패로 위험 구간 통과",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Shield carrier blocks electric hazard while others pass; arrange a stack with shield at top for later overhead hazards."
  ]
 },
 {
  "id": "pico1/world/04-02",
  "title": "4-2",
  "mechanic": "함께 날며 장애물 밀기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Fly through course, all players push obstructing block, take adjacent key, navigate upward/downward stepped tunnel to exit."
  ]
 },
 {
  "id": "pico1/world/04-03",
  "title": "4-3",
  "mechanic": "각자의 남은 시간을 합쳐 목표 맞추기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Each player stops a personal countdown. Sum of remaining times must be under target, but no player may reach zero; failure resets puzzle, success reveals key."
  ]
 },
 {
  "id": "pico1/world/04-04",
  "title": "4-4",
  "mechanic": "크기 변경 버튼 · 함께 타는 승강기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Shrink on minus switch for narrow passage; stack small players on carrier then enlarge carrier on plus switch to lift team; upper players get key and push pillar to open route for carrier."
  ]
 },
 {
  "id": "pico1/world/05-01",
  "title": "5-1",
  "mechanic": "규칙 확인 필요",
  "evidence": "unverified",
  "sourceActions": []
 },
 {
  "id": "pico1/world/05-02",
  "title": "5-2",
  "mechanic": "규칙 확인 필요",
  "evidence": "unverified",
  "sourceActions": []
 },
 {
  "id": "pico1/world/05-03",
  "title": "5-3",
  "mechanic": "규칙 확인 필요",
  "evidence": "unverified",
  "sourceActions": []
 },
 {
  "id": "pico1/world/05-04",
  "title": "5-4",
  "mechanic": "규칙 확인 필요",
  "evidence": "unverified",
  "sourceActions": []
 },
 {
  "id": "pico1/world/06-01",
  "title": "6-1",
  "mechanic": "같은 색 블록 밀기 · 움직이는 계단",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Push matching-color blocks; upper players drop blocks onto the lower carrier block, forming steps for everyone."
  ]
 },
 {
  "id": "pico1/world/06-02",
  "title": "6-2",
  "mechanic": "자동으로 움직이는 화면 · 계단 운반",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Ride lift, push the staircase forward, then climb without displacing its blocks."
  ]
 },
 {
  "id": "pico1/world/06-03",
  "title": "6-3",
  "mechanic": "발판을 타고 위로 이동",
  "evidence": "partial",
  "sourceActions": [
   "Use platforms to move up and down."
  ]
 },
 {
  "id": "pico1/world/06-04",
  "title": "6-4",
  "mechanic": "누르면 위험해지는 버튼 피하기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Jump past buttons without contact; stack to collect the elevated key."
  ]
 },
 {
  "id": "pico1/world/07-01",
  "title": "7-1",
  "mechanic": "움직임에 반응해 쫓아오는 유령",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Advance cautiously, stop when the ghost becomes red, collect key and escape."
  ]
 },
 {
  "id": "pico1/world/07-02",
  "title": "7-2",
  "mechanic": "신호에 맞춰 움직이고 멈추기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Move during blue; stop before red. Time trampoline travel, then rearrange blocks for the remaining players."
  ]
 },
 {
  "id": "pico1/world/07-03",
  "title": "7-3",
  "mechanic": "시선으로 열쇠를 든 유령의 움직임 조절",
  "evidence": "partial",
  "sourceActions": [
   "Control pursuit with player facing; recover the ghost-held key and leave a watcher until teammates exit."
  ]
 },
 {
  "id": "pico1/world/07-04",
  "title": "7-4",
  "mechanic": "움직일 때 줄어드는 공동 체력",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Take turns moving and using trampolines so the shared gauge never empties."
  ]
 },
 {
  "id": "pico1/world/08-01",
  "title": "8-1",
  "mechanic": "떨어지는 블록으로 함께 줄 맞추기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Control and rotate colored pieces to complete the required lines."
  ]
 },
 {
  "id": "pico1/world/08-02",
  "title": "8-2",
  "mechanic": "공으로 벽돌 없애기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Keep at least one ball alive, clear overhead bricks, collect the revealed key and exit."
  ]
 },
 {
  "id": "pico1/world/08-03",
  "title": "8-3",
  "mechanic": "점점 빨라지는 블록 맞추기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Clear lines cooperatively; prepare for the faster final five lines."
  ]
 },
 {
  "id": "pico1/world/08-04",
  "title": "8-4",
  "mechanic": "장애물과 가속 벽돌이 추가된 벽돌 깨기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Keep balls alive; breaking the marked brick accelerates them. Clear remaining bricks, collect key and exit."
  ]
 },
 {
  "id": "pico1/world/09-01",
  "title": "9-1",
  "mechanic": "점점 빨라지는 공 피하기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Avoid successive balls as they break the key enclosure; being hit resets progress."
  ]
 },
 {
  "id": "pico1/world/09-02",
  "title": "9-2",
  "mechanic": "무게로 기울어지는 발판 조절",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Alternate player weight to roll the ball back and forth, then deliver it to the button with sufficient speed."
  ]
 },
 {
  "id": "pico1/world/09-03",
  "title": "9-3",
  "mechanic": "튕기는 공으로 블록을 깨 길 만들기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Keep a ball airborne while destroying blocks toward the key and door."
  ]
 },
 {
  "id": "pico1/world/09-04",
  "title": "9-4",
  "mechanic": "동료가 공의 튀는 방향 조절",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Jump into the ball to send it onto the glass; another player recovers a missed trajectory."
  ]
 },
 {
  "id": "pico1/world/10-01",
  "title": "10-1",
  "mechanic": "둘씩 교대하며 버튼·낙하 블록·크기 변경 구간 통과",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Alternate bridge switches, time staircase buttons, split collapsing footholds; open stairs and wall for the enlarged partner."
  ]
 },
 {
  "id": "pico1/world/10-02",
  "title": "10-2",
  "mechanic": "동료의 도움으로 공중 점프 · 발판 타이밍 맞추기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Use the jumping teammate as a step, operate rescue switches, then jump on upward-arrow cues to reach the key."
  ]
 },
 {
  "id": "pico1/world/10-03",
  "title": "10-3",
  "mechanic": "어두워진 길 통과",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Travel right, board the lift together, jump to the upper path, fetch the key leftward, then trampoline to the door."
  ]
 },
 {
  "id": "pico1/world/10-04",
  "title": "10-4",
  "mechanic": "어둠 속 보이지 않는 블록 건너기",
  "evidence": "partial",
  "sourceActions": [
   "Push the starting block left and use the trampoline to ascend."
  ]
 },
 {
  "id": "pico1/world/11-01",
  "title": "11-1",
  "mechanic": "도구에 동료를 담아 발사",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Shoot a teammate through the opening; the receiver absorbs and releases the stranded partner. Repeat across gaps."
  ]
 },
 {
  "id": "pico1/world/11-02",
  "title": "11-2",
  "mechanic": "동료를 끌어당겨 구덩이 건너기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Jump toward a partner using suction; relay the last players through the narrow intermediate landing."
  ]
 },
 {
  "id": "pico1/world/11-03",
  "title": "11-3",
  "mechanic": "사라지는 발판 위에서 동료를 담고 발사하고 받기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Carry the partner over collapsing footholds, launch toward the key, then catch the falling partner with timed suction."
  ]
 },
 {
  "id": "pico1/world/11-04",
  "title": "11-4",
  "mechanic": "상자를 끌어당겨 시간제 버튼과 이동 발판에 옮기기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Stage cube above, activate the ten-second switch, pull partner up, then drop cube onto the button during platform travel."
  ]
 },
 {
  "id": "pico1/world/12-01",
  "title": "12-1",
  "mechanic": "방패 · 움직이는 블록 · 동료 쌓기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Shield carrier moves the block while protecting the partner; use the block and body stack to reach key and exit."
  ]
 },
 {
  "id": "pico1/world/12-02",
  "title": "12-2",
  "mechanic": "바람 · 점프대 · 인원수 승강기",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Reach the numbered lift together, counter the wind during ascent, collect the high key, descend and exit left."
  ]
 },
 {
  "id": "pico1/world/12-03",
  "title": "12-3",
  "mechanic": "날아서 장애물 구간 통과",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Guide each flying character through obstacles, collect the key and reach the exit."
  ]
 },
 {
  "id": "pico1/world/12-04",
  "title": "12-4",
  "mechanic": "앞서 배운 장치를 함께 사용하는 마지막 이동 구간",
  "evidence": "text-confirmed",
  "sourceActions": [
   "Stack across gaps, open the bridge for the partner, use trampolines, avoid slimes and jump past the final button."
  ]
 },
 {
  "id": "pico2/battle/01",
  "title": "높이 대결",
  "mechanic": "종료 때 최고 높이",
  "evidence": "community_list",
  "sourceActions": [
   "종료 때 최고 높이"
  ]
 },
 {
  "id": "pico2/battle/02",
  "title": "시야 제한 높이 대결",
  "mechanic": "가려진 화면에서 높이 경쟁",
  "evidence": "community_list",
  "sourceActions": [
   "가려진 화면에서 높이 경쟁"
  ]
 },
 {
  "id": "pico2/battle/03",
  "title": "밀쳐내기",
  "mechanic": "주먹으로 밀어 마지막 생존",
  "evidence": "community_list",
  "sourceActions": [
   "주먹으로 밀어 마지막 생존"
  ]
 },
 {
  "id": "pico2/battle/04",
  "title": "반응 속도",
  "mechanic": "신호 직후 버튼",
  "evidence": "community_list",
  "sourceActions": [
   "신호 직후 버튼"
  ]
 },
 {
  "id": "pico2/battle/05",
  "title": "비행 생존",
  "mechanic": "비행 장애물 생존",
  "evidence": "community_list",
  "sourceActions": [
   "비행 장애물 생존"
  ]
 },
 {
  "id": "pico2/battle/06",
  "title": "공중 점프",
  "mechanic": "공중 점프 생존",
  "evidence": "community_list",
  "sourceActions": [
   "공중 점프 생존"
  ]
 },
 {
  "id": "pico2/battle/07",
  "title": "열쇠 쟁탈",
  "mechanic": "종료 때 열쇠 소유",
  "evidence": "community_list",
  "sourceActions": [
   "종료 때 열쇠 소유"
  ]
 },
 {
  "id": "pico2/battle/08",
  "title": "공 주고받기",
  "mechanic": "공을 반사해 실점 최소화",
  "evidence": "community_list",
  "sourceActions": [
   "공을 반사해 실점 최소화"
  ]
 },
 {
  "id": "pico2/dark/01-01",
  "title": "1-1",
  "mechanic": "오른쪽 유지·버튼",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "오른쪽 유지·버튼"
  ]
 },
 {
  "id": "pico2/dark/01-02",
  "title": "1-2",
  "mechanic": "쌓아 버튼 통과",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "쌓아 버튼 통과"
  ]
 },
 {
  "id": "pico2/dark/01-03",
  "title": "1-3",
  "mechanic": "상승 발판 점프",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "상승 발판 점프"
  ]
 },
 {
  "id": "pico2/dark/01-04",
  "title": "1-4",
  "mechanic": "쌓아 블록 밀기",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "쌓아 블록 밀기"
  ]
 },
 {
  "id": "pico2/dark/02-01",
  "title": "2-1",
  "mechanic": "점선 경로 이동",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "점선 경로 이동"
  ]
 },
 {
  "id": "pico2/dark/02-02",
  "title": "2-2",
  "mechanic": "공으로 상단 블록 제거",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "공으로 상단 블록 제거"
  ]
 },
 {
  "id": "pico2/dark/02-03",
  "title": "2-3",
  "mechanic": "녹색 공 회피",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "녹색 공 회피"
  ]
 },
 {
  "id": "pico2/dark/02-04",
  "title": "2-4",
  "mechanic": "쌓기·버튼 담당 유지",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "쌓기·버튼 담당 유지"
  ]
 },
 {
  "id": "pico2/dark/03-01",
  "title": "3-1",
  "mechanic": "이동·상승 발판",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "이동·상승 발판"
  ]
 },
 {
  "id": "pico2/dark/03-02",
  "title": "3-2",
  "mechanic": "크기 전환·쌓기",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "크기 전환·쌓기"
  ]
 },
 {
  "id": "pico2/dark/03-03",
  "title": "3-3",
  "mechanic": "분홍 장애물 회피",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "분홍 장애물 회피"
  ]
 },
 {
  "id": "pico2/dark/03-04",
  "title": "3-4",
  "mechanic": "플랫폼·다리 점프",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "플랫폼·다리 점프"
  ]
 },
 {
  "id": "pico2/dark/04-01",
  "title": "4-1",
  "mechanic": "분홍 장애물 회피",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "분홍 장애물 회피"
  ]
 },
 {
  "id": "pico2/dark/04-02",
  "title": "4-2",
  "mechanic": "굴러오는 기어·벌레 회피",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "굴러오는 기어·벌레 회피"
  ]
 },
 {
  "id": "pico2/dark/04-03",
  "title": "4-3",
  "mechanic": "바람·장애물 점프",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "바람·장애물 점프"
  ]
 },
 {
  "id": "pico2/dark/04-04",
  "title": "4-4",
  "mechanic": "벌레 회피·플랫폼",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "벌레 회피·플랫폼"
  ]
 },
 {
  "id": "pico2/endless/01",
  "title": "끝없는 달리기",
  "mechanic": "버튼 회피 이동",
  "evidence": "community_list",
  "sourceActions": [
   "버튼 회피 이동"
  ]
 },
 {
  "id": "pico2/endless/02",
  "title": "반응 속도 도전",
  "mechanic": "점점 짧아지는 반응 시간",
  "evidence": "community_list",
  "sourceActions": [
   "점점 짧아지는 반응 시간"
  ]
 },
 {
  "id": "pico2/endless/03",
  "title": "그래프 맞추기",
  "mechanic": "제시 그래프 재현",
  "evidence": "community_list",
  "sourceActions": [
   "제시 그래프 재현"
  ]
 },
 {
  "id": "pico2/endless/04",
  "title": "탄막 피하기",
  "mechanic": "탄막 회피",
  "evidence": "community_list",
  "sourceActions": [
   "탄막 회피"
  ]
 },
 {
  "id": "pico2/endless/05",
  "title": "밧줄 회피",
  "mechanic": "밧줄 장애물 회피",
  "evidence": "community_list",
  "sourceActions": [
   "밧줄 장애물 회피"
  ]
 },
 {
  "id": "pico2/endless/06",
  "title": "위험 버튼 피하기",
  "mechanic": "위험 버튼 피하기",
  "evidence": "community_list",
  "sourceActions": [
   "위험 버튼 피하기"
  ]
 },
 {
  "id": "pico2/endless/07",
  "title": "끝없는 공 주고받기",
  "mechanic": "공 랠리",
  "evidence": "community_list",
  "sourceActions": [
   "공 랠리"
  ]
 },
 {
  "id": "pico2/world/01-01",
  "title": "1-1",
  "mechanic": "쌓기·스프링",
  "evidence": "text_evidence",
  "sourceActions": [
   "동료를 올려 버튼으로 후속 인원의 스프링 활성화"
  ]
 },
 {
  "id": "pico2/world/01-02",
  "title": "1-2",
  "mechanic": "상자 방패",
  "evidence": "text_evidence",
  "sourceActions": [
   "상층 상자를 동료 머리에 내려 가시 통로 통과"
  ]
 },
 {
  "id": "pico2/world/01-03",
  "title": "1-3",
  "mechanic": "복원 기둥",
  "evidence": "text_evidence",
  "sourceActions": [
   "기둥이 돌아오기 전에 빠르게 밀어 통과"
  ]
 },
 {
  "id": "pico2/world/01-04",
  "title": "1-4",
  "mechanic": "숨은 버튼",
  "evidence": "text_evidence",
  "sourceActions": [
   "숨은 버튼을 찾아 작동시키고 열쇠 획득"
  ]
 },
 {
  "id": "pico2/world/02-01",
  "title": "2-1",
  "mechanic": "밧줄",
  "evidence": "text_evidence",
  "sourceActions": [
   "연결 거리를 이용해 동료와 이동"
  ]
 },
 {
  "id": "pico2/world/02-02",
  "title": "2-2",
  "mechanic": "접촉 금지·빙판",
  "evidence": "text_evidence",
  "sourceActions": [
   "서로 닿지 않도록 일찍 제동"
  ]
 },
 {
  "id": "pico2/world/02-03",
  "title": "2-3",
  "mechanic": "수직 정렬",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "위아래 동료를 수직 정렬해 버튼을 피해 열쇠 접근"
  ]
 },
 {
  "id": "pico2/world/02-04",
  "title": "2-4",
  "mechanic": "바람·접촉 금지",
  "evidence": "text_evidence",
  "sourceActions": [
   "왼쪽 보정으로 밀림을 상쇄하며 간격 유지"
  ]
 },
 {
  "id": "pico2/world/03-01",
  "title": "3-1",
  "mechanic": "안전 틈",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "작은 빛의 중앙에서 큰 빛 사이 안전지대 확보"
  ]
 },
 {
  "id": "pico2/world/03-02",
  "title": "3-2",
  "mechanic": "이동 플랫폼 안전지대",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "기구에 닿지 않게 위치를 계속 조정"
  ]
 },
 {
  "id": "pico2/world/03-03",
  "title": "3-3",
  "mechanic": "자석",
  "evidence": "text_evidence",
  "sourceActions": [
   "동료를 흡착해 중력 제약 없이 장애물 우회"
  ]
 },
 {
  "id": "pico2/world/03-04",
  "title": "3-4",
  "mechanic": "기억 배치",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "처음 제시된 배치대로 위치 재현"
  ]
 },
 {
  "id": "pico2/world/04-01",
  "title": "4-1",
  "mechanic": "문 받치기",
  "evidence": "text_evidence",
  "sourceActions": [
   "한 명이 문을 머리로 받치는 동안 동료가 열쇠 회수"
  ]
 },
 {
  "id": "pico2/world/04-02",
  "title": "4-2",
  "mechanic": "상자·톱",
  "evidence": "text_evidence",
  "sourceActions": [
   "상층 상자로 톱을 반사시켜 열쇠 회수 보호"
  ]
 },
 {
  "id": "pico2/world/04-03",
  "title": "4-3",
  "mechanic": "교대 낙하 가시",
  "evidence": "text_evidence",
  "sourceActions": [
   "좌우 순서에 맞춰 이동"
  ]
 },
 {
  "id": "pico2/world/04-04",
  "title": "4-4",
  "mechanic": "레이저",
  "evidence": "text_evidence",
  "sourceActions": [
   "발사 간격에 맞춰 통과"
  ]
 },
 {
  "id": "pico2/world/05-01",
  "title": "5-1",
  "mechanic": "제한시간 동전",
  "evidence": "text_evidence",
  "sourceActions": [
   "시간 안에 모든 동전 수집"
  ]
 },
 {
  "id": "pico2/world/05-02",
  "title": "5-2",
  "mechanic": "시간 연장 버튼",
  "evidence": "text_evidence",
  "sourceActions": [
   "왼쪽으로 돌아가 열쇠와 시간 연장 확보"
  ]
 },
 {
  "id": "pico2/world/05-03",
  "title": "5-3",
  "mechanic": "자석·동전",
  "evidence": "text_evidence",
  "sourceActions": [
   "자석으로 수집 경로 단축"
  ]
 },
 {
  "id": "pico2/world/05-04",
  "title": "5-4",
  "mechanic": "동료 발사",
  "evidence": "text_evidence",
  "sourceActions": [
   "동료를 총에 담아 예상 착지점으로 발사"
  ]
 },
 {
  "id": "pico2/world/06-01",
  "title": "6-1",
  "mechanic": "색 비행기",
  "evidence": "text_evidence",
  "sourceActions": [
   "자기 색 벽돌 사격"
  ]
 },
 {
  "id": "pico2/world/06-02",
  "title": "6-2",
  "mechanic": "비행기 위 승객",
  "evidence": "text_evidence",
  "sourceActions": [
   "위에 탄 동료가 탄환과 레이저를 피하도록 이동"
  ]
 },
 {
  "id": "pico2/world/06-03",
  "title": "6-3",
  "mechanic": "아군 사격 위험",
  "evidence": "text_evidence",
  "sourceActions": [
   "동료를 맞히지 않으며 비행"
  ]
 },
 {
  "id": "pico2/world/06-04",
  "title": "6-4",
  "mechanic": "총잡이·방패",
  "evidence": "text_evidence",
  "sourceActions": [
   "미사일 때 방패 담당이 앞을 방어"
  ]
 },
 {
  "id": "pico2/world/07-01",
  "title": "7-1",
  "mechanic": "한 명씩 조작",
  "evidence": "text_evidence",
  "sourceActions": [
   "안전한 자리에서 이동 순서 교대"
  ]
 },
 {
  "id": "pico2/world/07-02",
  "title": "7-2",
  "mechanic": "동시 이동 추적",
  "evidence": "text_evidence",
  "sourceActions": [
   "둘 이상 움직여 유령을 부르지 않기"
  ]
 },
 {
  "id": "pico2/world/07-03",
  "title": "7-3",
  "mechanic": "암전 이동",
  "evidence": "text_evidence",
  "sourceActions": [
   "어두울 때만 기억한 경로 이동"
  ]
 },
 {
  "id": "pico2/world/07-04",
  "title": "7-4",
  "mechanic": "응시 유령",
  "evidence": "text_evidence",
  "sourceActions": [
   "동료가 바라봐 멈추게 하고 유령을 이용해 열쇠 접근"
  ]
 },
 {
  "id": "pico2/world/08-01",
  "title": "8-1",
  "mechanic": "사격·받기",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "쏘는 역할과 받는 역할 협력"
  ]
 },
 {
  "id": "pico2/world/08-02",
  "title": "8-2",
  "mechanic": "농구",
  "evidence": "text_evidence",
  "sourceActions": [
   "공을 주워 골대에 투입"
  ]
 },
 {
  "id": "pico2/world/08-03",
  "title": "8-3",
  "mechanic": "폭탄 섞인 사격·받기",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "폭탄을 건드리지 않으며 전달"
  ]
 },
 {
  "id": "pico2/world/08-04",
  "title": "8-4",
  "mechanic": "폭탄 섞인 농구",
  "evidence": "text_evidence",
  "sourceActions": [
   "폭탄을 피하며 득점"
  ]
 },
 {
  "id": "pico2/world/09-01",
  "title": "9-1",
  "mechanic": "시야·우리",
  "evidence": "text_evidence",
  "sourceActions": [
   "절벽을 피하고 박쥐를 우리에 가두기"
  ]
 },
 {
  "id": "pico2/world/09-02",
  "title": "9-2",
  "mechanic": "밧줄 포획",
  "evidence": "text_evidence",
  "sourceActions": [
   "동료 사이 밧줄에 나비 여섯 마리 포획"
  ]
 },
 {
  "id": "pico2/world/09-03",
  "title": "9-3",
  "mechanic": "상자 잠입",
  "evidence": "text_evidence",
  "sourceActions": [
   "상자로 몸을 가려 발각 방지"
  ]
 },
 {
  "id": "pico2/world/09-04",
  "title": "9-4",
  "mechanic": "밧줄·절벽",
  "evidence": "text_evidence",
  "sourceActions": [
   "연결 간격과 수평 정렬 유지"
  ]
 },
 {
  "id": "pico2/world/10-01",
  "title": "10-1",
  "mechanic": "반응 버튼",
  "evidence": "text_evidence",
  "sourceActions": [
   "시작 신호 직후 버튼 밟기"
  ]
 },
 {
  "id": "pico2/world/10-02",
  "title": "10-2",
  "mechanic": "반대 방향 발사",
  "evidence": "text_evidence",
  "sourceActions": [
   "상자와 사람을 반대 방향으로 보내 아래 플랫폼 착지"
  ]
 },
 {
  "id": "pico2/world/10-03",
  "title": "10-3",
  "mechanic": "늘어나는 귀·공 운반",
  "evidence": "text_evidence",
  "sourceActions": [
   "귀로 공을 계속 튕겨 왼쪽 용기에 전달"
  ]
 },
 {
  "id": "pico2/world/10-04",
  "title": "10-4",
  "mechanic": "중력 전환",
  "evidence": "text_evidence",
  "sourceActions": [
   "점프 입력으로 중력 방향 변경"
  ]
 },
 {
  "id": "pico2/world/11-01",
  "title": "11-1",
  "mechanic": "탄환 생존",
  "evidence": "text_evidence",
  "sourceActions": [
   "지정 시간 피격 없이 생존"
  ]
 },
 {
  "id": "pico2/world/11-02",
  "title": "11-2",
  "mechanic": "밧줄 등반",
  "evidence": "text_evidence",
  "sourceActions": [
   "위아래로 움직여 가시 회피"
  ]
 },
 {
  "id": "pico2/world/11-03",
  "title": "11-3",
  "mechanic": "회전 대형 공",
  "evidence": "text_evidence",
  "sourceActions": [
   "시계 방향으로 이동하며 회피"
  ]
 },
 {
  "id": "pico2/world/11-04",
  "title": "11-4",
  "mechanic": "좁아지는 낙하 틈",
  "evidence": "text_evidence",
  "sourceActions": [
   "마지막 파도에서 쌓여 점유 폭 축소"
  ]
 },
 {
  "id": "pico2/world/12-01",
  "title": "12-1",
  "mechanic": "공동 다단 점프",
  "evidence": "text_evidence",
  "sourceActions": [
   "각 인원이 한 번씩 점프를 이어 장애물 통과"
  ]
 },
 {
  "id": "pico2/world/12-02",
  "title": "12-2",
  "mechanic": "자동 스크롤",
  "evidence": "text_evidence",
  "sourceActions": [
   "빠르게 이동하고 상자로 플랫폼 상승을 막아 시간 확보"
  ]
 },
 {
  "id": "pico2/world/12-03",
  "title": "12-3",
  "mechanic": "열쇠 후 가속",
  "evidence": "text_evidence",
  "sourceActions": [
   "변한 속도와 슈퍼 점프에 맞춰 착지"
  ]
 },
 {
  "id": "pico2/world/12-04",
  "title": "12-4",
  "mechanic": "긴 점프 연속",
  "evidence": "text_evidence",
  "sourceActions": [
   "최대 도약 거리를 유지해 가시 통과"
  ]
 },
 {
  "id": "pico2/world/13-01",
  "title": "13-1",
  "mechanic": "위험 버튼",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "실패 버튼을 피하여 선택"
  ]
 },
 {
  "id": "pico2/world/13-02",
  "title": "13-2",
  "mechanic": "색 그래프",
  "evidence": "text_evidence",
  "sourceActions": [
   "방향키를 누를 인원수를 조절해 제시 그래프 재현"
  ]
 },
 {
  "id": "pico2/world/13-03",
  "title": "13-3",
  "mechanic": "공 랠리",
  "evidence": "text_evidence",
  "sourceActions": [
   "공을 연속 열두 번 반사"
  ]
 },
 {
  "id": "pico2/world/13-04",
  "title": "13-4",
  "mechanic": "내 캐릭터 찾기",
  "evidence": "text_evidence",
  "sourceActions": [
   "입력 반응으로 진짜 자기 캐릭터 구분"
  ]
 },
 {
  "id": "pico2/world/14-01",
  "title": "14-1",
  "mechanic": "동료 상자화·가시",
  "evidence": "text_evidence",
  "sourceActions": [
   "버튼 후 서로 상자로 바꿔 가시와 바닥 붕괴 차단"
  ]
 },
 {
  "id": "pico2/world/14-02",
  "title": "14-2",
  "mechanic": "두더지",
  "evidence": "text_evidence",
  "sourceActions": [
   "협력해 빠르게 타격"
  ]
 },
 {
  "id": "pico2/world/14-03",
  "title": "14-3",
  "mechanic": "상자화·공중 발판",
  "evidence": "text_evidence",
  "sourceActions": [
   "낙하물 방어 후 공중 동료를 상자로 바꿔 발판 확보"
  ]
 },
 {
  "id": "pico2/world/14-04",
  "title": "14-4",
  "mechanic": "구름 상대",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "간격을 조절해 여섯 번 타격"
  ]
 },
 {
  "id": "pico2/world/15-01",
  "title": "15-1",
  "mechanic": "경로 따라 움직이는 바퀴",
  "evidence": "text_evidence",
  "sourceActions": [
   "쌓여 이동 발판을 넘고 열쇠 후 차례로 복귀"
  ]
 },
 {
  "id": "pico2/world/15-02",
  "title": "15-2",
  "mechanic": "암전 블록 쌓기",
  "evidence": "partial_text_evidence",
  "sourceActions": [
   "아래부터 조금씩 옮겨 벽 장치를 피해 기울여 쌓기"
  ]
 },
 {
  "id": "pico2/world/15-03",
  "title": "15-3",
  "mechanic": "적 비행기·방패",
  "evidence": "text_evidence",
  "sourceActions": [
   "추적탄 비행기를 먼저 공격하고 미사일 방어"
  ]
 },
 {
  "id": "pico2/world/15-04",
  "title": "15-4",
  "mechanic": "빙판·출현 플랫폼",
  "evidence": "text_evidence",
  "sourceActions": [
   "왼쪽 벽에서 기다렸다 오른쪽 발판 출현 후 점프"
  ]
 }
];
const defs=new Map();
function add(ids,family,implemented,omitted=[],config={}){for(const id of ids.split(' '))defs.set(id,{family,implementedRules:implemented.split('|'),omittedRules:omitted,config});}
// Each reference has explicit coverage. Coordinates are demo design, not recovered original maps.
add('pico1/world/01-01','observed','몸 쌓기|다리 버튼|전원 승강기', ['원작 물리 수치 보정']);
add('pico1/world/01-03','relay','위아래 경로|버튼으로 동료 통과',['상자를 버튼 위에 놓는 과정']);
add('pico1/world/01-04','moving','움직이는 발판|전원 승강기',['무게로 내려가는 중앙 발판·기둥 회피']);
add('pico1/world/03-01 pico1/world/03-03 pico2/world/05-01','coins','제한 시간|모든 동전 회수|전원 출구');
add('pico1/world/03-04 pico2/world/05-02','timer','시간 연장 버튼|계단 오르기|열쇠 회수');
add('pico1/world/04-02','flight','비행|위아래 굴곡 통과',['함께 상자를 미는 구간']);
add('pico1/world/06-03','vertical','수직 이동 발판|오르내리며 열쇠 회수',['공략에 없는 나머지 구간']);
add('pico1/world/06-04 pico2/world/13-01 pico2/endless/06','avoidbuttons','위험 버튼 회피|높은 열쇠',['무한 반복 진행']);
add('pico1/world/07-01','traffic','정지 신호에 멈추기',['뒤쫓는 유령 형상·추격 속도']);
add('pico1/world/07-02','traffic','정지 신호|점프대',['상자 재배치']);
add('pico1/world/07-04','stamina','공동 이동 체력|번갈아 이동|점프대');
add('pico1/world/10-02','stack','동료 발판|상단 열쇠',['동시 점프 화살표·구조 버튼']);
add('pico1/world/10-03','blackout','어두운 경로|승강기|점프대');
add('pico1/world/12-02','windlift','바람|점프대|전원 승강기',['왼쪽으로 복귀하는 출구 동선']);
add('pico1/world/12-03','flight','비행|장애물 통과|열쇠 회수');
add('pico1/world/12-04','finale','다리 버튼|점프대|이동 장애물|위험 버튼',['자동 스크롤']);
add('pico2/world/01-01','springrelay','몸 쌓기|버튼으로 점프대 작동');
add('pico2/world/01-04','hiddenbutton','숨은 버튼|문 열기|열쇠 회수');
add('pico2/world/02-03','alignment','수직 쌓기|위험 버튼 회피',['정렬 강제 실패 조건']);
add('pico2/world/03-01','safegap','움직이는 위험 구역|안전 틈',['원작 빛 장치의 정확한 주기']);
add('pico2/world/03-02','movinghazard','이동 발판|위험 구역 회피');
add('pico2/world/04-01','relay','동료가 문을 유지|열쇠 회수',['머리로 문을 받치는 물리']);
add('pico2/world/04-03','fallinghazard','번갈아 내려오는 위험물');
add('pico2/world/04-04','laser','주기적 위험 구역|타이밍 통과',['레이저 발사·소멸은 이동 위험물로 시각화']);
add('pico2/world/07-02','oneatatime','동시 이동 제한',['유령 추격 시각화']);
add('pico2/world/07-03','blackout','암전 경로',['밝을 때 이동 금지 조건']);
add('pico2/world/11-04','narrow','좁은 안전 통로|몸 쌓기',['연속 파도에 따른 틈 축소']);
add('pico2/world/12-03','speedkey','열쇠 후 속도 상승|강한 점프');
add('pico2/world/12-04','longjump','긴 도약|가시 구간');
add('pico2/world/15-01','moving','이동 발판|쌓기',['원형 경로 바퀴·열쇠 후 복귀']);
add('pico2/dark/01-01','relay','오른쪽 이동|버튼');
add('pico2/dark/01-02 pico2/dark/02-04','stackrelay','쌓기|버튼 담당 유지');
add('pico2/dark/01-03 pico2/dark/03-01','vertical','상승 발판|점프');
add('pico2/dark/02-01','moving','분리 발판 경로',['점선 경로의 정확한 배치']);
add('pico2/dark/02-03','dodge','움직이는 공 회피');
add('pico2/dark/03-03 pico2/dark/04-01','safegap','움직이는 분홍 위험물 회피');
add('pico2/dark/03-04','bridge','발판|다리 버튼|점프');
add('pico2/dark/04-02 pico2/dark/04-04','dodge','움직이는 적 회피|발판',['적의 원작 추적 행동']);
add('pico2/dark/04-03','wind','바람|장애물 점프');
add('pico1/world/01-02','crates','상자 밀기|상자를 발판으로 사용',['떨어지는 기둥']);
add('pico1/world/06-01','cratestairs','상자 밀기|상자 계단',['자기 색상 상자만 미는 제한']);
add('pico1/world/06-02','cratestairs','상자 계단 밀기',['자동 스크롤']);
add('pico1/world/10-04 pico2/world/15-02','darkcrates','암전|상자 이동|계단 만들기',['원작 숨은 장치 배치']);
add('pico2/world/01-03','crates','기둥 밀어 통과',['기둥 자동 복원']);
add('pico2/dark/01-04','cratestairs','쌓기|상자 밀기');
add('pico1/world/02-01 pico1/world/02-02','rope','동료 연결|좁은 틈 건너기',['아래 매달려 열쇠를 얻는 원작 경로']);
add('pico1/world/02-03','ropestack','동료 연결|쌓기|승강기');
add('pico1/world/02-04','ropestack','동료 연결|머리 위 장애물',['붕괴 다리']);
add('pico2/world/02-01 pico2/world/09-04','rope','동료 연결|간격 유지|절벽 통과');
add('pico2/world/11-02','ropespring','동료 연결|상승|가시 회피');
add('pico2/world/02-02','icecontact','빙판 관성|동료 접촉 금지');
add('pico2/world/02-04','windcontact','바람|동료 접촉 금지');
add('pico2/world/15-04','icemoving','빙판|이동 발판',['발판 출현 조건']);
const miniGroups={precision:'pico1/world/04-03 pico1/battle/04',blocks:'pico1/world/08-01 pico1/world/08-03 pico1/endless/02',bricks:'pico1/world/08-02 pico1/world/08-04 pico1/world/09-03',reaction:'pico2/world/10-01 pico2/battle/04 pico2/endless/02',graph:'pico2/world/13-02 pico2/endless/03',memory:'pico2/world/03-04',rally:'pico2/world/13-03 pico2/battle/08 pico2/endless/07',basketball:'pico2/world/08-02 pico2/world/08-04',whack:'pico2/world/14-02 pico2/world/14-04',dodge:'pico1/battle/03 pico1/endless/01 pico2/world/11-01 pico2/endless/04',height:'pico1/battle/01 pico2/battle/01 pico2/battle/02 pico2/battle/06'};
for(const [family,ids]of Object.entries(miniGroups))for(const id of ids.split(' '))defs.set(id,{family,route:'mini',implementedRules:[],omittedRules:['원작 수치·배치 미보정'],config:{}});
const box=(id,x,y,w,h)=>({id,x,y,w,h});
function list(){return catalogue.map(row=>{const d=defs.get(row.id);return {...row,family:d?.family||'pending',route:d?.route||'platform',playable:!!d,approximation:true,implementedRules:d?.implementedRules||[],omittedRules:d?.omittedRules||['단계 고유 규칙 구현 대기'],verification:'not_reviewed'};});}
function createStage(id,count=2){
 if(!Number.isInteger(count)||count<2||count>8)throw new Error('2~8명만 지원합니다.');
 const d=defs.get(id),meta=list().find(x=>x.id===id);if(!d||d.route==='mini')throw new Error('플랫폼 데모가 없는 단계입니다: '+id);
 if(d.family==='observed'){const S=typeof module!=='undefined'&&module.exports?require('./stage1-1.js'):root.ParkStageOne;return S.createStage(count);}
 const ordinal=Number(id.slice(-2)),game=id.startsWith('pico2')?2:1;
 const m={id,name:meta.mechanic,width:2000,height:720,spawns:Array.from({length:count},(_,i)=>({x:45+i*40,y:562})),platforms:[box('ground',0,600,2000,120)],switches:[],devices:[],timers:[],hazards:[],coins:[],springs:[],movingPlatforms:[],rules:{},key:box('key',1760,550,24,24),exit:box('exit',1880,522,58,78),killY:780,reconstruction:{status:'mechanic_demo',geometry:'original_layout_unverified',populationScaling:'unverified',implementedRules:meta.implementedRules,omittedRules:meta.omittedRules}};
 const ledge=(name,x,y,w=150)=>m.platforms.push(box(name,x,y,w,18));
 const hazard=(name,x,y,w=36,h=36,axis,distance=0,speed=90)=>m.hazards.push({...box(name,x,y,w,h),shape:/^(spike|side-spikes|keep-gap)/.test(name)?'spike':'rect',...(axis?{axis,distance,speed}: {})});
 const spring=(name,x,y=600,power=730,signal)=>m.springs.push({...box(name,x,y,60,8),power,...(signal?{signal}:{})});
 const button=(name,x,y,signal)=>m.switches.push({...box(name,x,y,64,6),signal});
 const gate=(name,x,y,signal,mode='while')=>m.devices.push({...box(name,x,y,24,140),kind:'gate',signal,mode,active:false});
 const lift=(x,y=600,toY=340)=>m.devices.push({...box('team-lift',x,y,Math.max(150,count*34),12),kind:'lift',fromY:y,toY,speed:75,requiredPlayers:count,active:true});
 const exitAt=(x,y)=>{m.exit=box('exit',x,y-78,58,78);m.key=box('key',x-120,y-55,24,24);};
 const gaps=()=>{m.platforms=[box('start',0,600,600,120),box('landing',880,600,1120,120)];};
 switch(d.family){
 case 'coins': m.timeLimit=55+count*4;for(let j=0;j<4;j++){const x=550+j*310,y=ordinal===3?510-(j%3)*65:530-(j%2)*70;ledge('coin-ledge'+j,x,y,150);for(let k=0;k<2;k++)m.coins.push(box('coin'+j+'-'+k,x+30+k*70,y-32,20,20));}m.requiredCoins=8;break;
 case 'timer':m.timeLimit=12+count*2;for(let j=0;j<5;j++){const x=440+j*255,y=600-j*40;ledge('stairs'+j,x,y,200);button('time'+j,x+45,y,'time'+j);m.switches.at(-1).timeBonus=8;}exitAt(1850,400);ledge('exit-floor',1700,400,300);break;
 case 'relay':case 'stackrelay':case 'hiddenbutton': {const y=d.family==='stackrelay'?448:500;ledge('scout-perch',530,y,210);button('open',590,y,'open');gate('route-gate',900,460,'open','latch');if(d.family==='hiddenbutton')m.switches[0].hidden=true;ledge('return-step',800,545,85);m.key=box('key',1450,550,24,24);break;}
 case 'springrelay':ledge('scout',500,465,180);button('spring-switch',555,465,'boost');spring('relay-spring',860,600,820,'boost');spring('holder-return',620,465,730);ledge('upper-exit',760,340,1240);exitAt(1850,340);break;
 case 'bridge':case 'finale':gaps();m.platforms[1].x=800;m.platforms[1].w=1200;ledge('scout-step',450,530,145);button('bridge-switch',1030,600,'bridge');m.devices.push({...box('bridge',600,600,200,14),kind:'bridge',signal:'bridge',mode:'latch',active:false});if(d.family==='finale'){spring('bounce',1180);hazard('slime',1450,566,36,34,'x',180,85);hazard('bad-button',1710,592,50,8);}break;
 case 'moving':case 'movinghazard':gaps();m.platforms[1].x=1350;m.platforms[1].w=650;m.movingPlatforms.push({...box('ferry',610,580,Math.max(150,count*34),18),axis:'x',distance:590,speed:95});if(d.family==='movinghazard')hazard('ceiling-danger',920,490,45,55,'y',65,80);else {ledge('upper-exit',1630,430,370);spring('rise',1490);exitAt(1870,430);}break;
 case 'vertical':m.width=1400;m.platforms=[box('start',0,600,1400,120)];m.movingPlatforms.push({...box('rise-one',550,595,Math.max(160,count*34),18),axis:'y',distance:-190,speed:75},{...box('rise-two',930,410,170,18),axis:'y',distance:-140,speed:55});ledge('middle',840,410,90);ledge('top',1120,270,280);exitAt(1280,270);break;
 case 'stack':case 'alignment':case 'narrow':ledge('body-climb',550,470,200);ledge('body-climb-two',800,405,160);m.key=box('key',845,370,24,24);if(d.family!=='stack'){hazard('left-button',500,592,40,8);hazard('right-button',755,592,40,8);}if(d.family==='narrow'){hazard('roof-left',1150,300,250,220);hazard('roof-right',1450,300,250,220);}break;
 case 'flight':m.rules.flight=true;m.key=box('key',1620,250,24,24);exitAt(1880,600);m.key=box('key',1620,250,24,24);for(let j=0;j<4;j++)hazard('wall'+j,600+j*290,j%2?390:0,50,j%2?210:390);break;
 case 'traffic':m.rules.trafficLight={go:3.8,stop:1.6};spring('traffic-spring',700);ledge('high',1020,420,260);m.key=box('key',1120,380,24,24);break;
 case 'stamina':m.rules.stamina={max:5+count,recovery:2};spring('first-spring',700);ledge('rest',1000,460,220);m.key=box('key',1070,420,24,24);break;
 case 'blackout':m.rules.blackout=true;if(game===1){lift(700);ledge('upper',700+Math.max(150,count*34),340,700);spring('exit-spring',1500);ledge('door-ledge',1730,400,270);exitAt(1850,400);m.key=box('key',1170,300,24,24);}else{for(let j=0;j<4;j++)ledge('remember'+j,540+j*290,530-(j%2)*60,140);}break;
 case 'windlift':m.rules.wind=-65;spring('lift-spring',570);lift(850);ledge('upper',850+Math.max(150,count*34),340,1150-Math.max(150,count*34));exitAt(1870,340);break;
 case 'wind':m.rules.wind=-85;for(let j=0;j<4;j++)hazard('spike'+j,570+j*300,575,65,25);break;
 case 'avoidbuttons':for(let j=0;j<5;j++)hazard('bad-button'+j,540+j*235,592,45+(ordinal%2)*15,8);ledge('key-step',1600,520,170);m.key=box('key',1670,480,24,24);break;
 case 'safegap':for(let j=0;j<4;j++)hazard('moving-light'+j,560+j*320,405,100,80,'y',160,60+j*8);break;
 case 'fallinghazard':case 'laser':for(let j=0;j<5;j++)hazard('fall'+j,530+j*270,j%2?270:550,d.family==='laser'?14:70,d.family==='laser'?180:42,'y',j%2?280:-280,100);break;
 case 'dodge':for(let j=0;j<4;j++)hazard('rolling'+j,700+j*300,562,38,38,'x',-180,90+ordinal*10);ledge('safe-perch',1040,515,100);break;
 case 'oneatatime':m.rules.oneAtTime=true;for(let j=0;j<3;j++)ledge('waiting'+j,550+j*380,540,180);break;
 case 'speedkey':m.rules.speedAfterKey=1.5;m.key=box('key',530,550,24,24);m.platforms=[box('start',0,600,850,120),box('middle',1040,570,260,150),box('end',1500,540,500,180)];exitAt(1880,540);m.key=box('key',530,550,24,24);break;
 case 'longjump':m.physics={jumpSpeed:680};m.platforms=[box('start',0,600,600,120),box('a',790,560,180,160),box('b',1180,525,180,195),box('end',1570,500,430,220)];exitAt(1860,500);break;
 case 'crates':case 'cratestairs':case 'darkcrates':m.crates=[box('crate-a',500,535,80,65),box('crate-b',720,535,75,65)];ledge('crate-wall',850,465,400);m.key=box('key',1110,425,24,24);if(d.family==='cratestairs'){m.crates.push(box('crate-c',1050,400,75,65));ledge('high-wall',1440,390,360);m.key=box('key',1510,350,24,24);}if(d.family==='darkcrates')m.rules.blackout=true;break;
 case 'rope':case 'ropestack':case 'ropespring':m.rules.ropeLength=180;m.platforms=[box('start',0,600,650,120),box('middle',780,600,380,120),box('end',1290,600,710,120)];if(d.family==='ropestack'){m.platforms=[box('start',0,600,2000,120)];lift(1000);ledge('upper',1000+Math.max(150,count*34),340,1000-Math.max(150,count*34));exitAt(1850,340);}else if(d.family==='ropespring'){spring('rope-bounce',470,600,780);ledge('safe-high',800,410,360);m.key=box('key',950,370,24,24);hazard('side-spikes',1260,575,50,25);}break;
 case 'icecontact':case 'windcontact':m.rules.noContact=true;m.spawns=m.spawns.map((p,i)=>({...p,x:40+i*60}));if(d.family==='icecontact')m.rules.ice=true;else m.rules.wind=65;for(let j=0;j<3;j++)hazard('keep-gap'+j,700+j*380,577,55,23);break;
 case 'icemoving':m.rules.ice=true;m.platforms=[box('start',0,600,650,120),box('end',1240,510,760,210)];m.movingPlatforms.push({...box('ice-ferry',640,560,Math.max(170,count*34),18),axis:'x',distance:420,speed:75});exitAt(1860,510);break;
 default:throw new Error('Unknown demo family '+d.family);
 }
 return m;
}
const api={list,createStage};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ParkDemoStages=api;
})(typeof window!=='undefined'?window:globalThis);
