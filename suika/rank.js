/* 수박게임 주간 순위표
 * - 저장 위치: Firebase RTDB  games/sk_rank/<주차키>/<pushId>
 *   (DB 규칙상 최상위는 games/ 만 열려 있어서 그 아래 sk_rank 로 둔다)
 * - 주차 경계: 매주 월요일 09:00 (한국시간) = 월요일 00:00 UTC
 *   → 새 주가 되면 자동으로 다른 키에 쌓이므로 순위표가 비워진 것처럼 초기화된다
 * - window.Rank.submit / top / weekLabel / nextReset
 */
(function () {
  var CFG = {
    apiKey: "AIzaSyD8_pSiOVOWmCitHl_nWcgSZobMFI5NgXM",
    authDomain: "rolling2-17a8f.firebaseapp.com",
    databaseURL: "https://rolling2-17a8f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "rolling2-17a8f",
    storageBucket: "rolling2-17a8f.firebasestorage.app",
    messagingSenderId: "936512265515",
    appId: "1:936512265515:web:c9cb05f341267af81a796e"
  };
  var ready = false;
  function db() {
    if (!window.firebase || !firebase.database) return null;
    if (!ready) { if (!firebase.apps.length) firebase.initializeApp(CFG); ready = true; }
    return firebase.database();
  }

  // 이번 주 키: 가장 최근 월요일 00:00 UTC (= 월 09:00 KST) 의 날짜
  function weekStart(t) {
    var d = new Date(t === undefined ? Date.now() : t);
    var back = (d.getUTCDay() + 6) % 7;                       // 월요일까지 며칠 전인지
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back);
  }
  function weekKey(t) {
    var d = new Date(weekStart(t));
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return '' + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate());
  }
  function nextReset() { return weekStart() + 7 * 24 * 3600e3; }   // 다음 월요일 09:00 KST 의 ms
  function weekLabel() {
    var s = new Date(weekStart() + 9 * 3600e3), e = new Date(nextReset() + 9 * 3600e3 - 1);
    var f = function (d) { return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); };
    return f(s) + ' ~ ' + f(e);
  }
  function untilResetText() {
    var ms = nextReset() - Date.now();
    var h = Math.floor(ms / 3600e3), d = Math.floor(h / 24);
    return d > 0 ? (d + '일 ' + (h % 24) + '시간 남음') : (h > 0 ? h + '시간 남음' : Math.max(1, Math.floor(ms / 60e3)) + '분 남음');
  }

  function ref() { var b = db(); return b ? b.ref('games/sk_rank/' + weekKey()) : null; }

  // rec: { nick, melons, score, secs, mode }
  function submit(rec) {
    var r = ref();
    if (!r) return Promise.reject(new Error('firebase 없음'));
    if (!(rec.melons > 0) && !(rec.score > 30)) return Promise.reject(new Error('기록이 너무 작아요'));   // 0점 기록으로 순위표가 지저분해지지 않게
    var row = {
      nick: String(rec.nick || '익명').slice(0, 10),
      melons: Math.max(0, rec.melons | 0),
      score: Math.max(0, rec.score | 0),
      secs: Math.max(0, rec.secs | 0),
      mode: rec.mode === 'online' ? 'online' : 'single',
      at: Date.now()
    };
    return r.push(row).then(function () { return row; });
  }

  // 상위 n명: 수박 개수 → 점수 순. 같은 닉네임은 최고 기록 1개만
  function top(n) {
    var r = ref();
    if (!r) return Promise.resolve([]);
    return r.orderByChild('melons').limitToLast(300).once('value').then(function (sn) {
      var all = [];
      sn.forEach(function (c) { var v = c.val(); if (v && v.nick) all.push(v); });
      var bestOf = {};
      all.forEach(function (v) {
        var k = v.nick;
        if (!bestOf[k] || v.melons > bestOf[k].melons || (v.melons === bestOf[k].melons && v.score > bestOf[k].score)) bestOf[k] = v;
      });
      return Object.keys(bestOf).map(function (k) { return bestOf[k]; })
        .sort(function (a, b) { return (b.melons - a.melons) || (b.score - a.score) || (a.at - b.at); })
        .slice(0, n || 10);
    });
  }

  function fmtTime(secs) {
    var s = secs | 0;
    return (Math.floor(s / 60) < 10 ? '0' : '') + Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }

  // 순위표 HTML (공통 스타일은 각 페이지에서)
  function renderInto(el, rows, myNick) {
    if (!rows.length) { el.innerHTML = '<div class="rk-empty">이번 주 기록이 아직 없어요 — 첫 주인공이 되어보세요!</div>'; return; }
    var medal = ['🥇', '🥈', '🥉'];
    el.innerHTML = rows.map(function (v, i) {
      var me = myNick && v.nick === myNick ? ' me' : '';
      return '<div class="rk-row' + me + '">'
        + '<span class="rk-no">' + (medal[i] || (i + 1)) + '</span>'
        + '<span class="rk-nick">' + v.nick.replace(/[<>&]/g, '') + (v.mode === 'online' ? ' <em>온라인</em>' : '') + '</span>'
        + '<span class="rk-mel">🍉 ' + v.melons + '</span>'
        + '<span class="rk-sc">' + v.score.toLocaleString() + '점</span>'
        + '<span class="rk-tm">' + fmtTime(v.secs) + '</span>'
        + '</div>';
    }).join('');
  }

  window.Rank = {
    submit: submit, top: top, weekKey: weekKey, weekLabel: weekLabel,
    nextReset: nextReset, untilResetText: untilResetText, renderInto: renderInto, fmtTime: fmtTime
  };
})();
