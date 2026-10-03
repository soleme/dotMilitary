// 도트 렌더러: 320x180 캔버스에 장면(배경 캐시 + 애니메이션 전경) + 인물 스프라이트를 그린다.
(function (DM) {
  const U = DM.U;
  const W = 320;
  const H = 180;
  let main = null; // 화면 컨텍스트
  let g = null; // 현재 그리기 대상(배경 캐시 or 화면)

  const P = {
    black: '#14141c', ink: '#1f2430', dgray: '#3a3f4b', gray: '#6b7280', lgray: '#a8adb8', white: '#f1f2ea', pure: '#ffffff',
    skin: '#f2c79a', skinS: '#d9a473', hair: '#1d1b1f',
    olive: '#4f5a2e', oliveD: '#3a4322', oliveL: '#6f7b3f', khaki: '#b3a678', brown: '#6b4a2f', brownD: '#4a321f', brownL: '#8d6a45',
    red: '#c8323c', redD: '#8e1f28', blue: '#1f4fa0', navy: '#1d2b53', navyL: '#2f4486', yellow: '#f2c14e', orange: '#e57a2e',
    green: '#4f8a3c', greenD: '#2f5e2a', greenL: '#7fb554', concrete: '#b9b6ab', concreteD: '#8f8c82', cream: '#e8dfc4',
    sand: '#d9c08a', sandD: '#bfa46c', mud: '#6e5233', mudL: '#8a6a43', water: '#3d7bc4', waterD: '#2a5a96', waterL: '#7fb3e6',
  };
  const CAMO = {
    army: ['#5d6a3c', '#3e4728', '#7d7a52', '#2b2f22'],
    air: ['#5f6b74', '#3f4a52', '#808c94', '#2c333a'],
    marine: ['#6e6a44', '#43432e', '#8f8358', '#2e2e20'],
  };
  const SKY = {
    day: ['#5fa8e8', '#79b9ee', '#96caf3', '#b6dcf6', '#d3eaf8'],
    dusk: ['#2e2a58', '#5b3f72', '#a5566e', '#e0805f', '#f4b46a'],
    night: ['#080c22', '#0d1430', '#121c40', '#18244e', '#1e2c5a'],
    gray: ['#6f7a87', '#7d8794', '#8c96a2', '#9ca5b0', '#adb5be'],
    desert: ['#5fa6dc', '#7bb6e2', '#99c7e8', '#bcd8e8', '#e3e2cf'],
    winter: ['#8fb3d6', '#a1c0de', '#b4cde4', '#c7dbea', '#dae7f0'],
  };

  // ---------- 기본 도형 ----------
  const rect = (x, y, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const px = (x, y, c) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), 1, 1);
  };
  const ditherRow = (x, y, w, c1, c2) => {
    g.fillStyle = c2;
    for (let i = 0; i < w; i += 2) g.fillRect(x + i + (y & 1), y, 1, 1);
  };
  const text = (s, x, y, c = P.black, size = 10, align = 'center') => {
    g.font = `${size}px Galmuri9, Galmuri11, monospace`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.fillStyle = c;
    g.fillText(s, Math.round(x), Math.round(y));
  };

  function sky(kind, top = 0, bottom = 130) {
    const cs = SKY[kind] || SKY.day;
    const band = (bottom - top) / cs.length;
    for (let i = 0; i < cs.length; i++) {
      const y0 = Math.round(top + i * band);
      rect(0, y0, W, Math.ceil(band) + 1, cs[i]);
      if (i < cs.length - 1) {
        const yb = Math.round(top + (i + 1) * band) - 1;
        g.fillStyle = cs[i + 1];
        for (let x = 0; x < W; x += 2) g.fillRect(x + (yb & 1), yb, 1, 1);
      }
    }
  }
  function stars(seed, n, maxY, t) {
    for (let i = 0; i < n; i++) {
      const x = Math.floor(U.hash2(i, seed) * W);
      const y = Math.floor(U.hash2(seed, i) * maxY);
      const tw = t == null ? 1 : Math.sin(t * 2 + i) > -0.6;
      if (tw) px(x, y, i % 7 === 0 ? '#fff7c2' : '#dfe6ff');
    }
  }
  function moon(x, y) {
    rect(x - 3, y - 5, 7, 11, '#f4efc9');
    rect(x - 5, y - 3, 11, 7, '#f4efc9');
    rect(x - 4, y - 4, 9, 9, '#f4efc9');
    px(x + 1, y - 1, '#d9d3a6');
    px(x - 2, y + 2, '#d9d3a6');
  }
  function sun(x, y) {
    rect(x - 4, y - 6, 9, 13, '#fff1a8');
    rect(x - 6, y - 4, 13, 9, '#fff1a8');
    rect(x - 5, y - 5, 11, 11, '#fff1a8');
  }
  function ridge(seed, base, amp, color, f = 1, snowCap = null) {
    for (let x = 0; x < W; x++) {
      const n = Math.sin(x * 0.021 * f + seed) * 0.5 + Math.sin(x * 0.053 * f + seed * 2.3) * 0.32 + Math.sin(x * 0.13 * f + seed * 5.1) * 0.18;
      const h = Math.round(base - amp * (0.5 + 0.5 * n));
      rect(x, h, 1, H - h, color);
      if (snowCap) rect(x, h, 1, 2, snowCap);
    }
  }
  function cloud(x, y, c = '#ffffff') {
    rect(x, y, 22, 4, c);
    rect(x + 4, y - 3, 12, 3, c);
    rect(x + 8, y - 5, 6, 2, c);
    rect(x - 3, y + 2, 28, 3, c);
  }
  function pine(x, y, s, season) {
    const c1 = season === 'winter' ? '#2f4a3a' : '#2c5a33';
    const c2 = season === 'winter' ? '#3c5a48' : '#3a7040';
    rect(x - 1, y - 3, 2, 3, P.brownD);
    const th = s * 4;
    for (let j = 0; j < th; j++) {
      let w = 1 + Math.floor(j * 0.75) * 2;
      if (j % 4 === 0 && j > 0) w -= 2;
      rect(x - Math.floor(w / 2), y - 3 - th + j, w, 1, j % 4 < 2 ? c2 : c1);
    }
    if (season === 'winter') {
      for (let j = 0; j < th; j += 4) {
        const w = 1 + Math.floor(j * 0.75) * 2;
        rect(x - Math.floor(w / 2), y - 3 - th + j, w, 1, '#e8eef3');
      }
    }
  }
  const LEAF = {
    spring: ['#7fb554', '#9ccf6a', '#f2b8c6'],
    summer: ['#3f7d35', '#4f9440', '#2f6a2a'],
    autumn: ['#d4762c', '#e2a23a', '#b4452c'],
    winter: ['#6b5a4a', '#7a6a58', '#5a4a3a'],
  };
  function tree(x, y, r, season) {
    rect(x - 1, y - r - 2, 3, r + 2, P.brownD);
    const cs = LEAF[season] || LEAF.summer;
    if (season === 'winter') {
      rect(x - r, y - r * 2, 1, r, cs[0]);
      rect(x + r, y - r * 2 + 2, 1, r - 2, cs[0]);
      rect(x - r, y - r * 2, r * 2 + 1, 1, cs[1]);
      rect(x - 2, y - r * 2 - 2, 5, 2, cs[0]);
      return;
    }
    for (let j = -r; j <= r; j++) {
      const w = Math.round(Math.sqrt(r * r - j * j) * 1.2);
      rect(x - w, y - r * 2 - 2 + j + r, w * 2 + 1, 1, cs[(j + r) % 3 === 0 ? 1 : 0]);
    }
    if (season === 'spring') for (let i = 0; i < 6; i++) px(x - r + ((i * 7) % (r * 2)), y - r * 2 + ((i * 5) % r), cs[2]);
  }
  function taegukgi(x, y, t = 0, w = 13) {
    const h = Math.round(w * 2 / 3);
    for (let i = 0; i < w; i++) {
      const dy = t ? Math.round(Math.sin(t * 5 + i * 0.6) * 0.8) : 0;
      rect(x + i, y + dy, 1, h, '#f7f7f2');
    }
    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);
    rect(cx - 2, cy - 2, 4, 2, '#cd2e3a');
    rect(cx - 2, cy, 4, 2, '#0047a0');
    px(cx - 2, cy - 2, '#f7f7f2');
    px(cx + 1, cy + 1, '#f7f7f2');
    px(x + 1, y + 1, '#111');
    px(x + 2, y + 1, '#111');
    px(x + w - 3, y + 1, '#111');
    px(x + w - 2, y + 1, '#111');
    px(x + 1, y + h - 2, '#111');
    px(x + 2, y + h - 2, '#111');
    px(x + w - 3, y + h - 2, '#111');
    px(x + w - 2, y + h - 2, '#111');
  }
  function flagpole(x, y, h, t, kind = 'kr', col = P.red) {
    rect(x, y - h, 1, h, P.lgray);
    px(x, y - h - 1, P.yellow);
    if (kind === 'kr') taegukgi(x + 1, y - h + 1, t);
    else if (kind === 'un') {
      for (let i = 0; i < 12; i++) rect(x + 1 + i, y - h + 1 + Math.round(Math.sin(t * 5 + i * 0.6) * 0.8), 1, 8, '#5b92e5');
      rect(x + 5, y - h + 4, 3, 2, '#fff');
    } else if (kind === 'lb') {
      for (let i = 0; i < 12; i++) {
        const dy = Math.round(Math.sin(t * 5 + i * 0.6) * 0.8);
        rect(x + 1 + i, y - h + 1 + dy, 1, 2, '#d22');
        rect(x + 1 + i, y - h + 3 + dy, 1, 4, '#fff');
        rect(x + 1 + i, y - h + 7 + dy, 1, 2, '#d22');
      }
      rect(x + 6, y - h + 4, 2, 3, '#2a8a3a');
    } else {
      for (let i = 0; i < 12; i++) rect(x + 1 + i, y - h + 1 + Math.round(Math.sin(t * 5 + i * 0.6) * 0.8), 1, 8, col);
      rect(x + 5, y - h + 3, 3, 3, P.yellow);
    }
  }
  function windowsGrid(x, y, w, h, cols, rows, lit, frame = P.concreteD, glass = '#8fb6d6') {
    const cw = Math.floor(w / cols);
    const ch = Math.floor(h / rows);
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const on = lit && U.hash2(i + x, j + y) > 0.45;
        rect(x + i * cw + 1, y + j * ch + 1, cw - 2, ch - 2, on ? '#f6d77a' : glass);
        rect(x + i * cw + 1, y + j * ch + ch - 2, cw - 2, 1, frame);
      }
  }
  function sandbags(x, y, n, rows = 2) {
    for (let r = 0; r < rows; r++)
      for (let i = 0; i < n; i++) {
        const xx = x + i * 8 + (r % 2) * 4;
        const yy = y - r * 4;
        rect(xx, yy, 7, 4, '#a89466');
        rect(xx, yy + 3, 7, 1, '#7e6e4a');
        px(xx, yy, '#7e6e4a');
      }
  }
  function ground(season, y, base) {
    const c = season === 'winter' ? '#e6ecf0' : base || (season === 'autumn' ? '#9a8a4a' : season === 'spring' ? '#7aa452' : '#5f9440');
    rect(0, y, W, H - y, c);
    for (let i = 0; i < 70; i++) {
      const xx = Math.floor(U.hash2(i, y) * W);
      const yy = y + 2 + Math.floor(U.hash2(y, i) * (H - y - 2));
      px(xx, yy, season === 'winter' ? '#c9d3da' : 'rgba(0,0,0,0.18)');
    }
  }
  function sign(x, y, w, h, s, bg = '#1f3b2a', fg = '#f1f2ea', size = 10) {
    rect(x - 1, y - 1, w + 2, h + 2, P.black);
    rect(x, y, w, h, bg);
    text(s, x + w / 2, y + h / 2 + 1, fg, size);
  }

  // ---------- 인물 스프라이트 ----------
  // look: body(civil|camo|sailor|farmer|coat), camo, head(hair|buzz|cap|helmet|navycap|octa|drill|redcap|bluehelm|straw|long|gray),
  //       shirt, pants, rank(0~4), officer(0~3 다이아), nco(true), redtag, glasses, hairC, skin
  function person(x, y, look, pose = 'stand', t = 0, talking = false) {
    look = look || {};
    const skin = look.skin || P.skin;
    const hairC = look.hairC || P.hair;
    let yb = y;
    const walking = pose === 'walk' || pose === 'run';
    const fr = walking ? Math.floor(t * (pose === 'run' ? 10 : 6)) % 2 : 0;
    if (walking && fr) yb -= 1;
    if (pose === 'stand' || pose === 'salute') yb -= Math.sin(t * 2 + x) > 0.96 ? 1 : 0;
    const sit = pose === 'sit';
    if (sit) yb += 3;

    const camo = CAMO[look.camo || 'army'];
    const body = look.body || 'camo';
    const uni = (xx, yy) => {
      if (body === 'camo') return camo[Math.floor(U.hash2(xx - x + 50, yy - yb + 50, 7) * 4)];
      if (body === 'sailor') return P.navy;
      if (body === 'farmer') return '#8a6a3a';
      if (body === 'coat') return '#eef0f2';
      if (body === 'suit') return '#2b2f3a';
      return look.shirt || '#5a7fb0';
    };
    const pantsC = (xx, yy) => {
      if (body === 'camo') return camo[Math.floor(U.hash2(xx - x + 70, yy - yb + 70, 9) * 4)];
      if (body === 'sailor') return P.navy;
      if (body === 'coat') return '#4a5060';
      if (body === 'suit') return '#2b2f3a';
      return look.pants || '#3b4f7a';
    };

    // 다리
    if (!sit) {
      for (let r = 0; r < 4; r++) {
        const lUp = walking && fr === 0 && r === 3 ? 1 : 0;
        const rUp = walking && fr === 1 && r === 3 ? 1 : 0;
        for (let i = 0; i < 2; i++) {
          if (!lUp) px(x - 3 + i, yb - 6 + r, pantsC(x - 3 + i, yb - 6 + r));
          if (!rUp) px(x + 1 + i, yb - 6 + r, pantsC(x + 1 + i, yb - 6 + r));
        }
      }
      const boot = body === 'civil' || body === 'suit' ? '#2a2a2a' : '#141414';
      const lb = walking && fr === 0 ? 1 : 0;
      const rbb = walking && fr === 1 ? 1 : 0;
      rect(x - 4, yb - 2 - lb, 3, 2, boot);
      rect(x + 1, yb - 2 - rbb, 3, 2, boot);
      if (body === 'civil' && !look.boots) {
        rect(x - 4, yb - 1 - lb, 3, 1, '#e8e8e8');
        rect(x + 1, yb - 1 - rbb, 3, 1, '#e8e8e8');
      }
    } else {
      for (let i = -4; i < 4; i++) {
        px(x + i, yb - 6, pantsC(x + i, yb - 6));
        px(x + i, yb - 5, pantsC(x + i, yb - 5));
      }
      rect(x - 4, yb - 4, 3, 3, pantsC(x, yb));
      rect(x + 1, yb - 4, 3, 3, pantsC(x, yb));
      rect(x - 4, yb - 2, 3, 2, '#141414');
      rect(x + 1, yb - 2, 3, 2, '#141414');
    }
    // 몸통
    for (let r = 0; r < 7; r++)
      for (let i = -4; i < 4; i++) {
        let c = uni(x + i, yb - 13 + r);
        if (body === 'sailor' && r === 0 && i > -3 && i < 2) c = '#e8ecf2';
        if (body === 'sailor' && r === 1 && (i === -2 || i === 1)) c = '#e8ecf2';
        if (body === 'farmer' && r > 1 && i > -3 && i < 2) c = '#c9b07a';
        if (body === 'coat' && i === -1 && r > 0) c = '#cfd3d8';
        if (look.apron && r > 2 && i > -4 && i < 3) c = look.apron;
        px(x + i, yb - 13 + r, c);
      }
    if (body === 'camo' || body === 'sailor') rect(x - 4, yb - 7, 8, 1, body === 'sailor' ? '#141a33' : '#2a2a1e');
    if (body === 'suit') {
      rect(x - 1, yb - 13, 2, 4, '#fff');
      px(x - 1, yb - 12, P.red);
    }
    // 계급장(가슴 중앙): 병 계급 작대기 수
    if (look.rank && look.rank > 0) {
      rect(x - 2, yb - 12, 4, 3, look.body === 'sailor' ? '#c8b25a' : '#b8ad7c');
      for (let k = 0; k < look.rank; k++) px(x - 2 + k, yb - 11, P.black);
    }
    if (look.officer) {
      rect(x - 2, yb - 12, 4, 3, '#2a2a1e');
      for (let k = 0; k < look.officer; k++) px(x - 2 + k + (k > 1 ? 0 : 0), yb - 11, '#e8e8f0');
    }
    if (look.nco) {
      rect(x - 2, yb - 12, 4, 3, '#2a2a1e');
      px(x - 1, yb - 11, P.yellow);
      px(x, yb - 11, P.yellow);
    }
    if (look.redtag) rect(x + 1, yb - 10, 3, 1, P.red);
    if (look.un) rect(x - 4, yb - 11, 1, 2, '#5b92e5');

    // 팔
    const sleeve = (xx, yy) => (body === 'coat' ? '#eef0f2' : uni(xx, yy));
    if (pose === 'salute') {
      // 오른손 경례(화면 왼쪽)
      px(x - 5, yb - 13, sleeve(x - 5, yb - 13));
      px(x - 5, yb - 14, sleeve(x - 5, yb - 14));
      px(x - 5, yb - 15, sleeve(x - 5, yb - 15));
      px(x - 4, yb - 16, sleeve(x - 4, yb - 16));
      px(x - 4, yb - 17, skin);
      px(x - 3, yb - 18, skin);
    } else if (pose === 'cheer') {
      rect(x - 5, yb - 17, 1, 5, sleeve(x - 5, yb - 14));
      px(x - 5, yb - 18, skin);
      rect(x + 4, yb - 17, 1, 5, sleeve(x + 4, yb - 14));
      px(x + 4, yb - 18, skin);
    } else {
      const sw = walking ? (fr ? 1 : -1) : 0;
      rect(x - 5, yb - 13, 1, 5, sleeve(x - 5, yb - 12));
      px(x - 5, yb - 8 + (sw > 0 ? -1 : 0), skin);
      if (pose !== 'cheer') {
        rect(x + 4, yb - 13, 1, 5, sleeve(x + 4, yb - 12));
        px(x + 4, yb - 8 + (sw < 0 ? -1 : 0), skin);
      }
    }
    if (pose === 'shovel') {
      rect(x + 5, yb - 16, 1, 12, '#8d6a45');
      rect(x + 4, yb - 4, 3, 3, P.lgray);
    }
    if (pose === 'rifle') {
      rect(x + 5, yb - 18, 1, 13, '#222');
      px(x + 6, yb - 12, '#222');
    }
    // 머리
    rect(x - 3, yb - 19, 6, 6, skin);
    px(x - 3, yb - 14, skin);
    rect(x - 1, yb - 13, 2, 1, skin);
    // 눈
    const blink = Math.sin(t * 1.3 + x * 0.7) > 0.985;
    if (!blink) {
      px(x - 2, yb - 17, P.black);
      px(x + 1, yb - 17, P.black);
    }
    if (look.glasses) {
      rect(x - 3, yb - 17, 3, 1, '#555');
      rect(x, yb - 17, 3, 1, '#555');
      px(x - 2, yb - 17, '#cfe7ff');
      px(x + 1, yb - 17, '#cfe7ff');
    }
    if (look.tear) px(x - 2, yb - 16, '#7fc4ff');
    // 입
    if (talking && Math.floor(t * 8) % 2) rect(x - 1, yb - 15, 2, 1, '#a0523d');
    else rect(x - 1, yb - 15, 2, 1, P.skinS);

    // 머리 모양 / 모자
    const head = look.head || 'hair';
    const camoAt = (xx, yy) => camo[Math.floor(U.hash2(xx - x + 90, yy - yb + 90, 3) * 4)];
    if (head === 'hair') {
      rect(x - 3, yb - 20, 6, 2, hairC);
      px(x - 3, yb - 18, hairC);
      px(x + 2, yb - 18, hairC);
      rect(x - 2, yb - 21, 4, 1, hairC);
      px(x - 1, yb - 18, hairC);
    } else if (head === 'long' || head === 'gray') {
      const hc = head === 'gray' ? '#9a9a9a' : hairC;
      rect(x - 3, yb - 21, 6, 2, hc);
      rect(x - 4, yb - 20, 1, 7, hc);
      rect(x + 3, yb - 20, 1, 7, hc);
      px(x - 3, yb - 19, hc);
      px(x + 2, yb - 19, hc);
    } else if (head === 'buzz') {
      rect(x - 3, yb - 20, 6, 1, '#4a4a4a');
      px(x - 3, yb - 19, '#4a4a4a');
      px(x + 2, yb - 19, '#4a4a4a');
    } else if (head === 'cap' || head === 'drill' || head === 'redcap') {
      const cc = head === 'drill' ? (xx) => '#1a1a1a' : head === 'redcap' ? () => '#b3262e' : camoAt;
      for (let r = 0; r < 3; r++) for (let i = -4; i < 4; i++) px(x + i, yb - 22 + r, cc(x + i, yb - 22 + r));
      rect(x - 4, yb - 19, 9, 1, head === 'cap' ? camo[3] : '#111');
      if (head === 'drill') px(x - 1, yb - 21, P.yellow);
      if (head === 'redcap') {
        px(x - 1, yb - 21, P.yellow);
        px(x, yb - 21, P.yellow);
      }
    } else if (head === 'helmet' || head === 'bluehelm') {
      const hc = head === 'bluehelm' ? () => '#4f86d9' : camoAt;
      rect(x - 3, yb - 23, 6, 1, hc(x, yb - 23));
      for (let r = 0; r < 4; r++) for (let i = -4; i < 4; i++) px(x + i, yb - 22 + r, hc(x + i, yb - 22 + r));
      px(x - 5, yb - 19, hc(x, yb));
      px(x + 4, yb - 19, hc(x, yb));
      if (head === 'bluehelm') rect(x - 1, yb - 21, 2, 1, '#fff');
    } else if (head === 'navycap') {
      rect(x - 4, yb - 22, 8, 3, '#f4f6fa');
      rect(x - 3, yb - 23, 6, 1, '#f4f6fa');
      rect(x - 4, yb - 20, 8, 1, '#d8dde6');
    } else if (head === 'octa') {
      for (let r = 0; r < 3; r++) for (let i = -4; i < 5; i++) px(x + i, yb - 22 + r, camoAt(x + i, yb - 22 + r));
      rect(x - 5, yb - 23, 11, 1, camoAt(x, yb - 23));
      rect(x - 4, yb - 19, 9, 1, camo[3]);
      px(x, yb - 21, P.yellow);
    } else if (head === 'straw') {
      rect(x - 6, yb - 20, 13, 1, '#e3c46b');
      rect(x - 3, yb - 23, 7, 3, '#e3c46b');
      rect(x - 3, yb - 21, 7, 1, '#b3262e');
    }
    if (look.bag) {
      rect(x - 6, yb - 13, 2, 6, '#3e4728');
    }
  }

  function bubble(x, y, t, s = '...') {
    const w = s === '...' ? 13 : 9;
    rect(x - w / 2, y - 9, w, 8, '#fff');
    rect(x - w / 2 + 1, y - 10, w - 2, 1, '#fff');
    rect(x - w / 2 + 1, y - 1, w - 2, 1, '#fff');
    px(x - 1, y, '#fff');
    if (s === '...') {
      const n = Math.floor(t * 3) % 4;
      for (let i = 0; i < n; i++) px(x - 4 + i * 3, y - 5, P.black);
    } else {
      text(s, x, y - 5, s === '!' ? P.red : P.blue, 8);
    }
  }

  // 대열(여러 명) 그리기
  function formation(x0, y0, cols, rows, look, dx = 10, dy = 6, t = 0, pose = 'stand') {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) person(x0 + c * dx + (r % 2) * 2, y0 + r * dy, look, pose, t + c * 0.3 + r);
  }

  // ---------- 장면 ----------
  const SC = {};
  const seasonGround = (o) => o.season;

  SC.title = {
    outdoor: true,
    bg(o) {
      sky('night', 0, 140);
      stars(3, 60, 90);
      moon(250, 30);
      ridge(1.2, 110, 40, '#141c34', 0.8);
      ridge(3.4, 130, 34, '#0f162a', 1.2);
      // 철책
      rect(0, 140, W, 40, '#0b1020');
      for (let x = 0; x < W; x += 14) rect(x, 118, 1, 24, '#2a3350');
      for (let y = 120; y < 140; y += 5) rect(0, y, W, 1, '#222a44');
      for (let x = 0; x < W; x += 4) px(x, 117 + ((x / 4) % 2), '#3a4466');
    },
    fg(t, o) {
      stars(9, 25, 80, t);
      // 서치라이트
      const a = Math.sin(t * 0.5) * 0.6 - 1.57;
      g.save();
      g.globalAlpha = 0.12;
      g.fillStyle = '#fff6c0';
      g.beginPath();
      g.moveTo(40, 140);
      g.lineTo(40 + Math.cos(a - 0.08) * 260, 140 + Math.sin(a - 0.08) * 260);
      g.lineTo(40 + Math.cos(a + 0.08) * 260, 140 + Math.sin(a + 0.08) * 260);
      g.fill();
      g.restore();
      rect(36, 128, 9, 12, '#1a2238');
      px(40, 131, '#ffe27a');
    },
  };

  SC.home = {
    bg(o) {
      rect(0, 0, W, 132, '#e9dcc0');
      for (let x = 0; x < W; x += 8) rect(x, 0, 1, 132, '#e1d2b2');
      rect(0, 128, W, 4, '#b48a5a');
      rect(0, 132, W, 48, '#a0714a');
      for (let y = 136; y < H; y += 8) rect(0, y, W, 1, '#8a5f3c');
      for (let i = 0; i < 20; i++) rect((i * 37) % W, 132 + ((i * 13) % 44), 1, 4, '#8a5f3c');
      // 창문
      const wx = 20;
      const wy = 26;
      rect(wx - 3, wy - 3, 86, 68, '#f7f1e2');
      g.save();
      g.beginPath();
      g.rect(wx, wy, 80, 62);
      g.clip();
      sky(o.night ? 'night' : o.season === 'winter' ? 'winter' : 'day', wy, wy + 62);
      if (o.night) stars(5, 14, wy + 30);
      for (let i = 0; i < 4; i++) {
        rect(wx + i * 21, wy + 28 - (i % 2) * 8, 16, 40, i % 2 ? '#c7c2b8' : '#b5b0a6');
        windowsGrid(wx + i * 21, wy + 30 - (i % 2) * 8, 16, 32, 3, 6, o.night);
      }
      g.restore();
      rect(wx + 39, wy, 2, 62, '#f7f1e2');
      rect(wx - 6, wy - 6, 14, 74, '#c0a0c8');
      rect(wx + 74, wy - 6, 14, 74, '#c0a0c8');
      for (let y = wy - 6; y < wy + 68; y += 4) {
        px(wx - 2, y, '#a888b0');
        px(wx + 80, y, '#a888b0');
      }
      // 달력
      rect(122, 30, 30, 34, '#ffffff');
      rect(122, 30, 30, 9, P.red);
      text(`${o.month || 1}월`, 137, 35, '#fff', 8);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) rect(125 + i * 5, 43 + j * 6, 3, 3, '#cfcfcf');
      if (o.circle) rect(129, 48, 5, 5, P.red);
      // 포스터
      rect(170, 28, 26, 36, '#2b3a55');
      rect(174, 34, 18, 12, '#e57a2e');
      rect(174, 50, 18, 2, '#fff');
      rect(174, 54, 12, 2, '#fff');
      // 책상
      rect(206, 104, 62, 5, '#7a5233');
      rect(208, 109, 3, 24, '#5d3e26');
      rect(262, 109, 3, 24, '#5d3e26');
      rect(222, 82, 30, 20, '#22252e');
      rect(224, 84, 26, 15, o.night ? '#4f7fd6' : '#2c3550');
      rect(234, 102, 6, 2, '#22252e');
      rect(256, 92, 2, 12, '#888');
      rect(252, 90, 8, 3, '#e8d36a');
      // 침대
      rect(270, 118, 50, 16, '#5a7fb0');
      rect(270, 112, 12, 8, '#f2f2f2');
      rect(270, 134, 50, 3, '#5d3e26');
    },
    fg(t, o) {
      if (o.letter) {
        const b = Math.sin(t * 4) > 0 ? 0 : 1;
        rect(230, 96 + b, 14, 9, '#f4ead2');
        rect(230, 96 + b, 14, 1, '#bfae86');
        px(236, 100 + b, P.red);
        px(237, 100 + b, P.red);
      }
      if (o.night) {
        g.save();
        g.globalAlpha = 0.08 + Math.sin(t * 9) * 0.02;
        rect(212, 80, 50, 40, '#9cc2ff');
        g.restore();
      }
    },
  };

  SC.street = {
    outdoor: true,
    bg(o) {
      sky(o.night ? 'night' : o.season === 'winter' ? 'winter' : 'day', 0, 120);
      if (o.night) stars(2, 30, 60);
      else {
        cloud(40, 20);
        cloud(200, 34);
      }
      const bc = ['#cfc8b8', '#bdb6a6', '#d9d2c2', '#c4bba8'];
      for (let i = 0; i < 6; i++) {
        const bx = i * 56 - 6;
        const bh = 60 + ((i * 17) % 30);
        rect(bx, 118 - bh, 44, bh, bc[i % 4]);
        windowsGrid(bx + 3, 122 - bh, 38, bh - 10, 5, Math.floor((bh - 10) / 8), o.night);
        text(`${101 + i}동`, bx + 22, 124 - bh + 4, '#6b6458', 8);
      }
      rect(0, 108, W, 32, '#d8d2c4');
      const shops = [
        ['편의점', '#2f8a4a'],
        ['미용실', '#b04a7a'],
        ['치킨', '#e08a1e'],
        ['PC방', '#3a4f9a'],
      ];
      shops.forEach((s, i) => {
        const sx = 6 + i * 80;
        rect(sx, 108, 70, 30, '#efe9dc');
        sign(sx + 4, 110, 62, 9, s[0], s[1], '#fff', 8);
        rect(sx + 6, 121, 40, 17, o.night ? '#f2dc8a' : '#9fc2d8');
        rect(sx + 50, 122, 14, 16, '#5a4a3a');
      });
      rect(0, 138, W, 10, '#b7b2a8');
      for (let x = 0; x < W; x += 10) rect(x, 138, 1, 10, '#a29d93');
      rect(0, 148, W, 32, '#4a4d55');
      for (let x = 4; x < W; x += 30) rect(x, 163, 14, 2, '#e8e8e8');
      // 버스정류장
      rect(250, 120, 2, 28, '#555');
      rect(244, 118, 40, 3, '#2a6ab0');
      sign(256, 124, 24, 8, '버스', '#2a6ab0', '#fff', 7);
    },
    fg(t, o) {
      for (let i = 0; i < 6; i++) rect(96 + 50, 121 + ((i * 3 + Math.floor(t * 8)) % 17), 2, 1, i % 2 ? P.red : '#fff');
      const cx = ((t * 40) % (W + 80)) - 40;
      rect(cx, 152, 30, 9, '#c84a3a');
      rect(cx + 5, 148, 18, 5, '#9fc2d8');
      rect(cx + 3, 160, 5, 3, '#111');
      rect(cx + 21, 160, 5, 3, '#111');
    },
  };

  SC.barber = {
    bg(o) {
      rect(0, 0, W, 140, '#f0ece4');
      rect(0, 140, W, 40, '#d0c7b5');
      for (let x = 0; x < W; x += 16) for (let y = 140; y < H; y += 16) rect(x + ((y / 16) % 2) * 8, y, 8, 8, '#c4baa6');
      rect(110, 24, 100, 70, '#b9d3e0');
      rect(108, 22, 104, 2, '#8a8a8a');
      rect(108, 94, 104, 2, '#8a8a8a');
      for (let i = 0; i < 6; i++) rect(118 + i * 14, 30 + i * 6, 6, 1, '#dbeaf2');
      rect(100, 98, 120, 8, '#e0d6c4');
      rect(140, 112, 40, 6, '#222');
      rect(156, 118, 8, 22, '#555');
      rect(146, 138, 28, 3, '#555');
      sign(20, 30, 60, 14, '미용실', '#b04a7a', '#fff', 10);
    },
    fg(t, o) {
      if (o.cut)
        for (let i = 0; i < 10; i++) {
          const yy = 100 + ((t * 30 + i * 13) % 40);
          px(150 + ((i * 7) % 22), yy, '#1d1b1f');
        }
    },
  };

  SC.gate = {
    outdoor: true,
    bg(o) {
      sky(o.night ? 'night' : o.season === 'winter' ? 'winter' : 'day', 0, 110);
      if (!o.night) {
        cloud(30, 22);
        cloud(230, 14);
      }
      ridge(2.2, 92, 30, o.season === 'winter' ? '#8a9aa6' : '#557a4a', 1, o.season === 'winter' ? '#eef2f5' : null);
      ridge(4.1, 104, 20, o.season === 'winter' ? '#6c7c88' : '#3f6a3c');
      ground(o.season, 128, '#7a8a5a');
      rect(0, 140, W, 40, '#8b8a86');
      for (let x = 0; x < W; x += 24) rect(x, 140, 1, 40, '#7a7975');
      // 담장
      rect(0, 108, 110, 26, '#d8d2c0');
      rect(210, 108, 110, 26, '#d8d2c0');
      rect(0, 106, 110, 3, '#4f6a3c');
      rect(210, 106, 110, 3, '#4f6a3c');
      for (let x = 4; x < 110; x += 12) {
        pine(x + 2, 108, 3, o.season);
        pine(214 + x, 108, 3, o.season);
      }
      // 정문
      rect(112, 70, 14, 64, '#cfc6ad');
      rect(194, 70, 14, 64, '#cfc6ad');
      rect(106, 62, 108, 14, '#3a4a2e');
      rect(106, 60, 108, 2, P.yellow);
      text(o.sign || '연무대', 160, 69, '#f6f0d8', 10);
      rect(114, 74, 10, 4, '#b3a98d');
      rect(196, 74, 10, 4, '#b3a98d');
      // 초소
      rect(84, 112, 16, 22, '#e8e2d0');
      rect(82, 110, 20, 3, '#3a4a2e');
      rect(88, 116, 8, 6, '#9fc2d8');
      rect(220, 112, 16, 22, '#e8e2d0');
      rect(218, 110, 20, 3, '#3a4a2e');
      rect(224, 116, 8, 6, '#9fc2d8');
      if (o.banner) sign(128, 80, 64, 11, o.banner, '#a33a3a', '#fff', 7);
    },
    fg(t, o) {
      flagpole(58, 108, 40, t, 'kr');
      flagpole(250, 108, 40, t, 'unit', o.flagColor || '#3a5a9a');
    },
  };

  SC.parade = {
    outdoor: true,
    bg(o) {
      sky(o.night ? 'night' : o.season === 'winter' ? 'winter' : 'day', 0, 100);
      if (!o.night) cloud(250, 18);
      ridge(1.7, 70, 26, o.season === 'winter' ? '#8a9aa6' : '#5c8050', 1, o.season === 'winter' ? '#eef2f5' : null);
      // 막사
      for (let i = 0; i < 3; i++) {
        const bx = 8 + i * 108;
        rect(bx, 56, 90, 44, '#e3dccb');
        rect(bx - 2, 52, 94, 5, '#4f6a3c');
        windowsGrid(bx + 4, 60, 82, 36, 8, 3, o.night, '#a8a08c', '#7f9fb5');
      }
      ground(o.season, 100, '#c2a878');
      if (o.season !== 'winter') for (let i = 0; i < 80; i++) px(Math.floor(U.hash2(i, 5) * W), 100 + Math.floor(U.hash2(5, i) * 80), '#a88f62');
      // 사열대
      rect(126, 82, 68, 22, '#cfc6ad');
      rect(122, 76, 76, 7, '#3a4a2e');
      rect(130, 88, 60, 8, '#a33a3a');
      text(o.banner || '필승', 160, 92, '#fff', 8);
    },
    fg(t, o) {
      flagpole(116, 104, 40, t, 'kr');
      flagpole(204, 104, 36, t, 'unit', o.flagColor || '#3a5a9a');
      if (o.formation) {
        const lk = o.formation;
        formation(28, 126, 8, 3, lk, 11, 10, t, o.formationPose || 'stand');
        formation(214, 126, 8, 3, lk, 11, 10, t + 2, o.formationPose || 'stand');
      }
    },
  };

  SC.barracks = {
    bg(o) {
      const n = o.night;
      rect(0, 0, W, 126, n ? '#3c4438' : '#dfe6d3');
      rect(0, 0, W, 6, n ? '#2c3328' : '#c8d2bb');
      rect(0, 126, W, 54, n ? '#4a4234' : '#9a8c74');
      for (let x = 0; x < W; x += 20) rect(x, 126, 1, 54, n ? '#3e372b' : '#8a7c64');
      // 관물대
      for (let i = 0; i < 6; i++) {
        const lx = 6 + i * 52;
        rect(lx, 40, 44, 66, n ? '#4b4a3e' : '#b9a27a');
        rect(lx + 2, 42, 40, 30, n ? '#3f3e33' : '#a58e66');
        rect(lx + 2, 74, 40, 30, n ? '#3f3e33' : '#a58e66');
        rect(lx + 20, 56, 1, 6, '#5a4a32');
        rect(lx + 6, 44, 14, 4, n ? '#666' : '#efe9d8');
      }
      // 창문
      rect(124, 10, 72, 26, n ? '#101836' : '#9fc6e6');
      if (n) stars(8, 8, 30);
      rect(159, 10, 2, 26, '#e8e8e0');
      // 시계 & 액자
      rect(40, 14, 12, 12, '#fff');
      rect(45, 16, 1, 5, '#222');
      rect(45, 20, 4, 1, '#222');
      sign(230, 14, 60, 12, o.motto || '생활관 수칙', '#2f4a2a', '#fff', 8);
      // 침대
      for (let i = 0; i < 4; i++) {
        const bx = 4 + i * 82;
        rect(bx, 112, 70, 14, n ? '#3a4a30' : '#5f7a3e');
        rect(bx, 108, 16, 6, n ? '#9a9a90' : '#f0f0e6');
        rect(bx, 126, 70, 3, '#5a4632');
        rect(bx + 2, 129, 2, 6, '#5a4632');
        rect(bx + 66, 129, 2, 6, '#5a4632');
      }
      if (o.tv) {
        rect(276, 40, 0, 0, '#000');
      }
    },
    fg(t, o) {
      if (o.phone) {
        g.save();
        g.globalAlpha = 0.25 + Math.sin(t * 6) * 0.05;
        rect(0, 0, W, H, '#0a0f28');
        g.restore();
      }
    },
  };

  SC.range = {
    outdoor: true,
    bg(o) {
      sky(o.season === 'winter' ? 'winter' : 'day', 0, 90);
      cloud(60, 20);
      ridge(2.9, 66, 22, o.season === 'winter' ? '#90a0aa' : '#5f8a4f', 1.1, o.season === 'winter' ? '#eef2f5' : null);
      rect(0, 70, W, 20, '#8a6a43');
      for (let x = 0; x < W; x += 3) px(x, 70 + (x % 5), '#6e5233');
      ground(o.season, 88, '#7aa452');
      // 사로
      for (let i = 0; i < 9; i++) rect(i * 40, 88, 1, 92, 'rgba(255,255,255,0.35)');
      // 표적(실루엣) 원근
      const tg = (x, y, s) => {
        rect(x - s, y - s * 2, s * 2, s * 2, '#2f4a2a');
        rect(x - Math.ceil(s / 2), y - s * 3, s, s, '#2f4a2a');
      };
      for (let i = 0; i < 8; i++) {
        tg(20 + i * 40, 74, 2);
        tg(30 + i * 40, 92, 3);
        tg(14 + i * 40, 112, 4);
      }
      sandbags(0, 166, 42, 3);
    },
    fg(t, o) {
      flagpole(300, 80, 30, t, 'unit', P.red);
      if (o.firing && Math.sin(t * 13) > 0.7) {
        const i = Math.floor(t * 3) % 8;
        rect(26 + i * 40, 150, 3, 2, '#ffe27a');
      }
    },
  };

  SC.gas = {
    outdoor: true,
    bg(o) {
      sky('gray', 0, 100);
      ridge(1.1, 80, 22, '#5d7058');
      ground(o.season, 128, '#6a8a4a');
      rect(70, 66, 150, 62, P.concrete);
      rect(66, 62, 158, 6, P.concreteD);
      rect(130, 92, 30, 36, '#2a2a2a');
      rect(132, 94, 26, 34, '#141414');
      sign(84, 74, 40, 12, '화생방', '#e3b52c', '#111', 8);
      rect(176, 74, 10, 10, '#e3b52c');
      px(181, 77, '#111');
      px(181, 79, '#111');
      px(181, 80, '#111');
      for (let x = 0; x < W; x += 12) rect(x, 118, 1, 14, '#777');
      rect(0, 120, 66, 1, '#777');
      rect(224, 120, 96, 1, '#777');
    },
    fg(t, o) {
      g.save();
      g.globalAlpha = 0.35;
      for (let i = 0; i < 9; i++) {
        const k = (t * 0.25 + i / 9) % 1;
        const xx = 145 + Math.sin(i * 2.1 + t) * 20 * k;
        const yy = 110 - k * 60;
        rect(xx - 4 - k * 8, yy, 8 + k * 16, 5, '#b7e07a');
      }
      g.restore();
    },
  };

  SC.field = {
    outdoor: true,
    bg(o) {
      sky(o.night ? 'night' : o.season === 'winter' ? 'winter' : 'day', 0, 100);
      if (o.night) stars(4, 30, 60);
      ridge(1.9, 74, 30, o.season === 'winter' ? '#8a9aa6' : '#4f7a46', 1, o.season === 'winter' ? '#eef2f5' : null);
      ridge(3.7, 92, 18, o.season === 'winter' ? '#74848f' : '#3c6236');
      ground(o.season, 108);
      for (let i = 0; i < 9; i++) pine(10 + i * 37, 108, 3 + (i % 3), o.season);
      if (o.variant === 'yugyeok') {
        rect(220, 50, 4, 70, '#6b4a2f');
        rect(300, 50, 4, 70, '#6b4a2f');
        for (let x = 222; x < 302; x += 2) px(x, 54 + Math.round(Math.sin((x - 222) / 25) * 3), '#c9b07a');
        sign(18, 60, 70, 14, '유격장', '#2a2a2a', P.yellow, 10);
      } else if (o.variant === 'trench') {
        rect(0, 140, W, 10, '#5a4632');
        sandbags(0, 136, 40, 2);
      } else {
        const tent = (x, y) => {
          for (let r = 0; r < 18; r++) rect(x - r, y - 18 + r, r * 2 + 1, 1, r % 4 === 0 ? '#3e4728' : '#5d6a3c');
          rect(x - 3, y - 8, 6, 8, '#222');
          if (o.season === 'winter') rect(x - 8, y - 16, 16, 2, '#f0f4f6');
        };
        tent(60, 128);
        tent(120, 124);
        tent(250, 128);
        rect(170, 96, 60, 2, '#3e4728');
        for (let x = 170; x < 230; x += 3) px(x, 98 + (x % 2), '#5d6a3c');
      }
    },
    fg(t, o) {
      if (o.season === 'winter' && o.variant !== 'yugyeok' && o.variant !== 'trench') {
        g.save();
        g.globalAlpha = 0.4;
        for (let i = 0; i < 5; i++) {
          const k = (t * 0.3 + i / 5) % 1;
          rect(118 + Math.sin(t + i) * 3, 104 - k * 30, 3 + k * 4, 2, '#cfd6db');
        }
        g.restore();
      }
    },
  };

  SC.march = {
    outdoor: true,
    charScale: 1,
    bg(o) {
      sky(o.night ? 'night' : 'dusk', 0, 120);
      if (o.night) {
        stars(6, 70, 80);
        moon(60, 26);
      } else sun(250, 70);
      ridge(2.5, 96, 34, o.night ? '#151d36' : '#4b3b5a', 0.9);
      ridge(5.2, 112, 22, o.night ? '#0f1528' : '#3a2e48', 1.4);
      rect(0, 128, W, 52, o.season === 'winter' ? '#c8d0d6' : o.night ? '#2a2e26' : '#5a5e40');
      rect(0, 138, W, 22, o.night ? '#3a3a40' : '#6e6a64');
    },
    fg(t, o) {
      const off = (t * 22) % 40;
      for (let i = -1; i < 9; i++) rect(i * 40 - off, 148, 16, 1, '#c8c8c0');
      for (let i = -1; i < 7; i++) pine(i * 56 - ((t * 30) % 56), 134, 3, o.season);
      const look = o.formation;
      if (look) for (let i = 0; i < 7; i++) if (i !== 3) person(30 + i * 40, 160, look, 'walk', t + i * 0.37);
      if (o.km != null) sign(250, 112, 50, 12, `${o.km}km`, '#2a6ab0', '#fff', 9);
    },
  };

  SC.office = {
    bg(o) {
      rect(0, 0, W, 130, '#e6e2d3');
      rect(0, 126, W, 4, '#8f8c82');
      rect(0, 130, W, 50, '#9a958a');
      for (let x = 0; x < W; x += 24) rect(x, 130, 1, 50, '#8a857a');
      rect(20, 20, 70, 44, '#f8f8f8');
      rect(18, 18, 74, 2, '#999');
      text(o.board || '주간 일정', 55, 28, '#2a4a9a', 8);
      for (let i = 0; i < 4; i++) rect(26, 38 + i * 6, 40 + ((i * 13) % 18), 1, '#888');
      rect(220, 16, 76, 40, o.night ? '#121a3a' : '#a9cde8');
      rect(257, 16, 2, 40, '#ddd');
      taegukgi(110, 22, 0, 16);
      rect(118, 33, 1, 30, '#b8a060');
      rect(140, 22, 16, 11, '#3a5a9a');
      rect(146, 25, 4, 4, P.yellow);
      rect(148, 33, 1, 30, '#b8a060');
      const desk = (x) => {
        rect(x, 104, 70, 6, '#7a6a52');
        rect(x + 2, 110, 4, 20, '#5a4a32');
        rect(x + 64, 110, 4, 20, '#5a4a32');
        rect(x + 22, 84, 26, 18, '#22252e');
        rect(x + 24, 86, 22, 13, '#2c4a7a');
      };
      desk(20);
      desk(220);
      rect(170, 60, 30, 66, '#7a7a72');
      for (let i = 0; i < 4; i++) rect(172, 64 + i * 15, 26, 1, '#5a5a52');
    },
    fg(t, o) {
      g.save();
      g.globalAlpha = 0.15 + Math.sin(t * 7) * 0.05;
      rect(44, 86, 22, 13, '#9cc2ff');
      rect(244, 86, 22, 13, '#9cc2ff');
      g.restore();
    },
  };

  SC.clinic = {
    bg(o) {
      rect(0, 0, W, 130, '#eef2f0');
      rect(0, 130, W, 50, '#c8d0cc');
      sign(130, 14, 60, 14, '의무대', '#2a7a4a', '#fff', 10);
      rect(150, 34, 20, 6, '#2a9a5a');
      rect(157, 30, 6, 14, '#2a9a5a');
      for (let i = 0; i < 3; i++) {
        const bx = 20 + i * 100;
        rect(bx, 112, 70, 12, '#f8f8f8');
        rect(bx, 108, 18, 6, '#ffffff');
        rect(bx, 124, 70, 3, '#9aa');
        rect(bx + 80, 60, 2, 66, '#bbb');
        rect(bx + 74, 60, 14, 2, '#bbb');
      }
    },
    fg() {},
  };

  SC.mess = {
    bg(o) {
      rect(0, 0, W, 120, '#efe6d2');
      rect(0, 120, W, 60, '#b8ae98');
      for (let x = 0; x < W; x += 16) for (let y = 120; y < H; y += 16) rect(x + ((y / 16) % 2) * 8, y, 8, 8, '#aca28c');
      sign(100, 10, 120, 16, o.menu || '오늘의 메뉴', '#2a4a2a', '#fff', 9);
      rect(0, 60, W, 30, '#c9c2b0');
      rect(0, 88, W, 6, '#9a9384');
      for (let i = 0; i < 6; i++) {
        rect(20 + i * 50, 64, 30, 16, '#d8d8d8');
        rect(22 + i * 50, 66, 26, 4, '#ffffff');
      }
      for (let i = 0; i < 2; i++) {
        rect(10 + i * 160, 140, 140, 8, '#c49a6a');
        rect(10 + i * 160, 148, 140, 2, '#8a6a43');
        for (let k = 0; k < 5; k++) {
          rect(18 + i * 160 + k * 26, 141, 18, 6, '#c8ccd0');
          px(22 + i * 160 + k * 26, 143, '#fff');
          px(28 + i * 160 + k * 26, 143, '#c8323c');
        }
      }
    },
    fg(t) {
      g.save();
      g.globalAlpha = 0.3;
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.5 + i / 6) % 1;
        rect(30 + i * 50 + Math.sin(t * 2 + i) * 2, 60 - k * 20, 4, 3, '#ffffff');
      }
      g.restore();
    },
  };

  SC.px = {
    bg(o) {
      rect(0, 0, W, 130, '#f2efe6');
      rect(0, 130, W, 50, '#cfc8b8');
      sign(120, 8, 80, 16, 'PX', '#2a4a9a', '#fff', 12);
      const cs = ['#e04a3a', '#f2c14e', '#3a8ae0', '#4fb05a', '#e07ab0', '#8a5ae0', '#f08a3a'];
      for (let s = 0; s < 3; s++) {
        const sx = 10 + s * 70;
        rect(sx, 34, 60, 86, '#b8b0a0');
        for (let r = 0; r < 4; r++) {
          rect(sx, 50 + r * 18, 60, 2, '#8a8478');
          for (let i = 0; i < 10; i++) rect(sx + 2 + i * 6, 38 + r * 18, 4, 11, cs[(i + r + s) % cs.length]);
        }
      }
      rect(226, 40, 84, 80, '#9cc6dc');
      rect(228, 42, 80, 76, '#cfe8f4');
      for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) rect(232 + k * 12, 48 + i * 18, 9, 12, cs[(i * 3 + k) % cs.length]);
      text('냉동', 268, 36, '#2a4a9a', 8);
    },
    fg(t) {
      g.save();
      g.globalAlpha = 0.1 + Math.sin(t * 2) * 0.05;
      rect(228, 42, 80, 76, '#ffffff');
      g.restore();
    },
  };

  SC.gop = {
    outdoor: true,
    bg(o) {
      sky('night', 0, 120);
      stars(11, 90, 90);
      moon(270, 22);
      ridge(1.4, 86, 36, '#101830', 0.9);
      ridge(2.9, 104, 24, '#0c1226', 1.3);
      rect(0, 118, W, 62, o.season === 'winter' ? '#5a6470' : '#1b2418');
      rect(0, 150, W, 30, o.season === 'winter' ? '#6c7682' : '#2a2a22');
      // 철책
      for (let x = 0; x < W; x += 16) rect(x, 96, 2, 50, '#5a6070');
      for (let y = 100; y < 146; y += 6) rect(0, y, W, 1, '#3c4250');
      for (let x = 0; x < W; x += 3) {
        px(x, 92 + Math.round(Math.sin(x * 0.7) * 2), '#7a8090');
        px(x, 95 + Math.round(Math.cos(x * 0.7) * 2), '#7a8090');
      }
      // 초소
      rect(260, 78, 36, 40, '#3a4232');
      rect(256, 74, 44, 6, '#2a3024');
      rect(266, 86, 24, 8, '#0a0e1a');
      rect(262, 118, 4, 30, '#2a3024');
      rect(290, 118, 4, 30, '#2a3024');
      sign(20, 152, 64, 10, '경계근무', '#2a3024', P.yellow, 8);
    },
    fg(t, o) {
      stars(13, 30, 70, t);
      const a = Math.sin(t * 0.4) * 0.9 - 2.4;
      g.save();
      g.globalAlpha = 0.14;
      g.fillStyle = '#fff6c0';
      g.beginPath();
      g.moveTo(278, 84);
      g.lineTo(278 + Math.cos(a - 0.1) * 300, 84 + Math.sin(a - 0.1) * 300 * 0.25);
      g.lineTo(278 + Math.cos(a + 0.1) * 300, 84 + Math.sin(a + 0.1) * 300 * 0.25);
      g.fill();
      g.restore();
      rect(272, 88, 3, 3, '#ffe27a');
      if (o.boar) {
        const bx = 40 + ((t * 20) % 200);
        rect(bx, 108, 14, 7, '#1a1410');
        rect(bx + 12, 110, 5, 4, '#1a1410');
        rect(bx + 1, 115, 2, 3, '#1a1410');
        rect(bx + 10, 115, 2, 3, '#1a1410');
        px(bx + 15, 111, '#ff5a3a');
      }
    },
  };

  SC.unitgate = {
    outdoor: true,
    bg(o) {
      const k = o.night ? 'night' : o.dusk ? 'dusk' : o.season === 'winter' ? 'winter' : 'day';
      sky(k, 0, 110);
      if (o.night) stars(6, 40, 70);
      else cloud(70, 24);
      ridge(3.3, 86, 34, o.season === 'winter' ? '#8a9aa6' : '#4f7a46', 1, o.season === 'winter' ? '#eef2f5' : null);
      ground(o.season, 120, '#6f8f4a');
      rect(0, 136, W, 44, '#7d7b77');
      rect(0, 104, 120, 34, '#d8d2c0');
      rect(200, 104, 120, 34, '#d8d2c0');
      rect(0, 102, 120, 3, '#3a4a2e');
      rect(200, 102, 120, 3, '#3a4a2e');
      text(o.slogan || '필승! 상승의 기상', 60, 118, '#3a4a2e', 8);
      rect(120, 72, 10, 66, '#cfc6ad');
      rect(190, 72, 10, 66, '#cfc6ad');
      rect(116, 64, 88, 12, '#3a4a2e');
      text(o.sign || '부대', 160, 70, '#f6f0d8', 9);
      rect(214, 110, 22, 28, '#e8e2d0');
      rect(212, 106, 26, 5, '#3a4a2e');
      rect(219, 116, 12, 8, '#9fc2d8');
      text('위병소', 225, 130, '#3a4a2e', 7);
    },
    fg(t, o) {
      const open = o.open ? -1.2 : 0;
      g.save();
      g.translate(132, 126);
      g.rotate(open);
      for (let i = 0; i < 54; i += 6) {
        g.fillStyle = (i / 6) % 2 ? '#fff' : P.red;
        g.fillRect(i, -1, 6, 3);
      }
      g.restore();
      flagpole(250, 104, 40, t, 'kr');
      if (o.fireworks) {
        for (let i = 0; i < 4; i++) {
          const k = (t * 0.6 + i * 0.27) % 1;
          const cx = 50 + i * 72;
          const cy = 30 + (i % 2) * 14;
          const cs = ['#ff6a6a', '#ffd76a', '#6affc4', '#9a8aff'];
          for (let a = 0; a < 12; a++) {
            const ang = (a / 12) * Math.PI * 2;
            px(cx + Math.cos(ang) * k * 22, cy + Math.sin(ang) * k * 22 + k * k * 6, cs[i]);
          }
        }
      }
    },
  };

  SC.classroom = {
    bg(o) {
      rect(0, 0, W, 130, '#ece6d4');
      rect(0, 130, W, 50, '#a8957a');
      rect(60, 14, 200, 70, '#2f4a3a');
      rect(56, 10, 208, 4, '#8a6a43');
      rect(56, 84, 208, 4, '#8a6a43');
      const lines = String(o.board || '').split('\n');
      lines.forEach((l, i) => text(l, 160, 30 + i * 14, '#e8f0e0', 10));
      for (let r = 0; r < 2; r++)
        for (let c = 0; c < 5; c++) {
          rect(14 + c * 62, 132 + r * 22, 50, 6, '#7a6248');
          rect(18 + c * 62, 138 + r * 22, 3, 10, '#5a4632');
          rect(58 + c * 62, 138 + r * 22, 3, 10, '#5a4632');
        }
      taegukgi(20, 20, 0, 16);
    },
    fg() {},
  };

  SC.ship = {
    outdoor: true,
    bg(o) {
      sky(o.night ? 'night' : o.storm ? 'gray' : 'day', 0, 80);
      if (o.night) stars(7, 40, 60);
      else {
        cloud(40, 18);
        cloud(210, 28);
      }
      rect(0, 80, W, 100, '#2a5a96');
      for (let y = 80; y < 120; y += 4) ditherRow(0, y, W, '#2a5a96', '#3d7bc4');
    },
    fg(t, o) {
      const sway = Math.round(Math.sin(t * 1.2) * (o.storm ? 3 : 1));
      for (let i = 0; i < 30; i++) {
        const xx = (i * 37 + t * 14 * (i % 3 + 1)) % W;
        rect(xx, 84 + (i % 9) * 4 + sway, 6, 1, '#7fb3e6');
      }
      // 갑판
      g.save();
      g.translate(0, sway);
      rect(0, 132, W, 48, '#8c9298');
      rect(0, 130, W, 3, '#5a6066');
      for (let x = 0; x < W; x += 12) rect(x, 120, 1, 11, '#c8cdd2');
      rect(0, 120, W, 1, '#c8cdd2');
      rect(0, 125, W, 1, '#c8cdd2');
      // 함포/마스트
      rect(30, 108, 26, 14, '#a7adb3');
      rect(56, 112, 30, 3, '#7d838a');
      rect(240, 60, 40, 72, '#a7adb3');
      rect(236, 56, 48, 5, '#7d838a');
      rect(258, 30, 3, 28, '#7d838a');
      rect(250, 34, 20, 2, '#7d838a');
      rect(246, 70, 28, 8, '#20324a');
      flagpole(290, 58, 22, t, 'kr');
      g.restore();
      if (!o.night)
        for (let i = 0; i < 2; i++) {
          const gx = (t * 18 + i * 140) % (W + 40) - 20;
          const gy = 30 + i * 12 + Math.sin(t * 3 + i) * 3;
          px(gx, gy, '#fff');
          px(gx - 1, gy - 1, '#fff');
          px(gx + 1, gy - 1, '#fff');
        }
    },
  };

  SC.port = {
    outdoor: true,
    bg(o) {
      sky(o.night ? 'night' : 'day', 0, 90);
      ridge(2.0, 70, 26, '#4f7a46');
      for (let i = 0; i < 7; i++) rect(i * 48 + 4, 64 - (i % 3) * 8, 36, 30 + (i % 3) * 8, i % 2 ? '#cfc8b8' : '#bdb6a6');
      rect(0, 94, W, 40, '#2a5a96');
      for (let y = 96; y < 134; y += 4) ditherRow(0, y, W, '#2a5a96', '#3d7bc4');
      // 함정 정박
      const ship = (x, y, w) => {
        rect(x, y, w, 12, '#8c9298');
        rect(x + 4, y + 12, w - 10, 3, '#5a6066');
        rect(x + w * 0.55, y - 18, w * 0.25, 18, '#a7adb3');
        rect(x + w * 0.65, y - 30, 2, 12, '#7d838a');
      };
      ship(20, 100, 120);
      ship(170, 104, 100);
      rect(0, 134, W, 46, '#9a978e');
      rect(0, 134, W, 3, '#e3b52c');
    },
    fg(t) {
      for (let i = 0; i < 14; i++) rect((i * 41 + t * 10) % W, 120 + (i % 4) * 3, 5, 1, '#7fb3e6');
    },
  };

  SC.airbase = {
    outdoor: true,
    bg(o) {
      sky(o.night ? 'night' : o.season === 'winter' ? 'winter' : 'day', 0, 100);
      if (o.night) stars(12, 40, 60);
      else cloud(110, 22);
      ridge(1.3, 84, 18, o.season === 'winter' ? '#9aaab4' : '#6a8a5a', 0.7, o.season === 'winter' ? '#eef2f5' : null);
      ground(o.season, 100, '#7a9a5a');
      // 격납고(HAS)
      const has = (x) => {
        for (let r = 0; r < 20; r++) {
          const w = Math.round(Math.sqrt(400 - (20 - r) * (20 - r)) * 1.8);
          rect(x - w, 100 - 20 + r, w * 2, 1, o.season === 'winter' ? '#c8d0d6' : '#5f7a52');
        }
        rect(x - 14, 88, 28, 12, '#2a2e2a');
      };
      has(40);
      has(120);
      // 관제탑
      rect(270, 50, 12, 50, '#d8d2c4');
      rect(264, 42, 24, 10, '#7a9ab0');
      rect(262, 40, 28, 3, '#555');
      // 활주로
      rect(0, 128, W, 30, o.season === 'winter' && o.snowRunway ? '#e8eef2' : '#4a4d55');
      for (let x = 0; x < W; x += 28) rect(x, 142, 16, 2, '#f1f2ea');
      rect(0, 128, W, 1, '#f1f2ea');
      rect(0, 157, W, 1, '#f1f2ea');
    },
    fg(t, o) {
      const jet = (x, y, c = '#8a949e') => {
        rect(x, y, 34, 4, c);
        rect(x + 34, y + 1, 4, 2, c);
        rect(x + 12, y - 6, 10, 6, c);
        rect(x + 12, y + 4, 10, 5, c);
        rect(x, y - 5, 5, 5, c);
        rect(x + 26, y, 5, 2, '#2c3e5a');
      };
      if (o.scramble) {
        const k = (t * 0.35) % 1;
        jet(-40 + k * 420, 132 - Math.max(0, k - 0.45) * 160, '#7a848e');
        if (k > 0.1) {
          g.save();
          g.globalAlpha = 0.5;
          rect(-50 + k * 420, 134 - Math.max(0, k - 0.45) * 160, 10, 2, '#ffb34a');
          g.restore();
        }
      } else jet(200, 116);
    },
  };

  SC.adasite = {
    outdoor: true,
    bg(o) {
      sky(o.night ? 'night' : o.season === 'winter' ? 'winter' : 'day', 0, 120);
      if (o.night) stars(2, 60, 90);
      for (let i = 0; i < 6; i++) cloud(i * 60, 110 + (i % 2) * 6, '#f4f6f8');
      for (let x = 0; x < W; x++) {
        const h = 96 + Math.abs(x - 160) * 0.18 + Math.sin(x * 0.1) * 2;
        rect(x, h, 1, H - h, o.season === 'winter' ? '#dfe6ea' : '#5f7a52');
      }
      rect(90, 70, 40, 34, '#f4f4f0');
      rect(94, 66, 32, 4, '#f4f4f0');
      rect(98, 62, 24, 4, '#f4f4f0');
      rect(180, 84, 50, 16, '#5d6a3c');
      for (let i = 0; i < 4; i++) rect(184 + i * 11, 72, 9, 12, '#7d7a52');
      rect(178, 100, 54, 4, '#2a2a22');
      for (let x = 60; x < 260; x += 10) rect(x, 104, 1, 10, '#777');
      rect(60, 106, 200, 1, '#777');
      sign(20, 30, 70, 12, '방공포대', '#2a4a7a', '#fff', 9);
    },
    fg(t, o) {
      g.save();
      g.globalAlpha = 0.6;
      for (let i = 0; i < 5; i++) cloud(((t * 6 + i * 80) % (W + 60)) - 40, 128 + (i % 2) * 8, '#ffffff');
      g.restore();
    },
  };

  SC.beach = {
    outdoor: true,
    bg(o) {
      sky(o.night ? 'night' : o.season === 'winter' ? 'winter' : 'day', 0, 76);
      ridge(0.8, 60, 30, '#4f6a4a', 0.6);
      rect(0, 74, W, 46, '#2f6aa8');
      for (let y = 76; y < 120; y += 4) ditherRow(0, y, W, '#2f6aa8', '#4a86c4');
      rect(0, 120, W, 60, '#d9c08a');
      for (let i = 0; i < 60; i++) px(Math.floor(U.hash2(i, 9) * W), 122 + Math.floor(U.hash2(9, i) * 56), '#bfa46c');
      const ibs = (x, y) => {
        rect(x, y, 30, 6, '#1e1e1e');
        rect(x + 2, y - 2, 26, 2, '#2e2e2e');
        rect(x - 2, y + 1, 2, 4, '#1e1e1e');
      };
      ibs(30, 140);
      ibs(220, 146);
      if (o.sign) sign(110, 20, 100, 14, o.sign, '#b3262e', '#fff', 9);
    },
    fg(t) {
      for (let i = 0; i < 10; i++) {
        const k = (t * 0.4 + i / 10) % 1;
        rect(i * 34 + Math.sin(t + i) * 4, 118 + k * 4, 18, 1, '#f4f8fb');
      }
    },
  };

  SC.flood = {
    outdoor: true,
    bg(o) {
      sky('gray', 0, 100);
      ridge(2.2, 80, 26, '#56704e');
      rect(0, 100, W, 80, P.mud);
      for (let i = 0; i < 90; i++) px(Math.floor(U.hash2(i, 4) * W), 100 + Math.floor(U.hash2(4, i) * 80), P.mudL);
      // 파손된 집
      rect(40, 66, 70, 40, '#d8cdb5');
      for (let r = 0; r < 14; r++) rect(34 + r * 1.5, 66 - r, 82 - r * 3, 1, '#4a5a7a');
      rect(56, 82, 14, 24, '#3a3028');
      rect(80, 80, 16, 10, '#5a6a7a');
      rect(40, 96, 70, 10, 'rgba(110,82,51,0.8)');
      // 잔해
      rect(150, 130, 30, 3, '#8d6a45');
      rect(156, 126, 3, 8, '#8d6a45');
      rect(190, 140, 20, 2, '#666');
      sandbags(220, 128, 9, 3);
      rect(120, 150, 50, 4, '#4f6f8f');
    },
    fg(t, o) {
      for (let i = 0; i < 8; i++) {
        const k = (t * 0.7 + i / 8) % 1;
        rect(120 + i * 6, 151, 3, 1, k > 0.5 ? '#7fa3c4' : '#4f6f8f');
      }
    },
  };

  SC.fire = {
    outdoor: true,
    bg(o) {
      sky('dusk', 0, 100);
      for (let x = 0; x < W; x++) {
        const h = Math.round(60 + Math.sin(x * 0.02) * 16 + Math.sin(x * 0.07) * 6);
        rect(x, h, 1, H - h, '#3a3028');
        if (x % 3 === 0) px(x, h, '#e57a2e');
      }
      for (let i = 0; i < 18; i++) {
        const x = 8 + i * 18;
        rect(x, 90 + (i % 3) * 6, 2, 16, '#1a1410');
        px(x - 1, 92 + (i % 3) * 6, '#1a1410');
        px(x + 2, 95 + (i % 3) * 6, '#1a1410');
      }
      ground('autumn', 136, '#4a3e30');
    },
    fg(t) {
      g.save();
      g.globalAlpha = 0.35;
      for (let i = 0; i < 14; i++) {
        const k = (t * 0.15 + i / 14) % 1;
        const x = 30 + i * 22 + Math.sin(t + i) * 6;
        rect(x - k * 10, 80 - k * 80, 10 + k * 20, 8, i % 2 ? '#8a8a8a' : '#b0aaa0');
      }
      g.restore();
      for (let i = 0; i < 10; i++) if (Math.sin(t * 9 + i * 3) > 0.3) px(20 + i * 30 + Math.sin(t * 5 + i) * 3, 70 + Math.sin(i) * 10, '#ffb34a');
    },
  };

  SC.asf = {
    outdoor: true,
    bg(o) {
      sky(o.season === 'winter' ? 'winter' : 'gray', 0, 96);
      ridge(1.6, 76, 24, o.season === 'winter' ? '#8a9aa6' : '#4f6a46', 1, o.season === 'winter' ? '#eef2f5' : null);
      ground(o.season, 110);
      for (let i = 0; i < 10; i++) pine(6 + i * 34, 110, 4, o.season);
      for (let x = 0; x < W; x += 12) rect(x, 112, 1, 18, '#8a8a7a');
      for (let y = 114; y < 130; y += 4) rect(0, y, W, 1, 'rgba(160,160,140,0.8)');
      rect(0, 140, W, 40, '#6e6a64');
      rect(196, 104, 70, 36, '#e8e8e0');
      rect(192, 100, 78, 5, '#2a7a4a');
      sign(200, 110, 62, 10, '거점소독', '#2a7a4a', '#fff', 8);
      rect(204, 124, 20, 16, '#4a4a4a');
    },
    fg(t) {
      g.save();
      g.globalAlpha = 0.4;
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.6 + i / 6) % 1;
        rect(230 + k * 30, 128 - k * 10, 3, 2, '#d8f0ff');
      }
      g.restore();
    },
  };

  SC.lebanon = {
    outdoor: true,
    bg(o) {
      sky(o.night ? 'night' : 'desert', 0, 90);
      if (o.night) stars(5, 70, 70);
      else sun(60, 22);
      rect(0, 84, W, 10, '#3d7bc4');
      ditherRow(0, 88, W, '#3d7bc4', '#7fb3e6');
      rect(0, 94, W, 86, '#d9c08a');
      for (let i = 0; i < 70; i++) px(Math.floor(U.hash2(i, 2) * W), 96 + Math.floor(U.hash2(2, i) * 84), '#bfa46c');
      const palm = (x, y) => {
        for (let i = 0; i < 26; i++) px(x + Math.round(Math.sin(i / 8) * 2), y - i, '#7a5a3a');
        const top = y - 26;
        for (let a = 0; a < 6; a++) for (let k = 0; k < 9; k++) px(x + Math.cos(a) * k * 1.4, top + Math.abs(Math.sin(a)) * k * 0.4 + k * 0.3, '#3a7a3a');
      };
      palm(30, 118);
      palm(290, 116);
      // 캠프
      rect(120, 92, 90, 30, '#f2f2ee');
      for (let i = 0; i < 3; i++) rect(124 + i * 30, 100, 20, 8, '#9fc2d8');
      sandbags(100, 126, 16, 2);
      rect(214, 74, 16, 50, '#c9b88a');
      rect(210, 70, 24, 6, '#8a7a5a');
      text('UN', 222, 86, '#222', 8);
      // UN 차량
      rect(40, 136, 44, 14, '#f4f4f4');
      rect(48, 128, 26, 9, '#f4f4f4');
      rect(52, 130, 8, 5, '#9fc2d8');
      rect(62, 130, 8, 5, '#9fc2d8');
      text('UN', 62, 143, '#111', 8);
      rect(44, 150, 8, 5, '#111');
      rect(72, 150, 8, 5, '#111');
    },
    fg(t, o) {
      flagpole(150, 92, 30, t, 'un');
      flagpole(170, 92, 30, t, 'kr');
      flagpole(190, 92, 30, t, 'lb');
    },
  };

  SC.airport = {
    bg(o) {
      rect(0, 0, W, 120, '#dfe4ea');
      rect(0, 10, W, 80, '#9fc6e6');
      for (let x = 0; x < W; x += 40) rect(x, 10, 2, 80, '#7a8a9a');
      rect(0, 88, W, 4, '#7a8a9a');
      // 비행기
      rect(60, 56, 120, 14, '#f4f6f8');
      rect(170, 58, 16, 10, '#f4f6f8');
      rect(100, 42, 30, 14, '#e0e4ea');
      rect(64, 44, 10, 12, '#2a4a8a');
      for (let i = 0; i < 9; i++) rect(80 + i * 10, 60, 4, 3, '#4a6a9a');
      rect(0, 120, W, 60, '#c8ccd0');
      for (let x = 0; x < W; x += 32) rect(x, 120, 1, 60, '#b4b8bc');
      rect(220, 20, 90, 34, '#1a1a1a');
      text(o.board || '출발 DEPARTURE', 265, 28, P.yellow, 8);
      text(o.board2 || 'BEIRUT  탑승중', 265, 42, '#7fff8a', 8);
    },
    fg() {},
  };

  SC.ceremony = {
    outdoor: true,
    charScale: 1,
    bg(o) {
      sky('day', 0, 100);
      cloud(60, 20);
      cloud(220, 30);
      rect(0, 80, W, 30, '#8a8f96');
      for (let i = 0; i < 160; i++) px(Math.floor(U.hash2(i, 7) * W), 82 + Math.floor(U.hash2(7, i) * 24), ['#e04a3a', '#3a8ae0', '#f2c14e', '#fff', '#222'][i % 5]);
      rect(0, 108, W, 72, '#5a5e64');
      for (let x = 0; x < W; x += 30) rect(x, 140, 18, 2, '#f1f2ea');
    },
    fg(t, o) {
      flagpole(160, 100, 40, t, 'kr');
      const k = (t * 0.25) % 1;
      for (let i = 0; i < 5; i++) {
        const x = -60 + k * 440 - i * 10;
        const y = 30 + Math.abs(i - 2) * 5;
        rect(x, y, 10, 2, '#e8e8f0');
        rect(x + 3, y - 2, 3, 6, '#e8e8f0');
        g.save();
        g.globalAlpha = 0.6;
        rect(x - 40, y, 40, 1, ['#ff4a4a', '#ffffff', '#4a6aff', '#ffffff', '#ff4a4a'][i]);
        g.restore();
      }
      if (o.formation) formation(30, 150, 13, 2, o.formation, 21, 12, t);
    },
  };

  SC.black = {
    bg() {
      rect(0, 0, W, H, '#0b0d14');
    },
    fg() {},
  };

  // ---------- 날씨 ----------
  const parts = [];
  function weather(kind, dt) {
    if (!kind) {
      parts.length = 0;
      return;
    }
    const spawn = { snow: 1.4, rain: 4, petal: 0.4, leaf: 0.3 }[kind] || 0;
    let n = spawn * dt * 60;
    while (n > 0) {
      if (Math.random() < n) parts.push({ x: Math.random() * (W + 40) - 20, y: -4, k: kind, s: Math.random() });
      n -= 1;
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.k === 'snow') {
        p.y += dt * (14 + p.s * 10);
        p.x += Math.sin(p.y * 0.08 + p.s * 6) * 0.3;
        px(p.x, p.y, '#ffffff');
      } else if (p.k === 'rain') {
        p.y += dt * 180;
        p.x -= dt * 30;
        rect(p.x, p.y, 1, 4, 'rgba(180,210,255,0.7)');
      } else {
        p.y += dt * (16 + p.s * 8);
        p.x += Math.sin(p.y * 0.05 + p.s * 6) * 0.6;
        px(p.x, p.y, p.k === 'petal' ? '#f6c2d2' : ['#d4762c', '#e2a23a', '#b4452c'][Math.floor(p.s * 3)]);
      }
      if (p.y > H + 4 || p.k !== kind) parts.splice(i, 1);
    }
  }

  // ---------- 렌더 루프 ----------
  const R = {
    W,
    H,
    P,
    scene: 'title',
    opt: {},
    chars: [],
    talking: null,
    emotes: {},
    mg: null,
    cache: new Map(),
    shakeT: 0,
    flashT: 0,
    flashC: '#fff',
    fade: 0,
  };

  R.init = (canvas) => {
    main = canvas.getContext('2d');
    main.imageSmoothingEnabled = false;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      R.frame(now / 1000, dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => R.cache.clear());
  };

  const seasonOf = (m) => (m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter');
  R.seasonOf = seasonOf;

  R.set = (id, opt = {}) => {
    if (!SC[id]) id = 'black';
    R.scene = id;
    R.opt = Object.assign({ month: 1 }, opt);
    R.opt.season = R.opt.season || seasonOf(R.opt.month);
    R.chars = (opt.chars || []).map((c) => Object.assign({ x: 160, y: 162, pose: 'stand' }, c));
    R.talking = null;
  };
  R.setChars = (chars) => {
    R.chars = chars.map((c) => Object.assign({ x: 160, y: 162, pose: 'stand' }, c));
  };
  R.char = (key) => R.chars.find((c) => c.key === key);
  R.pose = (key, pose) => {
    const c = R.char(key);
    if (c) c.pose = pose;
  };
  R.emote = (key, s = '!', dur = 1.2) => {
    R.emotes[key] = { s, until: performance.now() / 1000 + dur };
  };
  R.shake = (d = 0.4) => {
    R.shakeT = d;
  };
  R.flash = (c = '#fff', d = 0.35) => {
    R.flashC = c;
    R.flashT = d;
  };

  function bgKey() {
    const o = R.opt;
    return [R.scene, o.season, o.night ? 1 : 0, o.dusk ? 1 : 0, o.variant || '', o.sign || '', o.banner || '', o.board || '', o.menu || '', o.month, o.letter ? 1 : 0, o.circle ? 1 : 0, o.storm ? 1 : 0, o.slogan || '', o.snowRunway ? 1 : 0, o.motto || '', o.board2 || ''].join('|');
  }

  R.frame = (t, dt) => {
    if (!main) return;
    g = main;
    if (R.mg) {
      R.mg.update && R.mg.update(dt, t);
      R.mg.draw(main, t, R);
      return;
    }
    const sc = SC[R.scene] || SC.black;
    const key = bgKey();
    let cv = R.cache.get(key);
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const c2 = cv.getContext('2d');
      c2.imageSmoothingEnabled = false;
      g = c2;
      sc.bg(R.opt);
      g = main;
      if (R.cache.size > 40) R.cache.clear();
      R.cache.set(key, cv);
    }
    main.save();
    if (R.shakeT > 0) {
      R.shakeT -= dt;
      main.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 4));
    }
    main.drawImage(cv, 0, 0);
    sc.fg && sc.fg(t, R.opt);
    const sorted = R.chars.slice().sort((a, b) => a.y - b.y);
    const cs = R.opt.charScale || sc.charScale || 2;
    for (const c of sorted) {
      if (c.hidden) continue;
      // 주요 인물은 2배 도트로(배경 대열은 1배)
      main.save();
      main.translate(c.x, c.y);
      main.scale(cs, cs);
      person(0, 0, c.look, c.pose, t + c.x * 0.13, R.talking === c.key);
      main.restore();
      const top = c.y - 26 * cs + (c.pose === 'sit' ? 3 * cs : 0);
      if (R.talking === c.key) bubble(c.x, top, t);
      const em = R.emotes[c.key];
      if (em && em.until > t) bubble(c.x, top, t, em.s);
    }
    if (sc.front) sc.front(t, R.opt);
    // 날씨
    let wk = R.opt.weather;
    if (wk === undefined && sc.outdoor) {
      const m = R.opt.month;
      wk = R.opt.season === 'winter' ? 'snow' : m === 4 ? 'petal' : m === 10 || m === 11 ? 'leaf' : null;
    }
    if (R.opt.rain) wk = 'rain';
    weather(wk, dt);
    if (R.opt.night && sc.outdoor) {
      main.fillStyle = 'rgba(8,12,40,0.28)';
      main.fillRect(0, 0, W, H);
    }
    if (R.flashT > 0) {
      R.flashT -= dt;
      main.globalAlpha = Math.max(0, Math.min(1, R.flashT * 2));
      main.fillStyle = R.flashC;
      main.fillRect(0, 0, W, H);
      main.globalAlpha = 1;
    }
    main.restore();
  };

  // 미니게임 등에서 재사용
  R.draw = { rect: (...a) => rect(...a), px: (...a) => px(...a), text: (...a) => text(...a), sky, ridge, person, sandbags, cloud, pine, ground, sign };
  R.useCtx = (c) => {
    g = c;
  };
  R.CAMO = CAMO;

  DM.R = R;
})(window.DM);
