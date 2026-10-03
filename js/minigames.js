// 미니게임: 기록사격(20발), 방독면 착용(9초), 3km 달리기
(function (DM) {
  const U = DM.U;
  const D = DM.DATA;
  const R = DM.R;
  const G = DM.G;
  const d = R.draw;
  const W = R.W;
  const H = R.H;

  function mgUI(html) {
    const el = document.getElementById('mgUI');
    el.innerHTML = html || '';
    el.hidden = !html;
    return el;
  }

  // 공통 실행기: 입력 바인딩, 종료 시 정리
  function runGame(game) {
    return new Promise((resolve) => {
      const stage = document.getElementById('stage');
      const onKey = (e) => {
        if (e.repeat) return;
        if (game.key && game.key(e.key)) e.preventDefault();
      };
      const onPtr = (e) => {
        if (e.target.closest && e.target.closest('#mgUI button')) return;
        game.tap && game.tap();
      };
      document.addEventListener('keydown', onKey);
      stage.addEventListener('pointerdown', onPtr);
      game.finish = (res) => {
        document.removeEventListener('keydown', onKey);
        stage.removeEventListener('pointerdown', onPtr);
        mgUI('');
        R.mg = null;
        resolve(res);
      };
      R.mg = game;
    });
  }

  // 결과 표시 후 종료하는 헬퍼
  function endWith(game, res, ms = 1600) {
    game.over = true;
    setTimeout(() => game.finish(res), ms);
  }

  // ---------- 기록사격 ----------
  const MG = {};
  MG.shoot = async (opt = {}) => {
    const S = G.S();
    const shots = opt.shots || 20;
    if (G.AUTO) {
      const hits = U.clamp(Math.round(7 + S.stats.skill / 9 + S.stats.mental / 40 + U.rand(-3, 4)), 0, shots);
      return { hits, shots };
    }
    const dists = U.shuffle([...Array(7).fill(100), ...Array(7).fill(200), ...Array(6).fill(250)]).slice(0, shots);
    const A = 9 + (100 - S.stats.skill) / 9 + (100 - S.stats.mental) / 25;
    const g = { over: false, shot: 0, hits: 0, cur: null, msg: '', msgT: 0, intro: 2.2, flash: 0, holes: [] };
    const spawn = (t) => {
      const dist = dists[g.shot];
      const size = dist === 100 ? 7 : dist === 200 ? 5 : 4;
      g.cur = { dist, size, x: U.randi(70, 250), y: U.randi(70, 112), t0: t, life: dist === 100 ? 3.2 : dist === 200 ? 3.6 : 4.0, w: U.rand(2.0, 2.6), p: U.rand(0, 6) };
    };
    let now = 0;
    const cross = () => {
      const c = g.cur;
      if (!c) return { x: 160, y: 90 };
      const tt = now - c.t0;
      return { x: c.x + A * Math.sin(c.w * tt + c.p), y: c.y + (A / 2) * Math.sin(2 * (c.w * tt + c.p)) + Math.sin(tt * 7) * 0.6 };
    };
    const fire = () => {
      if (g.over || g.intro > 0 || !g.cur) return;
      const c = g.cur;
      const p = cross();
      const r = c.size + 1;
      const hit = Math.abs(p.x - c.x) <= r && p.y >= c.y - c.size * 2.6 && p.y <= c.y + c.size * 1.2;
      g.holes.push({ x: p.x, y: p.y });
      g.flash = 0.08;
      if (hit) {
        g.hits++;
        g.msg = '명중!';
      } else g.msg = '빗나감';
      g.msgT = 0.5;
      next();
    };
    const next = () => {
      g.shot++;
      g.cur = null;
      g.wait = 0.45;
      if (g.shot >= shots) {
        g.cur = null;
        endWith(g, { hits: g.hits, shots }, 2200);
      }
    };
    g.key = (k) => {
      if (k === ' ' || k === 'Enter' || k === 'f' || k === 'F') {
        fire();
        return true;
      }
      return false;
    };
    g.tap = fire;
    g.update = (dt, t) => {
      now = t;
      if (g.intro > 0) {
        g.intro -= dt;
        if (g.intro <= 0) spawn(t);
        return;
      }
      if (g.over) return;
      if (g.wait > 0) {
        g.wait -= dt;
        if (g.wait <= 0) spawn(t);
        return;
      }
      if (g.cur && t - g.cur.t0 > g.cur.life) {
        g.msg = '시간 초과';
        g.msgT = 0.5;
        next();
      }
      if (g.msgT > 0) g.msgT -= dt;
      if (g.flash > 0) g.flash -= dt;
    };
    g.draw = (ctx, t) => {
      R.useCtx(ctx);
      d.sky('day', 0, 70);
      d.ridge(2.9, 50, 20, '#5f8a4f', 1.1);
      d.rect(0, 60, W, 120, '#7aa452');
      d.rect(0, 60, W, 6, '#8a6a43');
      for (let i = 0; i < 6; i++) d.rect(0, 70 + i * 18, W, 1, 'rgba(0,0,0,0.08)');
      if (g.cur) {
        const c = g.cur;
        const life = 1 - (t - c.t0) / c.life;
        d.rect(c.x - c.size, c.y - c.size * 2, c.size * 2, c.size * 3, '#2f4a2a');
        d.rect(c.x - Math.ceil(c.size / 2), c.y - c.size * 3, c.size, c.size, '#2f4a2a');
        d.text(`${c.dist}m`, c.x, c.y + c.size + 8, '#1a2a1a', 8);
        d.rect(c.x - 10, c.y + c.size + 14, 20 * Math.max(0, life), 2, life > 0.3 ? '#2a6a2a' : '#c8323c');
      }
      for (const h of g.holes.slice(-3)) d.px(h.x, h.y, '#111');
      // 조준경 테두리
      ctx.save();
      ctx.fillStyle = '#0b0d14';
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(160, 92, 100, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      ctx.restore();
      if (g.cur && !g.over) {
        const p = cross();
        d.rect(p.x - 8, p.y, 6, 1, '#c8323c');
        d.rect(p.x + 3, p.y, 6, 1, '#c8323c');
        d.rect(p.x, p.y - 8, 1, 6, '#c8323c');
        d.rect(p.x, p.y + 3, 1, 6, '#c8323c');
        d.px(p.x, p.y, '#ff3a3a');
      }
      if (g.flash > 0) {
        ctx.fillStyle = 'rgba(255,240,180,0.4)';
        ctx.fillRect(0, 0, W, H);
      }
      d.text(`탄 ${Math.min(g.shot + 1, shots)}/${shots}`, 30, 10, '#f2c14e', 9);
      d.text(`명중 ${g.hits}`, 290, 10, '#9fe08a', 9);
      if (g.msgT > 0) d.text(g.msg, 160, 170, g.msg === '명중!' ? '#9fe08a' : '#ff8a8a', 10);
      if (g.intro > 0) {
        d.rect(40, 70, 240, 44, 'rgba(0,0,0,0.75)');
        d.text('기록사격 20발 — 조준선이 표적을 지날 때', 160, 84, '#fff', 9);
        d.text('스페이스 / 화면 터치로 격발!', 160, 100, '#f2c14e', 9);
      }
      if (g.over) {
        const gi = D.SHOOT_STD.findIndex((s) => g.hits >= s);
        d.rect(50, 60, 220, 60, 'rgba(0,0,0,0.85)');
        d.text(`20발 중 ${g.hits}발 명중`, 160, 78, '#fff', 10);
        d.text(D.SHOOT_GRADE[gi < 0 ? 4 : gi], 160, 98, gi === 0 ? '#f2c14e' : gi < 0 ? '#ff8a8a' : '#9fe08a', 12);
      }
    };
    mgUI('<div class="mg-hint">조준선이 표적에 겹칠 때 <b>스페이스</b> 또는 <b>화면 터치</b></div><button class="mg-btn wide" data-k="fire">격발</button>');
    document.querySelector('#mgUI [data-k=fire]').addEventListener('click', fire);
    return runGame(g);
  };

  // ---------- 방독면 착용 9초 ----------
  const ARW = { ArrowLeft: '←', ArrowUp: '↑', ArrowRight: '→', ArrowDown: '↓', a: '←', w: '↑', d: '→', s: '↓', A: '←', W: '↑', D: '→', S: '↓' };
  MG.mask = async () => {
    const S = G.S();
    if (G.AUTO) {
      const tm = U.rand(5.5, 10.5) - S.stats.skill / 40;
      return { ok: tm <= 9, time: Math.max(4, tm) };
    }
    const steps = ['숨 참고 눈 감기', '방독면 꺼내기', '얼굴에 밀착', '머리끈 조이기', '배출구 막고 "가스!"', '밀폐 점검'];
    const seq = steps.map(() => U.pick(['←', '↑', '→', '↓']));
    const g = { over: false, i: 0, t: 0, started: false, intro: 2.0, pen: 0, shakeT: 0 };
    const press = (a) => {
      if (g.over || g.intro > 0) return;
      if (a === seq[g.i]) {
        g.i++;
        if (g.i >= seq.length) {
          const time = g.t + g.pen;
          endWith(g, { ok: time <= 9, time });
        }
      } else {
        g.pen += 0.6;
        g.shakeT = 0.25;
      }
    };
    g.key = (k) => {
      if (ARW[k]) {
        press(ARW[k]);
        return true;
      }
      return false;
    };
    g.update = (dt) => {
      if (g.intro > 0) {
        g.intro -= dt;
        return;
      }
      if (g.over) return;
      g.t += dt;
      if (g.shakeT > 0) g.shakeT -= dt;
      if (g.t + g.pen > 12) endWith(g, { ok: false, time: g.t + g.pen });
    };
    g.draw = (ctx, t) => {
      R.useCtx(ctx);
      d.rect(0, 0, W, H, '#1e2a1e');
      ctx.save();
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 12; i++) d.rect((i * 31 + t * 12) % W, 20 + ((i * 17) % 140), 30, 8, '#b7e07a');
      ctx.restore();
      const sx = g.shakeT > 0 ? Math.round((Math.random() - 0.5) * 6) : 0;
      // 큰 얼굴
      ctx.save();
      ctx.translate(sx, 0);
      d.rect(40, 50, 60, 66, '#f2c79a');
      d.rect(40, 44, 60, 10, '#3e4728');
      d.rect(52, 74, 8, 4, g.i >= 1 ? '#111' : '#111');
      d.rect(80, 74, 8, 4, '#111');
      if (g.i >= 2) {
        d.rect(36, 62, 68, 50, '#4a4f44');
        d.rect(48, 70, 16, 12, g.i >= 3 ? '#9fc2d8' : '#5a6a5a');
        d.rect(76, 70, 16, 12, g.i >= 3 ? '#9fc2d8' : '#5a6a5a');
        d.rect(62, 92, 16, 14, '#2a2e2a');
      }
      if (g.i >= 4) {
        d.rect(32, 58, 4, 40, '#2a2a2a');
        d.rect(104, 58, 4, 40, '#2a2a2a');
      }
      ctx.restore();
      const left = Math.max(0, 9 - g.t - g.pen);
      d.text(`${left.toFixed(1)}초`, 70, 30, left < 3 ? '#ff8a8a' : '#f2c14e', 14);
      steps.forEach((s, i) => {
        const y = 40 + i * 20;
        const c = i < g.i ? '#9fe08a' : i === g.i ? '#ffffff' : '#7a8a7a';
        d.text(`${i + 1}. ${s}`, 140, y, c, 9, 'left');
        d.text(seq[i], 290, y, c, 12);
      });
      if (g.intro > 0) {
        d.rect(30, 70, 260, 44, 'rgba(0,0,0,0.8)');
        d.text('"가스! 가스! 가스!" — 9초 안에 방독면 착용!', 160, 84, '#fff', 9);
        d.text('표시된 방향키(또는 버튼)를 순서대로', 160, 100, '#f2c14e', 9);
      }
      if (g.over) {
        const tm = g.t + g.pen;
        d.rect(50, 64, 220, 50, 'rgba(0,0,0,0.85)');
        d.text(`착용 시간 ${tm.toFixed(1)}초`, 160, 80, '#fff', 10);
        d.text(tm <= 9 ? '합격' : '불합격 — 콜록콜록', 160, 98, tm <= 9 ? '#9fe08a' : '#ff8a8a', 11);
      }
    };
    const ui = mgUI('<div class="mg-hint">방향키 / WASD / 버튼</div><div class="mg-pad"><button class="mg-btn" data-a="←">←</button><button class="mg-btn" data-a="↑">↑</button><button class="mg-btn" data-a="↓">↓</button><button class="mg-btn" data-a="→">→</button></div>');
    ui.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => press(b.dataset.a)));
    return runGame(g);
  };

  // ---------- 3km 달리기 ----------
  MG.run = async (opt = {}) => {
    const S = G.S();
    const label = opt.label || '3km 달리기';
    if (G.AUTO) {
      const sec = Math.round(980 - S.stats.hp * 2.6 + U.rand(-40, 50));
      return { sec };
    }
    const K = 36; // 실제 1초 = 게임 36초 (초당 8~9회 번갈아 누르면 특급권)
    const stride = 19 * (0.82 + S.stats.hp / 260);
    const g = { over: false, dist: 0, t: 0, last: null, intro: 2.2, speed: 0, bad: 0 };
    let lastT = 0;
    const step = (side) => {
      if (g.over || g.intro > 0) return;
      if (g.last === side) {
        g.bad = 0.3;
        return;
      }
      // 사람 발걸음 이상으로 빠른 연타(매크로 등)는 무효
      const now = performance.now();
      if (now - lastT < 90) return;
      lastT = now;
      g.last = side;
      g.dist += stride;
      g.speed = Math.min(1, g.speed + 0.25);
      if (g.dist >= 3000) {
        g.dist = 3000;
        endWith(g, { sec: Math.round(g.t * K) }, 2000);
      }
    };
    g.key = (k) => {
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'f' || k === 'F') {
        step('L');
        return true;
      }
      if (k === 'ArrowRight' || k === 'd' || k === 'D' || k === 'j' || k === 'J') {
        step('R');
        return true;
      }
      return false;
    };
    let scroll = 0;
    g.update = (dt) => {
      if (g.intro > 0) {
        g.intro -= dt;
        return;
      }
      if (g.over) return;
      g.t += dt;
      g.speed = Math.max(0, g.speed - dt * 1.4);
      scroll += g.speed * dt * 120;
      if (g.bad > 0) g.bad -= dt;
      if (g.t * K > 1300) endWith(g, { sec: 1300 + Math.round((3000 - g.dist) / 3) }, 1600);
    };
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    g.draw = (ctx, t) => {
      R.useCtx(ctx);
      d.sky('day', 0, 90);
      d.ridge(1.5, 70, 22, '#5f8a4f');
      d.rect(0, 90, W, 90, '#7aa452');
      d.rect(0, 120, W, 34, '#b4553a');
      for (let i = -1; i < 12; i++) d.rect(i * 32 - (scroll % 32), 136, 16, 1, '#f1f2ea');
      for (let i = -1; i < 7; i++) d.pine(i * 56 - ((scroll * 0.5) % 56), 112, 3, 'summer');
      const look = G.playerLook();
      d.person(150, 152, look, g.speed > 0.05 ? 'run' : 'stand', t);
      const pace = (g.t * K) / 750;
      const npcX = 150 + (pace * 3000 - g.dist) * 0.4;
      if (npcX > -10 && npcX < W + 10) d.person(npcX, 146, Object.assign({}, look, { rank: 3 }), 'run', t + 1);
      d.text('특급 페이스', npcX, 120, '#fff', 7);
      // 진행 바
      d.rect(20, 14, 280, 6, '#2a2a2a');
      d.rect(20, 14, 280 * (g.dist / 3000), 6, '#f2c14e');
      d.text(`${Math.floor(g.dist)}m / 3000m`, 160, 28, '#1a1a1a', 9);
      const sec = g.t * K;
      d.text(fmt(sec), 160, 44, sec <= D.RUN_STD[0] ? '#1a5a1a' : sec <= D.RUN_STD[3] ? '#6a5a1a' : '#8a1a1a', 14);
      if (g.bad > 0) d.text('왼발·오른발 번갈아!', 160, 60, '#c8323c', 9);
      if (g.intro > 0) {
        d.rect(30, 70, 260, 44, 'rgba(0,0,0,0.8)');
        d.text(`${label} — 특급 12:30 / 3급 15:36`, 160, 84, '#fff', 9);
        d.text('←/→ (A/D) 또는 버튼을 번갈아 연타!', 160, 100, '#f2c14e', 9);
      }
      if (g.over) {
        const s = g.dist >= 3000 ? Math.round(g.t * K) : null;
        const gi = s == null ? 4 : D.RUN_STD.findIndex((x) => s <= x);
        d.rect(50, 64, 220, 50, 'rgba(0,0,0,0.85)');
        d.text(s == null ? '완주 실패' : `기록 ${fmt(s)}`, 160, 80, '#fff', 10);
        d.text(D.GRADE[gi < 0 ? 4 : gi], 160, 98, gi === 0 ? '#f2c14e' : gi < 0 || gi === 4 ? '#ff8a8a' : '#9fe08a', 12);
      }
    };
    const ui = mgUI('<div class="mg-hint">왼쪽·오른쪽 번갈아 누르기</div><div class="mg-pad two"><button class="mg-btn big" data-s="L">왼발</button><button class="mg-btn big" data-s="R">오른발</button></div>');
    ui.querySelectorAll('[data-s]').forEach((b) =>
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        step(b.dataset.s);
      })
    );
    return runGame(g);
  };

  MG.gradeRun = (sec) => {
    const i = D.RUN_STD.findIndex((x) => sec <= x);
    return i < 0 ? 4 : i;
  };
  MG.gradeShoot = (hits) => {
    const i = D.SHOOT_STD.findIndex((x) => hits >= x);
    return i < 0 ? 4 : i;
  };
  MG.fmtSec = (s) => `${Math.floor(s / 60)}분 ${String(Math.round(s % 60)).padStart(2, '0')}초`;

  DM.MG = MG;
})(window.DM);
