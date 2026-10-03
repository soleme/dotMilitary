// 게임 엔진: 상태, 대화/선택 UI, 달력(진급·봉급), HUD, 저장
(function (DM) {
  const U = DM.U;
  const D = DM.DATA;
  const R = DM.R;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const AUTO = params.has('auto');
  const SAVE_KEY = 'dotMilitary.save.v1';
  const PREF_KEY = 'dotMilitary.pref.v1';

  const G = { AUTO, params };
  let S = null;

  // ---------- 저장 ----------
  const store = {
    get(k) {
      try {
        return JSON.parse(localStorage.getItem(k));
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {}
    },
    del(k) {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    },
  };
  G.pref = Object.assign({ speed: 1, fast: false }, store.get(PREF_KEY) || {});
  G.savePref = () => store.set(PREF_KEY, G.pref);
  G.hasSave = () => !AUTO && !!store.get(SAVE_KEY);
  G.save = () => {
    if (!AUTO && S) store.set(SAVE_KEY, S);
  };
  G.load = () => {
    S = store.get(SAVE_KEY);
    return S;
  };
  G.clearSave = () => store.del(SAVE_KEY);

  // ---------- 상태 ----------
  G.newState = () => {
    S = {
      v: 1,
      name: '',
      major: 'none',
      license: false,
      grade: 2,
      hometown: 'Seoul',
      mma: '',
      shirt: '#5a7fb0',
      startDate: U.today(),
      date: U.today(),
      noticeDate: null,
      enlistDate: null,
      dischargeDate: null,
      branch: null,
      path: null,
      center: null,
      phase: 'prologue',
      week: 0,
      trainEnd: null,
      mos: null,
      unit: null,
      rankIdx: -1, // -1: 민간인/훈련병
      promo: [],
      miss: [0, 0, 0],
      stats: { hp: 50, mental: 60, skill: 30, rep: 50 },
      money: { wallet: 300000, saving: 0, totalPay: 0, extra: 0 },
      saveAmt: 0,
      leave: { annual: 24, used: 0, reward: 0, comfort: 0 },
      npc: {},
      flags: {},
      seen: {},
      evAt: {},
      log: [],
      awards: [],
      dispatches: [],
      dispatch: null,
      serviceNo: '',
      monthIdx: 0,
      checkpoint: null,
    };
    return S;
  };
  G.S = () => S;
  G.setS = (s) => {
    S = s;
  };

  // ---------- 파생 정보 ----------
  G.branch = () => D.BRANCH[S.branch || 'army'];
  G.isTrainee = () => S.phase === 'training' && !S.flags.graduated;
  G.rankName = () => {
    if (S.rankIdx < 0) return S.enlistDate && S.date >= S.enlistDate ? '훈련병' : '민간인';
    if (G.isTrainee()) return '훈련병';
    return D.RANKS[S.rankIdx];
  };
  G.inService = () => S.enlistDate && S.date >= S.enlistDate && S.phase !== 'end';
  G.served = () => (S.enlistDate ? U.clamp(U.diff(S.enlistDate, S.date) + 1, 0, G.totalDays()) : 0);
  G.totalDays = () => (S.enlistDate ? U.diff(S.enlistDate, S.dischargeDate) + 1 : 0);
  G.dday = () => (S.dischargeDate ? U.diff(S.date, S.dischargeDate) : null);
  G.leaveLeft = () => S.leave.annual + S.leave.reward + S.leave.comfort - S.leave.used;
  G.progress = () => {
    if (!S || !S.noticeDate || !S.dischargeDate) return 0;
    if (S.phase === 'end') return 100;
    const tot = U.diff(S.noticeDate, S.dischargeDate);
    const p = (U.diff(S.noticeDate, S.date) / tot) * 100;
    return U.clamp(p, 0, 100);
  };
  G.milestones = () => {
    if (!S || !S.noticeDate || !S.dischargeDate) return [];
    const tot = U.diff(S.noticeDate, S.dischargeDate);
    const at = (d) => (U.diff(S.noticeDate, d) / tot) * 100;
    const ms = [{ p: 0, l: '통지서' }, { p: at(S.enlistDate), l: '입영' }];
    if (S.trainEnd) ms.push({ p: at(S.trainEnd), l: '수료' });
    ['일병', '상병', '병장'].forEach((l, i) => S.promo[i] && ms.push({ p: at(S.promo[i]), l }));
    ms.push({ p: 100, l: '전역' });
    return ms;
  };

  // 플레이어 외형
  G.playerLook = () => {
    const ph = S.phase;
    const civ = { body: 'civil', head: S.flags.buzz ? 'buzz' : 'hair', shirt: S.shirt, pants: '#3b4f7a' };
    if (ph === 'prologue' || ph === 'notice' || ph === 'pre' || ph === 'end' || !S.enlistDate || S.date < S.enlistDate) return civ;
    const r = G.isTrainee() ? 0 : S.rankIdx + 1;
    const b = S.branch;
    if (S.flags.onLeaveCivil) return Object.assign(civ, { head: 'buzz' });
    if (S.dispatch && S.dispatch.un) return { body: 'camo', camo: 'army', head: 'bluehelm', rank: r, un: true };
    if (b === 'navy') return ph === 'training' ? { body: 'camo', camo: 'army', head: 'cap', rank: r } : { body: 'sailor', head: 'navycap', rank: r };
    if (b === 'air') return { body: 'camo', camo: 'air', head: ph === 'training' ? 'helmet' : 'cap', rank: r };
    if (b === 'marine') return { body: 'camo', camo: 'marine', head: 'octa', rank: r, redtag: ph !== 'training' || S.flags.redtag };
    return { body: 'camo', camo: 'army', head: ph === 'training' ? 'helmet' : 'cap', rank: r };
  };
  // NPC 외형 프리셋
  G.look = (kind, extra = {}) => {
    const b = S ? S.branch || 'army' : 'army';
    const camo = b === 'air' ? 'air' : b === 'marine' ? 'marine' : 'army';
    const head = b === 'marine' ? 'octa' : b === 'navy' ? 'navycap' : 'cap';
    const body = b === 'navy' ? 'sailor' : 'camo';
    const L = {
      mom: { body: 'civil', head: 'long', shirt: '#c56b8a', pants: '#4a4a6a' },
      dad: { body: 'civil', head: 'hair', shirt: '#5b7a99', glasses: true, hairC: '#555' },
      grandma: { body: 'civil', head: 'gray', shirt: '#8a6aa0', pants: '#5a5a5a' },
      friend: { body: 'civil', head: 'hair', shirt: '#d0a040', pants: '#404a5a' },
      friend2: { body: 'civil', head: 'hair', shirt: '#4aa070', pants: '#303030', hairC: '#5a3a2a' },
      barber: { body: 'civil', head: 'hair', shirt: '#f0f0f0', pants: '#333', apron: '#222' },
      civil: { body: 'civil', head: 'hair', shirt: '#7a7aa0' },
      drill: { body: 'camo', camo, head: b === 'marine' ? 'redcap' : 'drill', rank: 3 },
      trainee: { body: 'camo', camo, head: b === 'navy' ? 'cap' : b === 'marine' ? 'octa' : 'helmet' },
      soldier: { body, camo, head, rank: 2, redtag: b === 'marine' },
      senior: { body, camo, head, rank: 3, redtag: b === 'marine' },
      sergeant: { body, camo, head, rank: 4, redtag: b === 'marine' },
      junior: { body, camo, head, rank: 1, redtag: b === 'marine' },
      officer: { body: b === 'navy' ? 'sailor' : 'camo', camo, head: b === 'navy' ? 'cap' : head, officer: 3 },
      lt: { body: b === 'navy' ? 'sailor' : 'camo', camo, head: b === 'navy' ? 'cap' : head, officer: 1 },
      nco: { body: b === 'navy' ? 'sailor' : 'camo', camo, head: b === 'navy' ? 'cap' : head, nco: true },
      general: { body: 'camo', camo, head: b === 'navy' ? 'cap' : head, officer: 2, nco: false },
      farmer: { body: 'farmer', head: 'straw', skin: '#e0b088' },
      villager: { body: 'civil', head: 'gray', shirt: '#7a8a6a', pants: '#555' },
      un: { body: 'camo', camo: 'army', head: 'bluehelm', rank: 2, un: true },
      kid: { body: 'civil', head: 'hair', shirt: '#e05a5a', pants: '#3a3a6a', skin: '#c89468' },
      doctor: { body: 'coat', head: 'hair' },
    };
    return Object.assign({}, L[kind] || L.civil, extra);
  };

  // 장면 + 인물 배치
  G.scene = (id, opt = {}) => {
    const o = Object.assign({ month: U.month(S ? S.date : U.today()) }, opt);
    const chars = [];
    if (opt.me !== false) chars.push({ key: 'me', look: G.playerLook(), x: opt.mx ?? 150, y: opt.my ?? 162, pose: opt.mpose || 'stand' });
    (opt.npcs || []).forEach((n) => chars.push(Object.assign({ x: 190, y: 162, pose: 'stand' }, n, { look: typeof n.look === 'string' ? G.look(n.look) : n.look })));
    o.chars = chars;
    R.set(id, o);
    G.hud();
  };
  G.refreshMe = () => {
    const c = R.char('me');
    if (c) c.look = G.playerLook();
  };

  // ---------- UI: 대화 ----------
  const ui = {};
  let advanceResolve = null;
  let typing = null;
  const SPEAKER_COLOR = { me: '#9fe08a', sys: '#f2c14e' };

  function onAdvance() {
    if (typing) {
      typing.finish();
      return;
    }
    if (advanceResolve) {
      const r = advanceResolve;
      advanceResolve = null;
      ui.next.hidden = true;
      r();
    }
  }
  G.say = async (who, text, opt = {}) => {
    if (typeof text === 'function') text = text(S);
    const isMe = who === 'me';
    const label = who == null ? '' : isMe ? S.name : who;
    ui.speaker.textContent = label;
    ui.speaker.hidden = !label;
    ui.speaker.style.color = isMe ? SPEAKER_COLOR.me : opt.color || '#f6f0d8';
    ui.dialog.classList.toggle('narr', who == null);
    R.talking = opt.key || (isMe ? 'me' : null);
    if (!R.talking && who) {
      const c = R.chars.find((ch) => ch.name === who);
      if (c) R.talking = c.key;
    }
    ui.choices.innerHTML = '';
    if (AUTO) {
      ui.text.textContent = text;
      R.talking = null;
      return;
    }
    await typeText(text);
    ui.next.hidden = false;
    await new Promise((r) => (advanceResolve = r));
    R.talking = null;
  };
  G.narr = (text, opt) => G.say(null, text, opt);

  function typeText(text) {
    return new Promise((resolve) => {
      const spd = [28, 16, 6, 0][G.pref.speed] ?? 16;
      ui.text.textContent = '';
      if (!spd) {
        ui.text.textContent = text;
        resolve();
        return;
      }
      let i = 0;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearInterval(timer);
        ui.text.textContent = text;
        typing = null;
        resolve();
      };
      const timer = setInterval(() => {
        i += 1;
        ui.text.textContent = text.slice(0, i);
        if (i >= text.length) finish();
      }, spd);
      typing = { finish };
    });
  }

  // 선택지: options = [{label, hint, disabled, why}] 또는 문자열 배열. 반환: index
  G.choose = async (prompt, options) => {
    options = options.map((o) => (typeof o === 'string' ? { label: o } : o));
    if (prompt) {
      ui.speaker.hidden = true;
      ui.dialog.classList.add('narr');
      if (AUTO) ui.text.textContent = prompt;
      else await typeText(prompt);
    }
    if (AUTO) {
      const ok = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
      const forced = G.autoPick && G.autoPick(prompt, options);
      return forced != null ? forced : U.pick(ok);
    }
    ui.next.hidden = true;
    ui.choices.innerHTML = '';
    return new Promise((resolve) => {
      const btns = options.map((o, i) => {
        const b = document.createElement('button');
        b.className = 'choice';
        b.disabled = !!o.disabled;
        b.innerHTML = `<span class="ck">${i + 1}</span><span class="cl">${U.esc(o.label)}</span>${o.hint ? `<span class="ch">${U.esc(o.hint)}</span>` : ''}${o.disabled && o.why ? `<span class="ch why">${U.esc(o.why)}</span>` : ''}`;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          pick(i);
        });
        ui.choices.appendChild(b);
        return b;
      });
      const first = btns.find((b) => !b.disabled);
      if (first && matchMedia('(hover: hover)').matches) first.focus({ preventScroll: true });
      const keyH = (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= options.length && !options[n - 1].disabled) {
          e.preventDefault();
          pick(n - 1);
        }
      };
      document.addEventListener('keydown', keyH);
      function pick(i) {
        document.removeEventListener('keydown', keyH);
        ui.choices.innerHTML = '';
        G.sfx('select');
        resolve(i);
      }
    });
  };
  // 이름 입력
  G.ask = async (prompt, def) => {
    if (AUTO) return def;
    ui.speaker.hidden = true;
    await typeText(prompt);
    return new Promise((resolve) => {
      ui.choices.innerHTML = `<form class="askf"><input id="askInput" maxlength="4" autocomplete="off" value="${U.esc(def)}" aria-label="이름"><button class="choice" type="submit"><span class="cl">확인</span></button></form>`;
      const f = ui.choices.querySelector('form');
      const inp = f.querySelector('input');
      inp.focus();
      inp.select();
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = inp.value.trim().replace(/[^가-힣a-zA-Z]/g, '').slice(0, 4);
        ui.choices.innerHTML = '';
        resolve(v || def);
      });
    });
  };

  // ---------- 오버레이 ----------
  G.title = async (title, sub = '', opt = {}) => {
    ui.card.innerHTML = `<div class="ct-k">${U.esc(opt.kicker || '')}</div><div class="ct-t">${U.esc(title)}</div><div class="ct-s">${U.esc(sub)}</div>`;
    ui.card.hidden = false;
    ui.card.classList.remove('show');
    void ui.card.offsetWidth;
    ui.card.classList.add('show');
    if (AUTO) {
      ui.card.hidden = true;
      return;
    }
    await new Promise((r) => {
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        ui.card.removeEventListener('click', end);
        document.removeEventListener('keydown', kd);
        r();
      };
      const kd = (e) => {
        if (e.key === ' ' || e.key === 'Enter') end();
      };
      ui.card.addEventListener('click', end);
      document.addEventListener('keydown', kd);
      setTimeout(end, opt.ms || 1900);
    });
    ui.card.hidden = true;
  };

  G.doc = async (html, opt = {}) => {
    if (AUTO) return;
    ui.modalBody.innerHTML = html;
    ui.modal.hidden = false;
    ui.modalClose.textContent = opt.btn || '확인';
    ui.modalClose.focus({ preventScroll: true });
    await new Promise((r) => {
      const close = () => {
        ui.modalClose.removeEventListener('click', close);
        ui.modal.hidden = true;
        r();
      };
      ui.modalClose.addEventListener('click', close);
    });
  };

  G.toast = (msg, kind = '') => {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = msg;
    ui.toasts.appendChild(el);
    while (ui.toasts.children.length > 4) ui.toasts.firstChild.remove();
    setTimeout(() => el.classList.add('out'), AUTO ? 10 : 2200);
    setTimeout(() => el.remove(), AUTO ? 20 : 2700);
  };

  const STAT_NAME = { hp: '체력', mental: '멘탈', skill: '숙련', rep: '평판' };
  G.fx = (d = {}, quiet = false) => {
    for (const k of Object.keys(d)) {
      const v = d[k];
      if (STAT_NAME[k]) {
        S.stats[k] = U.clamp(S.stats[k] + v, 0, 100);
        if (!quiet && v) G.toast(`${STAT_NAME[k]} ${v > 0 ? '+' : ''}${v}`, v > 0 ? 'up' : 'down');
      } else if (k === 'money') {
        S.money.wallet += v;
        if (!quiet && v) G.toast(`${v > 0 ? '+' : ''}${U.won(v)}`, v > 0 ? 'up' : 'down');
      } else if (k === 'reward') {
        S.leave.reward += v;
        if (!quiet && v) G.toast(`포상휴가 +${v}일`, 'gold');
      } else if (k === 'comfort') {
        S.leave.comfort += v;
        if (!quiet && v) G.toast(`위로휴가 +${v}일`, 'gold');
      }
    }
    G.hud();
  };
  G.log = (text) => {
    S.log.push({ d: S.date, t: text });
  };
  G.award = (text) => {
    S.awards.push({ d: S.date, t: text });
    G.log(`★ ${text}`);
  };

  G.bgm = (name) => DM.Audio.play(name);
  G.sfx = () => {};

  // ---------- 달력 ----------
  // 날짜를 target까지 진행. 1일=진급 판단, 10일=봉급
  G.passTo = async (target) => {
    if (!S.date || target <= S.date) {
      G.hud();
      return;
    }
    let d = S.date;
    while (d < target) {
      d = U.addDays(d, 1);
      S.date = d;
      if (!S.enlistDate || d < S.enlistDate || d > S.dischargeDate) continue;
      if (U.day(d) === 1) await promotionCheck(d);
      if (U.day(d) === 10) payday(d);
    }
    G.hud();
  };
  G.pass = (days) => G.passTo(U.addDays(S.date, days));

  function payday(d) {
    const r = Math.max(0, S.rankIdx);
    const pay = D.PAY[r];
    const dep = Math.min(S.saveAmt, pay);
    S.money.wallet += pay - dep;
    S.money.saving += dep;
    S.money.totalPay += pay;
    let extra = 0;
    if (S.dispatch && S.dispatch.allowance) {
      extra = S.dispatch.allowance;
      S.money.wallet += extra;
      S.money.extra += extra;
    }
    G.toast(`봉급 ${U.man(pay)}원 입금${dep ? ` · 적금 ${U.man(dep)}` : ''}${extra ? ` · 파병수당 ${U.man(extra)}` : ''}`, 'gold');
  }

  async function promotionCheck(d) {
    if (S.rankIdx < 0 || S.rankIdx >= 3) return;
    const due = S.promo[S.rankIdx];
    if (!due || d < due) return;
    // 일병→상병, 상병→병장은 부대 진급심사(체력·사격·인성 등) — 게임에서는 경미한 누락만 구현
    if (S.rankIdx >= 1 && S.miss[S.rankIdx] < 2) {
      let risk = 0;
      if (S.stats.hp < 25) risk += 0.35;
      if (S.stats.skill < 20) risk += 0.3;
      if (S.flags.discipline) risk += 0.6;
      if (Math.random() < risk) {
        S.miss[S.rankIdx]++;
        S.promo[S.rankIdx] = U.addMonths(due, 1);
        S.flags.discipline = false;
        G.log(`진급 누락 (${D.RANKS[S.rankIdx + 1]} 진급심사 불합격, 1개월 연기)`);
        await G.title('진급 누락', `${D.RANKS[S.rankIdx + 1]} 진급심사 불합격 — 다음 달 재심사`, { kicker: U.fmt(d) });
        G.fx({ mental: -8 });
        return;
      }
    }
    S.rankIdx++;
    const rn = D.RANKS[S.rankIdx];
    G.refreshMe();
    R.flash('#fff6c0', 0.5);
    G.log(`${rn} 진급`);
    await G.title(`${rn} 진급!`, `${U.fmt(d)}부 · 봉급 ${U.man(D.PAY[S.rankIdx])}원`, { kicker: '진급', ms: 2200 });
    G.fx({ mental: 6 });
    G.hud();
  }
  G.forceRank = (idx) => {
    S.rankIdx = idx;
    G.refreshMe();
    G.hud();
  };

  // ---------- HUD ----------
  G.hud = () => {
    if (!S || !ui.hud) return;
    const b = S.branch ? D.BRANCH[S.branch] : null;
    ui.hudName.textContent = S.name ? `${G.rankName()} ${S.name}` : '—';
    const ins = ui.insignia;
    ins.innerHTML = '';
    ins.className = 'insignia';
    if (S.rankIdx >= 0 && !G.isTrainee()) {
      for (let i = 0; i <= S.rankIdx; i++) ins.appendChild(document.createElement('i'));
    } else if (G.inService()) ins.classList.add('trainee');
    else ins.classList.add('civ');
    const parts = [];
    if (b) parts.push(b.name);
    if (S.unit) parts.push(S.unit.short || S.unit.name);
    else if (S.center && G.inService()) parts.push(S.center.name);
    if (S.mos) parts.push(S.mos.code ? `${S.mos.code} ${S.mos.name}` : S.mos.name);
    if (S.dispatch) parts.push(`[파견] ${S.dispatch.short || S.dispatch.name}`);
    ui.hudSub.textContent = parts.join(' · ') || '스무 살';
    ui.hudDate.textContent = S.date ? U.fmtW(S.date) : '';
    const dd = G.dday();
    if (S.enlistDate && S.date < S.enlistDate) ui.hudDday.textContent = `입영 D-${U.diff(S.date, S.enlistDate)}`;
    else if (dd != null && S.phase !== 'end') ui.hudDday.textContent = `복무 ${G.served()}/${G.totalDays()}일 · 전역 D-${Math.max(0, dd)}`;
    else if (S.phase === 'end') ui.hudDday.textContent = '전역 완료';
    else ui.hudDday.textContent = '';
    ui.hudMoney.textContent = `통장 ${U.man(S.money.wallet)} · 적금 ${U.man(S.money.saving)}`;
    ui.hudLeave.textContent = S.enlistDate ? `휴가 ${G.leaveLeft()}일 남음` : '';
    for (const k of ['hp', 'mental', 'skill', 'rep']) {
      const v = Math.round(S.stats[k]);
      ui.stat[k].style.width = `${v}%`;
      ui.stat[k].parentNode.parentNode.querySelector('b').textContent = v;
    }
    const p = G.progress();
    ui.progFill.style.width = `${p}%`;
    ui.progPct.textContent = `${p.toFixed(1)}%`;
    ui.prog.setAttribute('aria-valuenow', p.toFixed(1));
    const ms = G.milestones();
    const key = ms.map((m) => m.l + m.p.toFixed(1)).join();
    if (ui.progMarks.dataset.k !== key) {
      ui.progMarks.dataset.k = key;
      // 가까운 이정표 라벨은 아랫줄로 엇갈려 겹침 방지
      let lastTop = -99;
      ui.progMarks.innerHTML = ms
        .map((m) => {
          const lo = m.p - lastTop < 9;
          if (!lo) lastTop = m.p;
          return `<span class="mk${lo ? ' lo' : ''}" style="left:${m.p}%"><i></i><em>${m.l}</em></span>`;
        })
        .join('');
    }
    ui.progMarks.querySelectorAll('.mk').forEach((el, i) => el.classList.toggle('done', ms[i] && ms[i].p <= p + 0.01));
  };

  // ---------- 수첩(기록) ----------
  G.openNotebook = async () => {
    if (!S || !S.name) return;
    const b = S.branch ? D.BRANCH[S.branch] : null;
    const rows = [
      ['성명', S.name],
      ['군번', S.serviceNo || '-'],
      ['군', b ? b.name : '-'],
      ['입영', S.enlistDate ? `${U.fmt(S.enlistDate)} ${S.center ? S.center.name : ''}` : '-'],
      ['주특기', S.mos ? `${S.mos.code ? S.mos.code + ' ' : ''}${S.mos.name} (${S.mos.group})` : '-'],
      ['소속', S.unit ? `${S.unit.name} (${S.unit.place})` : '-'],
      ['계급', G.rankName()],
      ['진급 예정', S.promo.length ? S.promo.map((p, i) => `${D.RANKS[i + 1]} ${U.fmt(p)}`).join(' / ') : '-'],
      ['전역 예정', S.dischargeDate ? U.fmt(S.dischargeDate) : '-'],
      ['휴가', S.enlistDate ? `연가 ${S.leave.annual} + 포상 ${S.leave.reward} + 위로 ${S.leave.comfort} − 사용 ${S.leave.used} = ${G.leaveLeft()}일` : '-'],
      ['봉급 누계', U.won(S.money.totalPay)],
      ['적금', `${U.won(S.money.saving)} (월 ${U.man(S.saveAmt)})`],
    ];
    const logs = S.log.slice(-40).reverse();
    const html = `<h2 class="doc-h">복무 수첩</h2>
      <table class="kv">${rows.map((r) => `<tr><th>${r[0]}</th><td>${U.esc(r[1])}</td></tr>`).join('')}</table>
      ${S.dispatches.length ? `<h3>파견 이력</h3><ul class="loglist">${S.dispatches.map((d) => `<li><b>${U.fmt(d.start)}~${U.fmt(d.end)}</b> ${U.esc(d.name)} (${U.esc(d.place)})</li>`).join('')}</ul>` : ''}
      ${S.awards.length ? `<h3>포상·표창</h3><ul class="loglist">${S.awards.map((a) => `<li><b>${U.fmt(a.d)}</b> ${U.esc(a.t)}</li>`).join('')}</ul>` : ''}
      <h3>최근 기록</h3><ul class="loglist">${logs.map((l) => `<li><b>${U.fmt(l.d)}</b> ${U.esc(l.t)}</li>`).join('') || '<li>아직 기록이 없습니다.</li>'}</ul>
      <h3>고증 노트</h3><p class="note">2026년 기준 제도를 게임용으로 단순화했습니다. 복무기간(육군·해병 18, 해군 20, 공군 21개월), 병 봉급(이병 75만·일병 90만·상병 120만·병장 150만), 장병내일준비적금(월 최대 55만 원, 매칭 100%), 진급(이병 2개월 → 일병 6 → 상병 6 → 병장), 연가(육군·해병 24일, 해군 27일, 공군 28일)를 반영했습니다. 신병교육대 운영 현황·부대 편성은 해마다 바뀌므로 실제와 다를 수 있습니다. 문서는 모두 게임 속 가상 문서입니다.</p>`;
    ui.modalBody.innerHTML = html;
    ui.modal.hidden = false;
    ui.modalClose.textContent = '닫기';
    await new Promise((r) => {
      const close = () => {
        ui.modalClose.removeEventListener('click', close);
        ui.modal.hidden = true;
        r();
      };
      ui.modalClose.addEventListener('click', close);
    });
  };

  // ---------- 초기화 ----------
  G.initUI = () => {
    Object.assign(ui, {
      hud: $('hud'),
      hudName: $('hudName'),
      hudSub: $('hudSub'),
      hudDate: $('hudDate'),
      hudDday: $('hudDday'),
      hudMoney: $('hudMoney'),
      hudLeave: $('hudLeave'),
      insignia: $('insignia'),
      prog: $('progress'),
      progFill: $('progFill'),
      progPct: $('progPct'),
      progMarks: $('progMarks'),
      dialog: $('dialog'),
      speaker: $('speaker'),
      text: $('text'),
      choices: $('choices'),
      next: $('nextInd'),
      card: $('titleCard'),
      toasts: $('toasts'),
      modal: $('modal'),
      modalBody: $('modalBody'),
      modalClose: $('modalClose'),
      stat: { hp: $('stHp'), mental: $('stMental'), skill: $('stSkill'), rep: $('stRep') },
    });
    ui.dialog.addEventListener('click', onAdvance);
    $('stage').addEventListener('click', (e) => {
      if (!R.mg) onAdvance();
    });
    document.addEventListener('keydown', (e) => {
      if (!ui.modal.hidden) {
        if (e.key === 'Escape' || e.key === 'Enter') ui.modalClose.click();
        return;
      }
      if (R.mg) return;
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') {
        if (ui.choices.children.length) return;
        e.preventDefault();
        onAdvance();
      }
    });
    $('btnNote').addEventListener('click', () => G.openNotebook());
    const bgmBtn = $('btnBgm');
    bgmBtn.addEventListener('click', () => {
      const on = DM.Audio.toggle();
      bgmBtn.textContent = on ? '♪ BGM 켜짐' : '♪ BGM 꺼짐';
      bgmBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const spdBtn = $('btnSpeed');
    const spdLabel = () => (spdBtn.textContent = `글자 ${['느림', '보통', '빠름', '즉시'][G.pref.speed]}`);
    spdLabel();
    spdBtn.addEventListener('click', () => {
      G.pref.speed = (G.pref.speed + 1) % 4;
      G.savePref();
      spdLabel();
    });
    const fastBtn = $('btnFast');
    const fastLabel = () => {
      fastBtn.textContent = G.pref.fast ? '진행 빠르게' : '진행 보통';
      fastBtn.setAttribute('aria-pressed', G.pref.fast ? 'true' : 'false');
    };
    fastLabel();
    fastBtn.addEventListener('click', () => {
      G.pref.fast = !G.pref.fast;
      G.savePref();
      fastLabel();
    });
    $('btnReset').addEventListener('click', async () => {
      if (!S || !S.name) return;
      if (confirm('저장된 진행을 지우고 처음부터 다시 시작할까요?')) {
        G.clearSave();
        location.reload();
      }
    });
  };

  DM.G = G;
})(window.DM);
