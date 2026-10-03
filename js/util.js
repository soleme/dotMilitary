// 공용 유틸: 난수, 날짜(UTC 기준 'YYYY-MM-DD' 문자열), 한국어 조사, 포맷터
window.DM = window.DM || {};

(function (DM) {
  const U = {};

  // ---------- 난수 ----------
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randi = (a, b) => Math.floor(U.rand(a, b + 1));
  U.chance = (p) => Math.random() < p;
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.wpick = (arr, wf = (x) => x.w) => {
    const total = arr.reduce((s, x) => s + Math.max(0, wf(x)), 0);
    if (total <= 0) return arr[0];
    let r = Math.random() * total;
    for (const x of arr) {
      r -= Math.max(0, wf(x));
      if (r <= 0) return x;
    }
    return arr[arr.length - 1];
  };
  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // 문자열 해시 → 0..1 (도트 위장무늬 등 결정적 패턴용)
  U.hash2 = (x, y, s = 0) => {
    let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return ((h >>> 0) % 10000) / 10000;
  };

  // ---------- 날짜 ----------
  const pad = (n) => String(n).padStart(2, '0');
  U.toD = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };
  U.toS = (dt) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  U.today = () => {
    const n = new Date();
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
  };
  U.addDays = (s, n) => {
    const d = U.toD(s);
    d.setUTCDate(d.getUTCDate() + n);
    return U.toS(d);
  };
  // 월 더하기(말일 보정)
  U.addMonths = (s, n) => {
    const d = U.toD(s);
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + n);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
    return U.toS(d);
  };
  U.diff = (a, b) => Math.round((U.toD(b) - U.toD(a)) / 86400000); // b - a (일)
  U.firstOfMonth = (s) => s.slice(0, 8) + '01';
  U.nextMonth1 = (s) => U.addMonths(U.firstOfMonth(s), 1);
  U.ym = (s) => s.slice(0, 7);
  U.month = (s) => Number(s.slice(5, 7));
  U.year = (s) => Number(s.slice(0, 4));
  U.day = (s) => Number(s.slice(8, 10));
  U.daysInMonth = (s) => {
    const d = U.toD(s);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  };
  U.dow = (s) => U.toD(s).getUTCDay();
  U.WD = ['일', '월', '화', '수', '목', '금', '토'];
  U.fmt = (s) => `${s.slice(0, 4)}. ${s.slice(5, 7)}. ${s.slice(8, 10)}.`;
  U.fmtW = (s) => `${U.fmt(s)}(${U.WD[U.dow(s)]})`;
  U.fmtK = (s) => `${U.year(s)}년 ${U.month(s)}월 ${U.day(s)}일`;
  U.max = (a, b) => (a > b ? a : b);
  U.min = (a, b) => (a < b ? a : b);
  // 해당 날짜 이후 첫 번째 특정 요일
  U.nextDow = (s, dow) => {
    let x = s;
    while (U.dow(x) !== dow) x = U.addDays(x, 1);
    return x;
  };

  // ---------- 숫자 ----------
  U.won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`;
  U.man = (n) => {
    const v = Math.round(n / 10000);
    return `${v.toLocaleString('ko-KR')}만`;
  };

  // ---------- 한국어 조사 ----------
  const hasJong = (word) => {
    const ch = String(word).trim().slice(-1);
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
    if (/[0-9]/.test(ch)) return '013678'.includes(ch);
    return false;
  };
  const isRieul = (word) => {
    const code = String(word).trim().slice(-1).charCodeAt(0);
    return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8;
  };
  // josa('홍길동','은는') → '홍길동은'
  U.josa = (w, t) => {
    const j = hasJong(w);
    const map = {
      은는: j ? '은' : '는',
      이가: j ? '이' : '가',
      을를: j ? '을' : '를',
      과와: j ? '과' : '와',
      아야: j ? '아' : '야',
      이여: j ? '이' : '',
      으로: j && !isRieul(w) ? '으로' : '로',
    };
    return w + (map[t] ?? '');
  };
  // 이름 부를 때: 길동아 / 철수야
  U.callName = (given) => U.josa(given, '아야');

  // ---------- 이름 ----------
  const SUR = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍', '전', '고', '문', '양', '손', '배', '백', '허', '남', '노'];
  const GIV = ['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지후', '준우', '준서', '건우', '도현', '현우', '우진', '선우', '연우', '유준', '정우', '승우', '승현', '시윤', '준혁', '은우', '지환', '승민', '지훈', '유찬', '민재', '현준', '태윤', '동현', '성민', '재원', '태민', '영호', '상훈', '경민', '진우', '한결'];
  U.randName = () => U.pick(SUR) + U.pick(GIV);
  U.uniqueNames = (n, exclude = []) => {
    const out = new Set(exclude);
    const res = [];
    let guard = 0;
    while (res.length < n && guard++ < 500) {
      const nm = U.randName();
      if (!out.has(nm)) {
        out.add(nm);
        res.push(nm);
      }
    }
    return res;
  };
  U.given = (full) => full.slice(1);

  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  DM.U = U;
})(window.DM);
