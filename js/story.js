// 고정 스토리: 프롤로그 → 입영통지서 → 입영 전 → 훈련소 → 분류 → 후반기교육 → 전입 → (매월) → 전역
(function (DM) {
  const U = DM.U;
  const D = DM.DATA;
  const G = DM.G;
  const R = DM.R;
  const MG = DM.MG;
  let s = null;

  // ---------- 공용 헬퍼 ----------
  const H = {};
  H.bind = () => (s = G.S());
  const ROLE = {
    army: { cpt: '중대장', ssg: '행보관', lt: '소대장', sgt: '분대장', drill: '조교' },
    marine: { cpt: '중대장', ssg: '행보관', lt: '소대장', sgt: '분대장', drill: '교관' },
    navy: { cpt: '부서장', ssg: '직별장', lt: '당직사관', sgt: '최선임', drill: '교관' },
    air: { cpt: '중대장', ssg: '반장', lt: '당직사관', sgt: '최선임', drill: '교관' },
  };
  const FIXED = { mom: '엄마', dad: '아빠', grandma: '할머니', barber: '원장님', farmer: '어르신', villager: '주민', kid: '아이', doctor: '군의관', general: '사단장', un: 'UN 동료' };
  const RELN = { senior: '맞선임', buddy: '동기', buddy2: '동기', junior: '후임', friend: '친구', friend2: '친구' };
  H.role = (k) => (ROLE[s.branch || 'army'] || ROLE.army)[k] || RELN[k] || FIXED[k] || k;
  H.label = (k) => {
    if (FIXED[k]) return FIXED[k];
    if (['cpt', 'ssg', 'lt'].includes(k)) return H.role(k);
    const nm = s.npc[k];
    return nm ? `${H.role(k)} ${nm}` : H.role(k);
  };
  H.say = (k, text) => G.say(H.label(k), text, { key: k });
  H.me = (text) => G.say('me', text);
  H.narr = (text) => G.narr(text);
  H.sal = () => D.BRANCH[s.branch || 'army'].salute;
  H.j = U.josa;
  H.call = () => U.callName(U.given(s.name));
  H.isTrain = () => s.phase === 'training';

  const LOOK = { cpt: 'officer', lt: 'lt', ssg: 'nco', sgt: 'sergeant', senior: 'senior', junior: 'junior', drill: 'drill' };
  H.npc = (k, x, extra = {}) => {
    let look;
    if (k === 'buddy' || k === 'buddy2') look = H.isTrain() ? G.look('trainee') : G.look('soldier', { rank: Math.max(1, s.rankIdx + 1) });
    else if (k === 'senior') look = G.look('senior', { rank: U.clamp(s.rankIdx + 2, 2, 4) });
    else if (k === 'junior') look = G.look('junior', { rank: U.clamp(s.rankIdx, 1, 3) });
    else if (k === 'sgt') look = G.look('sergeant', { rank: s.rankIdx >= 3 ? 4 : U.clamp(s.rankIdx + 2, 3, 4) });
    else look = G.look(LOOK[k] || k);
    if (extra.look) Object.assign(look, extra.look);
    return { key: k, look, x, y: extra.y ?? 162, pose: extra.pose || 'stand', name: H.label(k) };
  };
  H.place = (id, npcs = [], opt = {}) => G.scene(id, Object.assign({ npcs }, opt));
  // 부대 생활 기본 장면
  H.home = () => {
    const u = s.unit || {};
    if (u.type === 'ship') return 'ship';
    if (u.type === 'ada' || u.type === 'radar') return 'adasite';
    return 'barracks';
  };
  H.unitSign = () => (s.unit ? s.unit.nick || s.unit.short : '부대');
  H.unitFlag = () => ({ army: '#3a5a9a', marine: '#b3262e', navy: '#1d2b53', air: '#3a7ab0' }[s.branch] || '#3a5a9a');

  // 신고 문구
  H.reportText = (body) => `${H.sal()}! 신고합니다. ${G.rankName()} ${H.j(s.name, '은는')} ${body}. 이에 신고합니다. ${H.sal()}!`;
  H.report = async (body) => {
    R.pose('me', 'salute');
    await H.me(H.reportText(body));
    R.pose('me', 'stand');
  };

  H.doc = (title, inner, opt = {}) => G.doc(`<div class="paper ${opt.cls || ''}">${inner}<div class="wm">게임 속 가상 문서</div></div>`, opt);

  // ---------- 날짜 계산 ----------
  function setupService() {
    const b = D.BRANCH[s.branch];
    s.dischargeDate = U.addDays(U.addMonths(s.enlistDate, b.months), -1);
    const p1 = U.addMonths(U.firstOfMonth(s.enlistDate), b.firstPromo);
    const p2 = U.addMonths(p1, b.step);
    const p3 = U.addMonths(p2, b.step);
    s.promo = [p1, p2, p3];
    s.leave.annual = b.leave;
    s.trainEnd = U.addDays(s.enlistDate, 7 * b.trainWeeks + 3);
    const digits = String(U.randi(1000000, 9999999));
    s.serviceNo = `${String(U.year(s.enlistDate)).slice(2)}-7${digits}`;
  }

  // ======================================================
  // 프롤로그
  // ======================================================
  const PATH_PROB = { air: 0.34, navy: 0.52, marine: 0.6, tech: 0.42 };

  DM.St = DM.St || {};
  const St = DM.St;
  St.H = H;

  St.prologue = async () => {
    H.bind();
    G.bgm('home');
    G.scene('home', { mx: 160 });
    await G.title(`${U.year(s.date)}년, 스무 살`, '어느 평범한 날, 우리 집', { kicker: 'PROLOGUE' });
    await H.narr('스무 살. 대학 생활도, 알바도, 친구들과의 밤샘도 이제 막 익숙해질 무렵.');
    s.name = await G.ask('주인공의 이름을 정해 주세요. (한글 2~4자)', U.randName());
    G.hud();
    const mi = await G.choose(`${s.name}의 전공·특기는?`, D.MAJORS.map((m) => ({ label: m.name, hint: m.desc })));
    s.major = D.MAJORS[mi].id;
    G.fx(D.MAJORS[mi].fx, true);
    const li = await G.choose('운전면허는?', [{ label: '1종 보통 있음', hint: '운전병 분류 가능' }, { label: '없음' }]);
    s.license = li === 0;
    const ht = U.pick(D.HOMETOWNS);
    s.hometown = ht.city;
    s.mma = ht.mma;
    s.shirt = U.pick(['#5a7fb0', '#c0504d', '#4f9a6a', '#d0a040', '#7a5ab0', '#3a3a3a']);
    const by = U.year(s.date) - 20;
    s.birth = `${by}-${String(U.randi(1, 12)).padStart(2, '0')}-${String(U.randi(1, 28)).padStart(2, '0')}`;
    s.grade = U.wpick([{ g: 1, w: 25 }, { g: 2, w: 45 }, { g: 3, w: 30 }]).g;
    const fr = U.uniqueNames(2, [s.name]);
    s.npc.friend = fr[0];
    s.npc.friend2 = fr[1];
    G.refreshMe();
    await H.narr(`${s.hometown}에 사는 ${s.name}. 열아홉 살 때 받은 병역판정검사 결과는 신체등급 ${s.grade}급, '현역 판정'이었다.`);
    H.place('home', [H.npc('mom', 214), H.npc('dad', 96)], { mx: 156 });
    await H.say('mom', `${H.call()}, 너도 이제 군대 문제 정해야 하지 않겠니?`);
    await H.say('dad', '아빠 땐 입영통지서 나오면 그냥 갔다. 춘천 102보충대에 모였다가 자대가 뺑뺑이로 정해졌지... 그 보충대도 2014년에 없어졌다더라.');
    await H.me('요즘은 훈련소도 여러 군데라던데... 어떻게 하지?');
    await choosePath();
    s.phase = 'notice';
  };

  async function choosePath() {
    const i = await G.choose('입영 방법을 정하자.', [
      { label: '현역병 입영 (입영통지서 기다리기)', hint: '육군 · 입영부대 랜덤' },
      { label: '모집병 지원하기', hint: '공군 · 해군 · 해병대 · 육군 기술행정병 (합격은 확률)' },
      { label: '완전 랜덤에 맡기기', hint: '군도, 훈련소도 운명대로' },
    ]);
    if (i === 0) return conscript();
    if (i === 1) return volunteer();
    await H.me('어차피 가는 거, 운명에 맡긴다!');
    if (U.chance(0.58)) {
      await H.narr('...그렇게 아무것도 정하지 않은 채 시간이 흘렀다.');
      return conscript();
    }
    const b = U.pick(['air', 'navy', 'marine', 'tech']);
    await H.narr('친구 따라 장난처럼 넣어 본 모집병 지원서가 있었는데...');
    return volunteerResult(b, true);
  }

  async function conscript() {
    s.branch = 'army';
    s.path = 'conscript';
    s.center = U.wpick(D.ARMY_CENTERS);
  }

  async function volunteer() {
    const opts = [
      { k: 'air', label: '공군 (21개월)', hint: '경쟁률 높음 · 자격증/전공 가점' },
      { k: 'navy', label: '해군 (20개월)', hint: '함정 근무 가능성' },
      { k: 'marine', label: '해병대 (18개월)', hint: '체력이 중요 · 빨간 명찰' },
      { k: 'tech', label: '육군 기술행정병 (18개월)', hint: '특기를 골라 지원' },
    ];
    const i = await G.choose('어디에 지원할까?', opts);
    return volunteerResult(opts[i].k, false);
  }

  async function volunteerResult(k, force) {
    let mos = null;
    if (k === 'tech') {
      const list = D.MOS.army.filter((m) => D.ARMY_TECH.includes(m.id));
      const pick = force
        ? U.pick(list.filter((m) => m.req !== 'license' || s.license))
        : list[
            await G.choose(
              '지원할 특기는?',
              list.map((m) => ({ label: `${m.name} (${m.group})`, disabled: m.req === 'license' && !s.license, why: '운전면허 필요', hint: m.bonus === s.major ? '전공 가점' : '' }))
            )
          ];
      mos = pick;
    }
    let p = PATH_PROB[k];
    if (k === 'marine') p += (s.stats.hp - 50) / 200;
    if (k === 'tech' && mos && mos.bonus === s.major) p += 0.22;
    if (k === 'air' && (s.major === 'it' || s.license)) p += 0.1;
    if (G.forcePass) force = true;
    const name = k === 'tech' ? `육군 기술행정병 (${mos.name})` : D.BRANCH[k].name;
    if (!force) {
      G.scene('home', { mx: 160, night: true });
      await H.narr(`${name} 지원서 접수 완료. 고교 출결, 자격증, 전공, 봉사활동... 점수가 매겨진다.`);
      await H.narr(k === 'marine' ? '면접과 체력검정, 신체검사를 치렀다. 결과 발표일 아침, 병무청 누리집 새로고침을 수십 번...' : '1차 서류 통과! 면접과 신체검사까지 마쳤다. 결과 발표일 아침, 병무청 누리집 새로고침을 수십 번...');
    }
    const pass = force || Math.random() < p;
    if (!pass) {
      R.shake(0.3);
      await G.title('불합격', `${name} 모집 결과`, { kicker: '병무청' });
      G.fx({ mental: -5 });
      await H.me('...불합격. 경쟁률이 장난 아니었구나.');
      await H.narr('다시 지원할까 고민하던 사이, 현역병 입영통지서가 먼저 날아왔다.');
      return conscript();
    }
    R.flash('#fff6c0');
    await G.title('최종 합격!', `${name} 모집`, { kicker: '병무청' });
    s.path = 'volunteer';
    if (k === 'tech') {
      s.branch = 'army';
      s.center = D.ARMY_CENTERS[0];
      s.mos = mos;
      s.flags.techMos = true;
    } else {
      s.branch = k;
      s.center = D.CENTERS[k];
    }
  }

  // ======================================================
  // 입영통지서
  // ======================================================
  St.notice = async () => {
    H.bind();
    s.noticeDate = s.date;
    s.enlistDate = U.nextDow(U.addDays(s.date, U.randi(32, 68)), 1);
    setupService();
    G.bgm('home');
    G.scene('home', { mx: 150, letter: true, npcs: [H.npc('mom', 205)] });
    await H.say('mom', `${H.call()}! 병무청에서 등기 왔다!`);
    R.emote('me', '!');
    await H.me('왔구나...');
    const b = D.BRANCH[s.branch];
    const c = s.center;
    const conscript = s.path === 'conscript';
    const ttl = conscript ? '현역병 입영 통지서' : `${b.name} 모집병 입영 통지서`;
    await H.doc(
      ttl,
      `<div class="doc-top">병 무 청</div>
      <h2 class="doc-title">${ttl}</h2>
      <table class="kv">
        <tr><th>성명</th><td>${U.esc(s.name)}</td></tr>
        <tr><th>생년월일</th><td>${U.fmt(s.birth)}</td></tr>
        <tr><th>병역처분</th><td>현역병입영 대상 (신체등급 ${s.grade}급)</td></tr>
        <tr><th>입영일시</th><td><b>${U.fmtW(s.enlistDate)} 14:00</b></td></tr>
        <tr><th>입영부대</th><td><b>${U.esc(c.name)}</b></td></tr>
        <tr><th>소재지</th><td>${U.esc(c.place)}</td></tr>
        ${s.mos ? `<tr><th>모집특기</th><td>${U.esc(s.mos.name)}</td></tr>` : ''}
        <tr><th>복무기간</th><td>${b.name} ${b.months}개월 (전역 예정 ${U.fmt(s.dischargeDate)})</td></tr>
      </table>
      <p class="small">준비물: 신분증, 입영통지서, 개인 상비약(처방전), 안경. 입영 시 휴대전화는 교육기간 중 정해진 시간에만 사용할 수 있습니다.</p>
      <p class="warn">정당한 사유 없이 입영일부터 3일이 지나도 입영하지 아니하면 「병역법」 제88조에 따라 처벌받을 수 있습니다.</p>
      <div class="sign">${U.fmt(s.noticeDate)}<br><b>${U.esc(s.mma)}장</b> <span class="seal">병무청장인</span></div>`,
      { cls: 'notice', btn: '받았다' }
    );
    G.log(`입영통지서 수령 — ${U.fmt(s.enlistDate)} ${c.name}`);
    const days = U.diff(s.date, s.enlistDate);
    await H.say('mom', `${U.month(s.enlistDate)}월 ${U.day(s.enlistDate)}일... ${days}일밖에 안 남았네.`);
    if (s.branch === 'army' && c.kind === 'ktc') await H.me('논산 육군훈련소, 연무대. 말로만 듣던 그곳이다.');
    else if (s.branch === 'army') {
      const dv = D.DIVS[c.div];
      await H.me(`${dv.name} 신병교육대? ${dv.place}... ${dv.type === 'gop' ? '최전방이잖아!' : '집에서 멀지는 않으려나.'}`);
      await H.say('mom', '사단 신병교육대로 바로 가면 수료하고 그 사단으로 간다더라.');
    } else if (s.branch === 'navy') await H.me('진해 해군교육사령부. 바다 냄새 맡으면서 훈련받겠네.');
    else if (s.branch === 'air') await H.me('진주 공군 기본군사훈련단. 21개월... 그래도 공군이다.');
    else await H.me('포항 해병대교육훈련단. 빨간 명찰, 받아 보자.');
    s.phase = 'pre';
  };

  // ======================================================
  // 입영 전
  // ======================================================
  St.pre = async () => {
    H.bind();
    G.bgm('home');
    const left = U.diff(s.date, s.enlistDate);
    await G.passTo(U.addDays(s.date, Math.max(1, Math.floor(left / 3))));
    H.place('street', [H.npc('friend', 186), H.npc('friend2', 212)], { mx: 150 });
    await H.say('friend', `야 ${s.name}, 입영 날짜 나왔다며? ${U.month(s.enlistDate)}월이면 금방이네.`);
    await H.say('friend2', '나는 내년에 가. 먼저 가서 자리 잡고 있어라 ㅋㅋ');
    const a = await G.choose('입영 전까지 남은 시간, 뭘 할까?', [
      { label: '친구들과 송별회', hint: '멘탈↑ · 돈↓' },
      { label: '헬스장 등록 · 매일 달리기', hint: '체력↑' },
      { label: '자격증 공부 (컴활·한국사)', hint: '숙련↑' },
      { label: '단기 알바로 용돈 벌기', hint: '통장↑' },
    ]);
    if (a === 0) {
      await H.narr('삼겹살, 노래방, 새벽 편의점 라면. 친구들이 "충성!" 하며 장난스럽게 경례를 했다.');
      G.fx({ mental: 10, money: -80000 });
    } else if (a === 1) {
      await H.narr('매일 아침 5km. 처음엔 숨이 턱까지 찼지만 2주쯤 지나자 몸이 가벼워졌다.');
      G.fx({ hp: 12, mental: 2 });
    } else if (a === 2) {
      await H.narr('도서관에 틀어박혀 기출문제를 돌렸다. 훈련소 가기 전에 하나라도 따 두자.');
      G.fx({ skill: 10 });
      G.log('입영 전 자격증 공부');
    } else {
      await H.narr('물류센터 야간 알바. 허리는 아팠지만 통장은 든든해졌다.');
      G.fx({ money: 600000, hp: 3, mental: -2 });
    }
    // 입영 전날: 미용실
    await G.passTo(U.addDays(s.enlistDate, -1));
    H.place('barber', [{ key: 'barber', look: G.look('barber'), x: 194, y: 150, name: '원장님' }], { mx: 160, my: 150, mpose: 'sit' });
    await H.say('barber', '군대 가는구나? 아들 같아서 그래, 오늘은 그냥 해 줄게.');
    R.opt.cut = true;
    await H.narr('위잉— 바리캉 소리가 유난히 크게 들린다. 거울 속 낯선 얼굴.');
    s.flags.buzz = true;
    G.refreshMe();
    R.opt.cut = false;
    await H.me('...이게 나라고?');
    // 저녁
    H.place('home', [H.npc('mom', 206), H.npc('dad', 106)], { mx: 156, night: true });
    await H.say('dad', '몸 건강히만 다녀와라. 요즘 군대 좋아졌다지만, 그래도 아프면 바로 말하고.');
    await H.say('mom', '휴대폰은 저녁에 쓸 수 있다며? 꼭 연락하고.');
    const c = await G.choose(null, [{ label: '"걱정 마. 금방 다녀올게."' }, { label: '"...사실 좀 무서워."' }, { label: '(말없이 밥 한 그릇 더)' }]);
    if (c === 0) G.fx({ mental: 3 });
    else if (c === 1) {
      await H.say('mom', '무서운 게 당연하지. 그래도 우리 아들, 잘할 거야.');
      G.fx({ mental: 6 });
    } else {
      await H.narr('엄마가 말없이 계란말이를 하나 더 얹어 주었다.');
      G.fx({ hp: 3, mental: 4 });
    }
    // 입영일
    await G.passTo(s.enlistDate);
    G.bgm('training');
    const cen = s.center;
    H.place('gate', [H.npc('mom', 200, { y: 166 }), H.npc('dad', 222, { y: 166 }), { key: 'x1', look: G.look('civil', { shirt: '#4a7a4a', head: 'buzz' }), x: 70, y: 150 }, { key: 'x2', look: G.look('friend', { head: 'buzz' }), x: 260, y: 152 }, { key: 'x3', look: G.look('grandma'), x: 284, y: 154 }], { mx: 176, my: 166, sign: cen.gate, banner: '입영을 환영합니다', flagColor: H.unitFlag() });
    await G.title(cen.name, `${U.fmtW(s.date)} 14:00 입영`, { kicker: '입영' });
    await H.narr(`${cen.place}. 짧은 머리의 청년들과 가족들로 정문 앞이 북적인다.`);
    await H.say('mom', '밥 잘 먹고... 잘 자고...');
    G.look && R.char('mom') && (R.char('mom').look.tear = true);
    await H.say('dad', '가서 잘해라. 아빠가 편지 쓸게.');
    await G.say('안내 방송', '입영 장정 여러분은 지금 가족과 인사를 마치고 연병장으로 집합해 주시기 바랍니다.');
    const f = await G.choose(null, [{ label: '부모님을 꼭 안아 드린다' }, { label: '씩 웃으며 경례 흉내를 낸다' }, { label: '뒤돌아보지 않고 걸어간다' }]);
    if (f === 0) G.fx({ mental: 5 });
    else if (f === 1) {
      R.pose('me', 'salute');
      await H.me(`${H.sal()}! 다녀오겠습니다!`);
      R.pose('me', 'stand');
      G.fx({ mental: 3, rep: 1 });
    } else G.fx({ mental: -2, hp: 1 });
    G.log(`${cen.name} 입영`);
    s.phase = 'training';
    s.week = 0;
    s.rankIdx = 0; // 훈련병도 계급은 이병(진급 기산)
    const nm = U.uniqueNames(9, [s.name, s.npc.friend, s.npc.friend2]);
    Object.assign(s.npc, { buddy: nm[0], buddy2: nm[1], drill: nm[2], sgt: nm[3], senior: nm[4], junior: nm[5], junior2: nm[6] });
  };

  // ======================================================
  // 훈련소
  // ======================================================
  const PLAN = {
    army: ['intake', 'drill', 'shoot', 'gas', 'combat', 'march'],
    navy: ['intake', 'drill', 'swim', 'shoot', 'gas', 'grad'],
    air: ['intake', 'drill', 'shoot', 'gas', 'combat', 'march', 'grad'],
    marine: ['intake', 'drill', 'shoot', 'gas', 'airborne', 'combat', 'kukgi', 'grad'],
  };
  const WK = {};

  function trainTag() {
    const c = s.center;
    if (c.kind === 'ktc') return `제${U.randi(23, 30)}교육연대 ${U.randi(1, 5)}중대 ${U.randi(1, 4)}소대 ${U.randi(1, 60)}번 훈련병`;
    if (c.kind === 'div') return `${c.name} ${U.randi(1, 4)}중대 ${U.randi(1, 4)}소대 ${U.randi(1, 60)}번 훈련병`;
    if (c.kind === 'navy') return `기초군사교육단 ${U.randi(1, 8)}대대 ${U.randi(1, 6)}중대 ${U.randi(1, 99)}번 훈련병`;
    if (c.kind === 'air') return `기본군사훈련단 ${U.randi(1, 4)}대대 ${U.randi(1, 8)}중대 ${U.randi(1, 99)}번 훈련병`;
    return `교육훈련단 ${U.randi(1, 4)}교육대 ${U.randi(1, 8)}중대 ${U.randi(1, 99)}번 훈련병`;
  }
  const trainScene = (id, extra = {}) =>
    H.place(id, [H.npc('drill', 214, { y: 164 }), H.npc('buddy', 108, { y: 166 })], Object.assign({ mx: 160, my: 168, flagColor: H.unitFlag() }, extra));

  St.training = async () => {
    H.bind();
    const plan = PLAN[s.branch];
    const k = s.week;
    const step = plan[k];
    if (step === 'grad') await G.passTo(s.trainEnd);
    else await G.passTo(U.addDays(s.enlistDate, k === 0 ? 0 : 7 * k + 1));
    G.bgm('training');
    await WK[step]();
    if (step === 'march' && s.branch === 'army') await graduation();
    s.week++;
    if (s.week >= plan.length && s.phase === 'training') s.phase = s.school ? 'school' : 'transfer';
  };

  WK.intake = async () => {
    trainScene('parade', { formation: G.look('trainee'), banner: s.center.kind === 'ktc' ? '강한 친구 육군' : '필승' });
    await G.title('입소', `${s.center.name} · ${U.fmt(s.date)}`, { kicker: '훈련 0주차' });
    s.flags.tag = trainTag();
    await H.say('drill', '지금부터 여러분은 민간인이 아닌 훈련병입니다. 대답은 짧고 크게. 알겠습니까?');
    const a = await G.choose(null, [{ label: '"네, 알겠습니다!" (크게)' }, { label: '"...네." (작게)' }]);
    if (a === 0) G.fx({ rep: 3 });
    else {
      await H.say('drill', '목소리가 작습니다! 다시!');
      await H.me('네! 알겠습니다!!');
      G.fx({ mental: -2 });
    }
    await H.narr('입소 첫 사흘. 보급품을 받는다. 전투복, 전투화, 활동복, 그리고 그 유명한 방상내피(일명 깔깔이).');
    await H.narr('신체검사, 인성검사, 예방접종이 이어진다.');
    const h = await G.choose('군의관: "몸에 불편한 곳 있습니까?"', [{ label: '"없습니다!"' }, { label: '"사실 무릎이 좀 안 좋습니다."' }]);
    if (h === 1) {
      await G.say('군의관', '정밀 진료를 받아 봅시다. ...큰 이상은 없네요. 무리하지 말고, 아프면 바로 말해요.');
      G.fx({ hp: 3 });
    }
    await H.narr(`그리고 받은 숫자 — 군번 ${s.serviceNo}. 평생 잊지 못할 번호다.`);
    await H.narr(`배치: ${s.flags.tag}.`);
    G.log(`군번 부여 ${s.serviceNo} · ${s.flags.tag}`);
    // 첫날 밤
    H.place('barracks', [H.npc('buddy', 104, { pose: 'sit', y: 150 }), H.npc('buddy2', 214, { pose: 'sit', y: 150 })], { mx: 160, my: 150, mpose: 'sit', night: true });
    await H.say('buddy', `난 ${s.npc.buddy}. ${U.pick(['부산', '광주', '대전', '인천', '전주', '울산'])}에서 왔어. 너는?`);
    await H.me(`${s.name}. ${s.hometown}.`);
    await H.say('buddy2', `${s.npc.buddy2}이야. 우리 같은 생활관이네. 잘 버텨 보자.`);
    const n = await G.choose('훈련소 첫날 밤.', [{ label: '천장을 보며 잠 못 든다', hint: '멘탈↓' }, { label: '동기들과 소곤소곤 수다', hint: '평판↑' }, { label: '눕자마자 기절', hint: '체력↑' }]);
    if (n === 0) {
      await H.narr('집 생각이 났다. 엄마 계란말이, 내 방 침대.');
      G.fx({ mental: -4 });
    } else if (n === 1) {
      await H.narr('불침번 동기의 눈치를 보며 소곤소곤. 웃음을 참느라 혼났다.');
      G.fx({ mental: 4, rep: 3 });
    } else G.fx({ hp: 4 });
  };

  WK.drill = async () => {
    trainScene('parade', { formation: G.look('trainee'), formationPose: 'salute', banner: '필승' });
    await G.title('제식훈련 · 정신교육', '경례부터 좌향좌·우향우까지', { kicker: '훈련 1주차' });
    await H.say('drill', `경례는 오른손 끝이 눈썹 끝에. 구호는 "${H.sal()}!" 실시!`);
    R.pose('me', 'salute');
    await H.me(`${H.sal()}!`);
    R.pose('me', 'stand');
    const a = await G.choose('제식훈련. 좌향좌, 우향우, 뒤로 돌아...', [{ label: '구령에 온 신경을 집중', hint: '숙련↑' }, { label: '옆 동기를 곁눈질로 따라 한다', hint: '운' }]);
    if (a === 0) G.fx({ skill: 3 });
    else if (U.chance(0.5)) {
      await H.narr('동기가 틀렸다. 나도 같이 틀렸다. 둘이 마주 보고 섰다.');
      await H.say('drill', '거기 둘! 왜 서로 마주 보고 있습니까?');
      G.fx({ rep: -2, mental: 2 });
    } else G.fx({ rep: 1 });
    // 적금
    H.place('classroom', [H.npc('drill', 220, { y: 166 })], { mx: 140, my: 168, board: '장병내일준비적금\n월 최대 55만 원 · 매칭지원 100%' });
    await H.say('drill', '장병내일준비적금 안내입니다. 월 최대 55만 원까지 넣을 수 있고, 만기 때 납입한 만큼 정부 매칭지원금이 붙습니다.');
    const sv = await G.choose('매달 얼마씩 넣을까?', [
      { label: '55만 원 (최대)', hint: '전역 때 목돈' },
      { label: '40만 원' },
      { label: '20만 원' },
      { label: '안 한다', hint: '통장 여유' },
    ]);
    s.saveAmt = [550000, 400000, 200000, 0][sv];
    G.log(`장병내일준비적금 ${s.saveAmt ? `월 ${U.man(s.saveAmt)}원 가입` : '미가입'}`);
    // 종교행사
    const r = await G.choose('일요일 종교행사. 어디로 갈까?', [{ label: '교회', hint: '초코파이' }, { label: '성당', hint: '햄버거' }, { label: '법당', hint: '떡과 음료' }, { label: '생활관에서 쉰다' }]);
    if (r < 3) {
      await H.narr(['초코파이 두 개. 사회에서는 몰랐던 맛이다.', '햄버거 하나에 눈물이 날 뻔했다.', '떡과 음료, 그리고 마음이 차분해지는 시간.'][r]);
      G.fx({ mental: 6 });
    } else G.fx({ hp: 4 });
    // 인터넷 편지 & 휴대폰
    H.place('barracks', [H.npc('buddy', 110, { pose: 'sit', y: 150 })], { mx: 170, my: 150, mpose: 'sit' });
    await H.narr('저녁, 조교가 인터넷 편지를 나눠 준다. 내 이름이 불렸다!');
    await G.say('엄마의 편지', `${H.call()}, 밥은 잘 먹니? 네 방 그대로 두었다. 아빠는 매일 날씨 앱에서 ${s.center.place.split(' ')[1] || '거기'} 날씨부터 본단다.`);
    await H.narr('주말에는 정해진 시간 동안 휴대폰을 쓸 수 있었다. 첫 통화에서 목소리가 떨렸다.');
    G.fx({ mental: 5 });
  };

  WK.shoot = async () => {
    trainScene('range', { firing: true });
    await G.title('사격', 'PRI · 영점사격 · 기록사격', { kicker: `훈련 ${s.week}주차` });
    await H.say('drill', 'PRI, 사격술 예비훈련부터. 호흡, 조준, 격발. 기본이 전부입니다.');
    const a = await G.choose(null, [{ label: '이를 악물고 PRI', hint: '체력↓ 숙련↑' }, { label: '요령껏 힘 아끼기', hint: '체력 보존' }]);
    if (a === 0) G.fx({ hp: -2, skill: 4 });
    else G.fx({ hp: 2 });
    await H.narr('영점사격. 25m 표적에 세 발씩 쏘며 가늠자를 맞춘다. 탄착군이 점점 모인다.');
    await H.say('drill', '지금부터 기록사격. 100m, 200m, 250m 표적이 무작위로 올라옵니다. 20발!');
    const res = await MG.shoot();
    const gi = MG.gradeShoot(res.hits);
    await H.narr(`결과: 20발 중 ${res.hits}발 — ${D.SHOOT_GRADE[gi]}.`);
    if (gi === 0) {
      G.award('훈련병 특등사수');
      G.fx({ rep: 6, skill: 5, mental: 4 });
    } else if (gi === 4) {
      await H.say('drill', '불합격자는 재사격입니다. 긴장 풀고, 숨 내쉬고.');
      await H.narr('재사격에서 간신히 합격선을 넘겼다.');
      G.fx({ mental: -3, skill: 2 });
    } else G.fx({ skill: 3 });
    s.flags.trainShoot = res.hits;
  };

  WK.gas = async () => {
    trainScene('gas');
    await G.title('화생방', '"가스! 가스! 가스!" 방독면 9초', { kicker: `훈련 ${s.week}주차` });
    await H.say('drill', '방독면 착용은 9초 안에. 정화통 체결 확인하고, 가스실 들어갑니다.');
    const m = await MG.mask();
    if (m.ok) {
      await H.narr(`${m.time.toFixed(1)}초. 합격!`);
      G.fx({ skill: 3 });
    } else {
      await H.narr('한 박자 늦었다. 매캐한 냄새가 코를 찌른다.');
      G.fx({ hp: -3, mental: -2 });
    }
    await H.narr('가스실 안. "방독면 벗어!" 구령과 함께 군번과 이름을 외친다. 눈물, 콧물, 그리고 이상하게 끈끈해지는 동기애.');
    const b = await G.choose('밖으로 나오자 동기가 비틀거린다.', [{ label: '부축해서 바람 부는 쪽으로', hint: '평판↑' }, { label: '나부터 살고 보자', hint: '체력↑' }]);
    if (b === 0) {
      await H.say('buddy', '고, 고맙다... 콜록.');
      G.fx({ rep: 5 });
    } else G.fx({ hp: 2 });
    if (s.branch !== 'navy') {
      H.place('field', [H.npc('drill', 214, { y: 160 })], { mx: 150, my: 160, variant: 'trench' });
      await H.narr('수류탄 투척 교장. 실제 수류탄이다. 공기가 달라진다.');
      await H.say('drill', '안전핀 뽑고! 투척! 엎드려!');
      const t = await G.choose(null, [{ label: '교관 구령에 정확히 맞춰 투척', hint: '숙련↑' }, { label: '최대한 멀리 던진다', hint: '운' }]);
      R.shake(0.6);
      R.flash('#ffe8b0', 0.3);
      if (t === 0) G.fx({ skill: 3, rep: 2 });
      else G.fx(U.chance(0.6) ? { mental: 4 } : { rep: -3 });
    }
    if (s.branch === 'marine') await ibsTraining();
    // 주특기 분류 면담(희망 반영)
    if (!s.flags.techMos) {
      H.place('office', [H.npc('drill', 214, { y: 164 })], { mx: 150, my: 166, board: '주특기 분류 면담' });
      await H.say('drill', '분류 면담입니다. 전공·자격·적성을 참고하지만, 최종 분류는 전산으로 결정됩니다.');
      const groups = [...new Set(D.MOS[s.branch].map((m) => m.group))].slice(0, 4);
      const w = await G.choose('희망 분야를 적어 낸다.', [...groups.map((g2) => ({ label: g2 })), { label: '아무거나 (분류에 맡긴다)' }]);
      s.flags.wantGroup = groups[w] || null;
    }
  };

  async function ibsTraining() {
    H.place('beach', [H.npc('drill', 230, { y: 160 }), H.npc('buddy', 80, { y: 150 })], { mx: 140, my: 156, sign: '상륙기습 기초' });
    await H.narr('IBS(고무보트) 상륙기습 기초훈련. 7명이 한 몸처럼 노를 젓는다.');
    await H.say('drill', '하나! 둘! 박자 맞춰! 파도는 기다려 주지 않는다!');
    const a = await G.choose(null, [{ label: '목이 터져라 구령을 맞춘다', hint: '평판↑' }, { label: '팔 힘으로 밀어붙인다', hint: '체력↑' }]);
    G.fx(a === 0 ? { rep: 4, mental: 2 } : { hp: 4 });
  }

  WK.swim = async () => {
    H.place('port', [H.npc('drill', 220, { y: 166 })], { mx: 150, my: 168 });
    await G.title('해상 생존 · 전투수영', '배는 가라앉아도 사람은 떠야 한다', { kicker: `훈련 ${s.week}주차` });
    await H.say('drill', '함정 근무자는 물에 빠졌을 때 살아남는 법부터 배웁니다. 생존수영, 구명동의 착용, 함정 이함 절차!');
    const a = await G.choose('수영장 다이빙대. 생각보다 높다.', [{ label: '눈 딱 감고 뛰어내린다', hint: '멘탈↑' }, { label: '교관에게 자세를 다시 묻는다', hint: '숙련↑' }]);
    if (a === 0) {
      R.shake(0.3);
      G.fx({ mental: 5, hp: 2 });
    } else G.fx({ skill: 4 });
    await H.narr('누워 뜨기, 구명동의 착용, 체온 유지 대형까지. 물 먹은 전투복이 천근만근이다.');
    if (s.stats.hp < 40) {
      await H.narr('숨이 차서 잠깐 허우적댔지만, 동기가 구명환을 던져 주었다.');
      G.fx({ hp: 3, rep: 1 });
    } else G.fx({ hp: 4 });
    await H.narr('이어지는 소화(消火)·방수(防水) 훈련. 함정에서는 모두가 소방관이자 수리공이다.');
  };

  WK.combat = async () => {
    trainScene('field', { variant: 'trench' });
    await G.title('각개전투 · 체력측정', '포복, 약진, 그리고 3km', { kicker: `훈련 ${s.week}주차` });
    await H.narr('각개전투 교장. 낮은 포복, 높은 포복, 약진... 흙먼지가 입안까지 들어온다.');
    const a = await G.choose('조교: "약진 앞으로!"', [{ label: '전력 질주', hint: '체력↓ 평판↑' }, { label: '엄폐물부터 확인', hint: '숙련↑' }]);
    G.fx(a === 0 ? { hp: -3, rep: 3 } : { skill: 3 });
    await H.say('drill', '오후에는 체력측정입니다. 3km 달리기!');
    const r = await MG.run();
    const gi = MG.gradeRun(r.sec);
    await H.narr(`3km ${MG.fmtSec(r.sec)} — ${D.GRADE[gi]}.`);
    if (gi === 0) {
      G.award('훈련병 체력 특급');
      G.fx({ hp: 4, rep: 4 });
    } else if (gi >= 3) G.fx({ hp: 2, mental: -2 });
    else G.fx({ hp: 2 });
    s.flags.trainRun = r.sec;
  };

  WK.airborne = async () => {
    H.place('field', [H.npc('drill', 214, { y: 160 })], { mx: 150, my: 160, variant: 'yugyeok' });
    await G.title('공수기초 · 헬기레펠', '11m 모형탑', { kicker: `훈련 ${s.week}주차` });
    await H.narr('인간이 가장 공포를 느낀다는 11m 높이. 모형탑 문 앞에 섰다.');
    await H.say('drill', '뛰어! 하나, 둘, 셋, 넷... 산개 검사!');
    const a = await G.choose(null, [{ label: '망설임 없이 뛴다', hint: '멘탈↑' }, { label: '두 번 망설이다 뛴다', hint: '평판↓' }]);
    R.shake(0.3);
    G.fx(a === 0 ? { mental: 6, rep: 3 } : { mental: 2, rep: -2 });
    await H.narr('헬기레펠 모형탑에서 줄 하나에 몸을 맡기고 내려왔다. 내려와서야 다리가 떨렸다.');
  };

  WK.march = async () => {
    const km = s.branch === 'air' ? 20 : 30;
    H.place('march', [], { night: true, formation: G.look('trainee'), mx: 150, my: 160, mpose: 'walk', km: 0 });
    await G.title(s.branch === 'air' ? '야외 종합훈련 · 행군' : '숙영 · 야간 행군', `완전군장 ${km}km`, { kicker: `훈련 ${s.week}주차` });
    await H.narr('텐트에서의 숙영 다음 날 밤. 완전군장을 메고 행군이 시작된다. 군장 무게가 어깨를 파고든다.');
    R.opt.km = Math.round(km / 3);
    await H.narr('발바닥에 물집이 잡히는 게 느껴진다. 앞사람 군장만 보고 걷는다.');
    const a = await G.choose(`${s.npc.buddy}가 절뚝거리기 시작했다.`, [{ label: '군장 일부를 대신 멘다', hint: '체력↓ 평판↑↑' }, { label: '옆에서 계속 말을 걸어 준다', hint: '평판↑' }, { label: '내 페이스에 집중한다', hint: '체력 보존' }]);
    if (a === 0) {
      await H.say('buddy', '야... 진짜 고맙다. 이건 평생 기억할게.');
      G.fx({ hp: -6, rep: 8, mental: 3 });
      s.flags.buddyBond = true;
    } else if (a === 1) G.fx({ rep: 4, mental: 2 });
    else G.fx({ hp: 2 });
    R.opt.km = Math.round((km * 2) / 3);
    await H.narr('새벽 공기가 차가워질 무렵, 멀리 부대 불빛이 보였다.');
    R.opt.km = km;
    await H.narr(`${km}km 완주. 조교가 한 명 한 명 어깨를 두드려 준다.`);
    G.fx({ hp: 3, mental: 5 });
  };

  WK.kukgi = async () => {
    H.place('march', [], { night: true, formation: G.look('trainee'), mx: 150, my: 160, mpose: 'walk', km: 0 });
    await G.title('극기주', '천자봉 고지 정복 · 약 40km', { kicker: `훈련 ${s.week}주차` });
    await H.narr('수면은 짧고, 전투식량으로 끼니를 때우는 극기주. 마지막 관문은 천자봉 고지다.');
    R.opt.km = 20;
    const a = await G.choose('새벽 4시, 완전군장으로 고지를 오른다. 다리가 풀린다.', [{ label: '"해병!" 구호를 외치며 버틴다', hint: '멘탈↑' }, { label: '앞 동기 군장 끈을 잡고 오른다', hint: '체력 보존' }]);
    G.fx(a === 0 ? { mental: 6, hp: -4 } : { hp: -1, rep: 2 });
    R.opt.km = 40;
    await H.narr('정상. 동이 트는 바다를 내려다보며, 서로를 끌어안았다.');
    G.fx({ mental: 6 });
  };

  WK.grad = async () => graduation();

  // ---------- 분류 ----------
  function classify() {
    if (s.mos) return s.mos;
    let list = D.MOS[s.branch].filter((m) => m.req !== 'license' || s.license);
    if (s.center.kind === 'div') list = list.filter((m) => m.divOK);
    return U.wpick(list, (m) => {
      let w = m.w;
      if (m.bonus && m.bonus === s.major) w *= 3;
      if (s.flags.wantGroup && m.group === s.flags.wantGroup) w *= 2.2;
      if (m.needHp && s.stats.hp < m.needHp) w = 0;
      if (s.major === 'pe' && m.group === '보병') w *= 1.3;
      return w;
    });
  }
  function subUnit(mos) {
    const n = U.randi(1, 3);
    const m = U.randi(1, 12);
    return (
      {
        inf: `${n}대대 ${m}중대`,
        arty: `포병대대 ${U.randi(1, 3)}포대`,
        armor: `전차대대 ${U.randi(1, 3)}중대`,
        eng: `공병대대 ${U.randi(1, 3)}중대`,
        cbr: '화생방지원대',
        sig: '정보통신대대',
        trans: '본부근무대 수송부',
        cook: `${n}대대 본부중대 취사반`,
        med: '의무대',
        adm: `${n}대대 본부중대 행정반`,
        mp: '군사경찰대',
      }[mos.unit] || `${n}대대 ${m}중대`
    );
  }
  function assignUnit(mos) {
    const b = s.branch;
    if (b === 'army') {
      let key;
      if (s.center.kind === 'div') key = s.center.div;
      else {
        const heavy = ['arty', 'armor', 'eng', 'cbr'].includes(mos.unit);
        const types = mos.unit === 'armor' ? [{ t: 'mech', w: 1 }] : [{ t: 'gop', w: 32 }, { t: 'front', w: 8 }, { t: 'mech', w: 12 }, { t: 'rear', w: 25 }, { t: 'capital', w: heavy ? 0 : 10 }, { t: 'corps', w: 13 }];
        const t = U.wpick(types).t;
        key = U.pick(Object.keys(D.DIVS).filter((k) => D.DIVS[k].type === t));
      }
      const dv = D.DIVS[key];
      let sub;
      if (dv.type === 'corps') sub = (mos.unit === 'arty' ? '포병여단 ' : mos.unit === 'sig' ? '통신단 ' : mos.unit === 'eng' ? '공병여단 ' : mos.unit === 'inf' ? '직할대 ' : '') + (mos.unit === 'inf' || mos.unit === 'arty' || mos.unit === 'sig' || mos.unit === 'eng' ? `${U.randi(1, 9)}중대` : subUnit(mos));
      else if (dv.type === 'capital') sub = ['inf', 'mp'].includes(mos.unit) ? `경비단 ${U.randi(1, 6)}중대` : subUnit(mos);
      else sub = subUnit(mos);
      return { name: `${dv.name}(${dv.nick}) ${sub}`, short: `${dv.nick} ${sub}`, nick: dv.nick, place: dv.place, type: dv.type, div: key, sub };
    }
    if (b === 'navy') {
      const ship = mos.ship ? U.chance(0.85) : U.chance(0.35);
      if (ship) {
        const fl = U.pick(D.NAVY_FLEETS);
        const st = U.pick(D.NAVY_SHIPS);
        return { name: `${fl.name} ${st}`, short: `${fl.name} ${st}`, nick: fl.name, place: fl.place, type: 'ship' };
      }
      const sh = U.pick(D.NAVY_SHORE);
      return { name: sh.name, short: sh.name, nick: '해군', place: sh.place, type: 'shore' };
    }
    if (b === 'air') {
      if (mos.id === 'aada' || (mos.id === 'acom' && U.chance(0.4))) {
        const st = mos.id === 'aada' ? D.AIR_SITES[0] : D.AIR_SITES[1];
        return { name: st.name, short: st.name.replace(' 예하 ', ' '), nick: st.type === 'ada' ? '방공포대' : '레이더기지', place: st.place, type: st.type };
      }
      const wg = U.pick(D.AIR_WINGS);
      const grp = { 정비: '정비전대', 보급: '군수전대', 수송: '군수전대', 군사경찰: '기지방호전대', 의무: '항공의무전대', 기상: '기상대대' }[mos.group] || '기지전대';
      return { name: `${wg.name} ${grp}`, short: wg.name, nick: wg.name.replace('제', ''), place: wg.place, type: 'wing' };
    }
    const mu = U.wpick(D.MARINE_UNITS);
    const sub =
      { 포병: `포병대대 ${U.randi(1, 3)}중대`, 수색: '수색대대', 공병: '공병대대', 통신: '통신대대', 의무: '의무대', 수송: '본부대 수송반', 조리: '본부대 취사반' }[mos.group] ||
      (mos.id === 'mkaav' ? '상륙돌격장갑차대대' : mos.id === 'mtank' ? '전차대대' : `${U.randi(1, 3)}대대 ${U.randi(1, 9)}중대`);
    const full = mu.name === mu.nick ? mu.name : `${mu.name}(${mu.nick})`;
    return { name: `${full} ${sub}`, short: `${mu.nick} ${sub}`, nick: mu.nick, place: mu.place, type: mu.type };
  }
  function schoolFor(mos) {
    const b = s.branch;
    if (b === 'army') return s.center.kind === 'ktc' && mos.school ? mos.school : null;
    if (b === 'navy') return { name: '해군교육사령부 특기교육', place: '경남 창원시 진해구', weeks: 3 };
    if (b === 'air') return { name: '공군교육사령부 특기교육', place: '경남 진주시', weeks: 3 };
    if (mos.group !== '보병') return { name: '해병대교육훈련단 특기교육', place: '경북 포항시', weeks: 2 };
    return null;
  }

  async function graduation() {
    await G.passTo(s.trainEnd);
    G.bgm('home');
    if (s.branch === 'marine') s.flags.redtag = true;
    H.place('parade', [H.npc('mom', 186, { y: 168 }), H.npc('dad', 122, { y: 168 })], { mx: 156, my: 170, formation: G.look('trainee'), banner: '수료를 축하합니다', flagColor: H.unitFlag() });
    await G.title('수료식', `${s.center.name} · ${U.fmt(s.date)}`, { kicker: '수료' });
    await H.narr('연병장에 가족들이 들어온다. 몇 주 만에 보는 얼굴들.');
    R.char('mom') && (R.char('mom').look.tear = true);
    await H.say('mom', `${H.call()}! 얼굴이 새까맣게 탔네...`);
    if (s.branch === 'marine') await H.narr('가슴에 빨간 명찰이 붙는다. 이제 정식 해병이다.');
    const rn = D.RANKS[Math.max(0, s.rankIdx)];
    await H.narr(`부모님이 직접 가슴에 ${rn} 계급장을 달아 주었다. 작대기 ${['하나', '둘', '셋', '넷'][Math.max(0, s.rankIdx)]}.`);
    s.flags.graduated = true;
    G.forceRank(Math.max(0, s.rankIdx));
    R.flash('#fff6c0', 0.5);
    await G.title(`${rn} ${s.name}`, '작대기 하나의 무게', { kicker: '계급장 수여' });
    G.log(`신병교육 수료 · ${rn}`);
    await H.say('dad', '아빠는 102보충대에서 이렇게 가족 얼굴도 못 보고 바로 실려 갔는데... 좋아졌다, 진짜.');
    // 분류 결과
    const mos = classify();
    s.mos = mos;
    s.unit = assignUnit(mos);
    s.school = schoolFor(mos);
    const u = s.unit;
    await H.doc(
      '분류 결과',
      `<h2 class="doc-title">주특기 · 자대 분류 결과</h2>
      <table class="kv">
        <tr><th>성명</th><td>${G.rankName()} ${U.esc(s.name)} (${s.serviceNo})</td></tr>
        <tr><th>주특기</th><td><b>${mos.code ? mos.code + ' ' : ''}${U.esc(mos.name)}</b> (${U.esc(mos.group)})</td></tr>
        <tr><th>${s.school ? '후반기 교육' : '교육'}</th><td>${s.school ? `${U.esc(s.school.name)} · ${U.esc(s.school.place)} · ${s.school.weeks}주` : '자대 전입 후 직무교육(OJT)'}</td></tr>
        <tr><th>자대</th><td><b>${U.esc(u.name)}</b></td></tr>
        <tr><th>위치</th><td>${U.esc(u.place)}</td></tr>
      </table>
      <p class="small">분류는 전공·자격·적성과 부대 소요를 반영해 전산으로 결정됩니다.</p>`,
      { cls: 'order', btn: '확인' }
    );
    G.log(`주특기 ${mos.name} · 자대 ${u.name}`);
    const react = {
      gop: `${u.place}... 최전방 GOP 철책이다. 산 넘어 산이겠구나.`,
      front: `${u.place}. 서울에서 멀지 않은 전방 사단이다.`,
      mech: '기계화 부대! 전차와 장갑차 소리에 익숙해져야겠다.',
      rear: `향토사단, ${u.place}. 집이랑 가깝다는 소문이 진짜였으면.`,
      capital: '수도방위사령부? 서울 한복판에서 군 생활이라니.',
      corps: `${u.place}, 군단 직할부대. 춘천이라니 아빠 생각이 나네.`,
      ship: '배를 탄다. 진짜 바다 사나이가 되는 건가.',
      shore: '육상 근무다. 배멀미는 피했다!',
      wing: `${u.place} 비행단. 전투기 소리가 자장가가 되겠지.`,
      ada: '방공포대... 산꼭대기라던데.',
      radar: '레이더기지. 구름 위에서 근무한다는 그곳.',
      mdiv: `${u.place}. 해병대 사단 본진이다.`,
      island: `${u.place}! 서북도서다. 배 타고 몇 시간을 들어가야 한다.`,
      jeju: '제주도! 다들 부러워하는 그곳.',
    }[u.type];
    await H.me(react || '어디든 가 보자.');
    await H.say('buddy', `나는 ${U.pick(['포병', '취사', '운전', '수송', '통신', '보병'])}이래. 다른 데로 가네... 전역하고 꼭 보자.`);
  }

  // ======================================================
  // 후반기(특기) 교육
  // ======================================================
  St.school = async () => {
    H.bind();
    await G.pass(2);
    const sc = s.school;
    H.place('classroom', [H.npc('drill', 236, { y: 166, look: { rank: 0, nco: true } })], { mx: 150, my: 168, board: `${sc.name}\n${s.mos.name} 과정` });
    G.bgm('unit');
    await G.title(s.branch === 'army' ? '후반기 교육' : '특기 교육', `${sc.name} · ${sc.place} · ${sc.weeks}주`, { kicker: s.mos.name });
    await H.narr(`${sc.place}. 같은 주특기를 받은 이병들이 전국에서 모였다.`);
    const tips = {
      보병: '화기 분해·결합부터.',
      포병: '사격지휘, 방열, 포반 임무. 숫자 하나 틀리면 탄이 엉뚱한 곳에 떨어진다.',
      기갑: '전차 승무 절차와 정비. 쇳덩이 안의 열기가 상상 이상이다.',
      공병: '지뢰 탐지, 장애물 설치, 교량. 삽질도 기술이다.',
      화생방: '탐지, 제독, 보호. 방독면이 이제 몸의 일부다.',
      정보통신: '무전기, 통신망 구성, 암호 절차.',
      수송: '군 차량 운전 교육. 수동 변속기와 좁은 산길.',
      병참: '대량 조리, 위생 관리. 수백 인분 국을 젓는다.',
      의무: '전투부상자 처치, 응급처치, 환자 후송.',
      인사행정: '공문서, 인사 행정 체계, 보안.',
      군사경찰: '경계, 출입 통제, 교통 통제 절차.',
    };
    await H.narr(tips[s.mos.group] || `${s.mos.group} 직무의 기초부터 실습까지. 사회에서 써먹을 수 있는 것도 많다.`);
    const a = await G.choose('수료 평가가 다가온다.', [{ label: '일과 후에도 교범 복습', hint: '숙련↑↑' }, { label: '동기들과 문제 공유', hint: '숙련↑ 평판↑' }, { label: '적당히 통과만', hint: '멘탈↑' }]);
    if (a === 0) G.fx({ skill: 9, mental: -2 });
    else if (a === 1) G.fx({ skill: 5, rep: 4 });
    else G.fx({ skill: 2, mental: 4 });
    if (s.stats.skill >= 60 && U.chance(0.5)) {
      G.award(`${sc.name} 우수 수료`);
      G.fx({ rep: 4 });
    }
    await G.pass(sc.weeks * 7 - 3);
    G.log(`${sc.name} 수료`);
    s.phase = 'transfer';
  };

  // ======================================================
  // 자대 전입
  // ======================================================
  St.transfer = async () => {
    H.bind();
    await G.pass(1);
    G.bgm('unit');
    const u = s.unit;
    const nm = U.uniqueNames(3, Object.values(s.npc));
    s.npc.sgt = nm[0];
    s.npc.senior = nm[1];
    s.npc.junior = nm[2];
    if (u.type === 'ship') H.place('port', [], { mx: 150 });
    else if (u.type === 'wing') H.place('airbase', [], { mx: 150 });
    else H.place('unitgate', [], { mx: 160, my: 168, sign: H.unitSign(), slogan: s.branch === 'marine' ? '누구나 해병이 될 수 있다면 나는 해병대를 선택하지 않았을 것이다' : '필승! 강한 부대', open: true });
    await G.title('자대 전입', u.name, { kicker: U.fmt(s.date) });
    await H.narr(`${u.place}. ${u.type === 'island' ? '여객선을 몇 시간 타고 들어온 섬.' : '부대 차량에서 내리자 낯선 공기가 훅 끼친다.'} 이제부터 이곳이 집이다.`);
    H.place('office', [H.npc('cpt', 214, { y: 164 }), H.npc('ssg', 262, { y: 166 })], { mx: 150, my: 166, board: '전입 신병 환영' });
    await H.report(`${U.fmtK(s.date)}부로 ${u.name}${H.j(u.name, '으로').slice(u.name.length)} 전입을 명받았습니다`);
    await H.say('cpt', `반갑다, ${s.name}. 여기선 계급보다 사람이 먼저다. 힘든 일 있으면 언제든 말하고.`);
    await H.say('ssg', '보급품은 행정반에서 받고. 처음 2주는 신병 적응 기간이다. 천천히 배워.');
    await H.narr(`신병 위로휴가 4일이 부여되었다. 첫 휴가는 보통 전입 후 몇 달 안에 나간다.`);
    G.fx({ comfort: 4 });
    // 생활관
    H.place(H.home(), [H.npc('sgt', 214), H.npc('senior', 98)], { mx: 156, motto: '병영생활 행동강령' });
    await H.say('sgt', `${H.role('sgt')} ${s.npc.sgt}이다. 모르는 건 물어보면 되고, 혼자 끙끙대는 게 제일 안 좋다.`);
    await H.say('senior', `난 바로 위 맞선임 ${s.npc.senior}. 일과표랑 근무표 보는 법부터 알려 줄게.`);
    const a = await G.choose('첫인사.', [{ label: '"잘 부탁드립니다!" 씩씩하게', hint: '평판↑' }, { label: '"...잘 부탁드립니다." 긴장해서', hint: '멘탈↓' }, { label: '준비해 온 유머로 분위기 풀기', hint: '모 아니면 도' }]);
    if (a === 0) G.fx({ rep: 4 });
    else if (a === 1) G.fx({ mental: -2, rep: 1 });
    else if (U.chance(0.55)) {
      await H.narr('생활관이 빵 터졌다. 맞선임이 "얘 물건이네" 하며 웃는다.');
      G.fx({ rep: 7, mental: 4 });
    } else {
      await H.narr('...정적. 에어컨 소리만 들린다.');
      G.fx({ rep: -2, mental: -3 });
    }
    await H.narr('저녁. 일과 후 휴대폰 사용 시간. 집에 전화를 걸었다.');
    await G.say('엄마(전화)', `${u.place}? 거기 춥다던데 내복 보내 줄까? 아빠가 벌써 지도 앱으로 길 찾아봤어.`);
    G.fx({ mental: 4 });
    s.flags.unitStart = s.date;
    s.flags.lastLeave = s.date;
    s.flags.rankSeen = s.rankIdx;
    s.phase = 'unit';
  };

  // ======================================================
  // 매월 진행
  // ======================================================
  const finalNear = () => U.diff(s.date, s.dischargeDate) <= G.leaveLeft() + 16;

  St.unitMonth = async () => {
    H.bind();
    const EV = DM.EV;
    if (finalNear()) {
      s.phase = 'final';
      return;
    }
    const start = s.date;
    const m = U.month(start);
    const endOfMonth = U.addDays(U.nextMonth1(start), -1);
    G.bgm(s.dispatch ? 'dispatch' : 'unit');
    await G.title(`${U.year(start)}년 ${m}월`, `${G.rankName()} ${s.name} · 전역 D-${G.dday()}`, { kicker: s.unit ? s.unit.short : '' });
    // 진급 신고
    if (s.rankIdx > (s.flags.rankSeen ?? 0)) {
      s.flags.rankSeen = s.rankIdx;
      H.place('office', [H.npc('cpt', 214, { y: 164 })], { mx: 150, my: 166, board: '진급 신고' });
      await H.report(`${U.fmtK(U.firstOfMonth(start))}부로 ${G.rankName()} 진급을 명받았습니다`);
      await H.say('cpt', ['', '이제 일병이네. 후임 생기면 잘 챙겨 줘.', '상병이다. 이제 부대의 허리다. 후임들이 너를 보고 배운다.', '병장 축하한다. 마지막까지 모범을 보여 줘.'][s.rankIdx] || '축하한다.');
    }
    const fixed = EV.fixedFor(s, m);
    const n = G.pref.fast ? (fixed ? 0 : 1) : fixed ? 1 : 2;
    const picks = EV.pick(s, n, fixed ? [fixed.id] : []);
    const list = (fixed ? [fixed] : []).concat(picks);
    const days = U.shuffle([4, 8, 13, 17, 21, 25].filter((d) => d > U.day(start))).slice(0, list.length).sort((a, b) => a - b);
    for (let i = 0; i < list.length; i++) {
      const ev = list[i];
      const dday = U.addDays(U.firstOfMonth(start), (days[i] || U.day(start) + 1) - 1);
      if (dday > endOfMonth) break;
      await G.passTo(dday);
      s.seen[ev.id] = (s.seen[ev.id] || 0) + 1;
      s.lastEv = ev.id;
      await ev.run(s, H);
      if (s.phase !== 'unit') return;
      if (finalNear()) break;
    }
    // 파견 판단 (원소속에서 명령 하달)
    if (!s.dispatch && !finalNear()) {
      const dp = EV.dispatchFor(s, m);
      if (dp) {
        await DM.St.runDispatch(dp);
        if (s.phase !== 'unit') return;
      }
    }
    // 휴가
    if (!finalNear()) await St.maybeLeave();
    // 전역이 가까우면 남은 날을 넘기지 않고 바로 전역 준비로(말년휴가 일수 확보)
    if (finalNear()) {
      s.phase = 'final';
      return;
    }
    await G.passTo(U.max(U.nextMonth1(start), s.date));
  };

  // ---------- 휴가 ----------
  const monthsSince = (d) => (U.year(s.date) - U.year(d)) * 12 + U.month(s.date) - U.month(d);
  St.maybeLeave = async () => {
    if (s.dispatch || G.leaveLeft() <= 0) return;
    if (!s.flags.firstLeave) {
      if (U.diff(s.enlistDate, s.date) < 80) return;
      s.flags.firstLeave = true;
      const add = Math.min(G.leaveLeft(), 4 + Math.min(5, Math.max(0, G.leaveLeft() - 4)));
      const c = await G.choose(`드디어 첫 휴가! 신병 위로휴가 4일에 정기휴가를 붙여 나갈 수 있다. (남은 휴가 ${G.leaveLeft()}일)`, [
        { label: `${add}일 나간다`, hint: '위로휴가 + 정기휴가' },
        { label: '4일만 나간다', hint: '연가 아껴 두기' },
      ]);
      await St.leave(c === 0 ? add : 4, c === 0 ? '위로·정기' : '신병위로');
      return;
    }
    if (monthsSince(s.flags.lastLeave || s.enlistDate) < 2) return;
    const left = G.leaveLeft();
    const daysToEnd = U.diff(s.date, s.dischargeDate);
    if (daysToEnd < 50) return;
    const opts = [3, 5, 7, 9].filter((d) => d <= left);
    if (!opts.length) return;
    const c = await G.choose(`휴가를 쓸 수 있다. (남은 휴가 ${left}일 · 말년휴가로 아껴 둘 수도 있다)`, [...opts.map((d) => ({ label: `${d}일 휴가 나가기` })), { label: '이번엔 참는다', hint: '말년에 몰아 쓰기' }]);
    if (c < opts.length) await St.leave(opts[c], '정기');
    else s.flags.lastLeave = s.date;
  };

  St.leave = async (days, kind, opt = {}) => {
    const start = opt.start || U.addDays(s.date, 1);
    await G.passTo(start);
    const end = U.addDays(start, days - 1);
    H.place('office', [H.npc('cpt', 214, { y: 164 })], { mx: 150, my: 166, board: '휴가 신고' });
    await H.report(`${U.month(start)}월 ${U.day(start)}일부터 ${U.month(end)}월 ${U.day(end)}일까지 ${days - 1}박 ${days}일간 ${kind}휴가를 명받았습니다`);
    await H.say('cpt', opt.final ? '말년휴가 잘 다녀와라. 사고 없이, 건강하게.' : '조심히 다녀와. 복귀 시간 꼭 지키고.');
    s.leave.used += days;
    s.flags.lastLeave = start;
    G.log(`${kind}휴가 ${days}일 (${U.fmt(start)}~${U.fmt(end)})`);
    G.bgm('home');
    H.place('street', [], { mx: 120, mpose: 'walk' });
    await H.narr(`위병소를 나서는 순간, 공기 맛이 다르다. ${s.hometown}까지 가는 길이 이렇게 설렐 줄이야.`);
    await DM.EV.leaveEvent(s, H, days);
    await G.passTo(end);
    // 복귀
    const back = opt.final ? null : U.addDays(end, 0);
    if (back) {
      G.bgm('unit');
      H.place('unitgate', [], { mx: 160, my: 168, sign: H.unitSign(), dusk: true });
      await H.narr(U.pick(['복귀 전날 밤은 왜 이렇게 짧은지.', '부대 정문이 다시 보인다. 발걸음이 무겁다.', '휴가 복귀 버스 안. 다들 말이 없다.']));
      H.place('office', [H.npc('lt', 214, { y: 164 })], { mx: 150, my: 166, board: '복귀 신고', night: true });
      await H.report(`${kind}휴가를 마치고 ${U.fmtK(end)}부로 복귀를 명받았습니다`);
      G.fx({ mental: 4, hp: 3 }, true);
      await G.pass(1);
    }
  };

  // ======================================================
  // 파견 (실제 절차: 명령 하달 → 출발 신고 → 파견지 신고 → 임무 → 원대 복귀 신고)
  // ======================================================
  const issuerOf = () => {
    const u = s.unit || {};
    if (s.branch === 'army') return u.div ? `${D.DIVS[u.div].name}` : '육군';
    if (s.branch === 'navy') return u.type === 'ship' ? u.nick || '해군 함대' : '해군작전사령부';
    if (s.branch === 'air') return u.short || '공군';
    return u.name ? u.name.split('(')[0] : '해병대사령부';
  };
  H.orderDoc = (o) =>
    H.doc(
      '명령',
      `<div class="doc-no">${U.esc(o.issuer)} 일반명령 제${o.no}호</div>
      <div class="doc-date">${U.fmt(o.date)}</div>
      <h2 class="doc-title">${U.esc(o.title)}</h2>
      <p>1. 다음 인원을 아래와 같이 ${o.verb || '파견'}함.</p>
      <table class="grid"><tr><th>계급</th><th>성명</th><th>군번</th><th>원소속</th></tr>
      <tr><td>${G.rankName()}</td><td>${U.esc(s.name)}</td><td>${s.serviceNo}</td><td>${U.esc(s.unit ? s.unit.short : '-')}</td></tr></table>
      <table class="kv">
        <tr><th>${o.verb === '입교' ? '교육기관' : '파견부대(지역)'}</th><td>${U.esc(o.place)}</td></tr>
        <tr><th>기간</th><td>${U.fmt(o.start)} ~ ${U.fmt(o.end)} (${U.diff(o.start, o.end) + 1}일)</td></tr>
        <tr><th>임무</th><td>${U.esc(o.mission)}</td></tr>
      </table>
      <p>2. ${o.verb === '입교' ? '교육' : '파견'} 기간 중 원 소속을 유지하며, 인사·급여는 원 소속 부대에서 처리함.</p>
      <p>3. 종료 즉시 원대 복귀하여 신고할 것.</p>
      ${o.extra ? `<p>${o.extra}</p>` : ''}
      <div class="sign">${U.esc(o.signer || `${o.issuer}장`)} <span class="seal">직인</span></div>`,
      { cls: 'order', btn: '명 받았습니다' }
    );

  St.runDispatch = async (dp) => {
    H.bind();
    if (dp.pre) {
      const ok = await dp.pre(s, H);
      if (!ok) return;
    }
    const start = U.addDays(s.date, dp.lead ?? 2);
    const len = typeof dp.days === 'function' ? dp.days(s) : dp.days;
    const end = U.addDays(start, len - 1);
    if (end >= U.addDays(s.dischargeDate, -(G.leaveLeft() + 20))) {
      await H.narr('남은 복무기간이 부족해 명령이 취소되었다.');
      return;
    }
    const issuer = dp.issuer ? dp.issuer(s) : issuerOf();
    const o = { issuer, no: U.randi(80, 420), date: s.date, title: dp.orderTitle || `${dp.name} ${dp.verb === '입교' ? '입교' : '파견'} 명령`, place: dp.place(s), start, end, mission: dp.mission, verb: dp.verb, extra: dp.extra, signer: dp.signer ? dp.signer(s) : null };
    H.place('office', [H.npc('cpt', 214, { y: 164 }), H.npc('ssg', 262, { y: 166 })], { mx: 150, my: 166, board: dp.verb === '입교' ? '교육 입교' : '파견 명령' });
    await H.say('ssg', `${s.name}, 명령 나왔다. ${dp.name}.`);
    await H.orderDoc(o);
    await H.say('cpt', dp.brief || '원 소속은 그대로다. 가서 우리 부대 이름 걸고 잘하고 와라.');
    await G.passTo(start);
    await H.report(`${U.fmtK(start)}부로 ${o.place} ${dp.name} ${dp.verb === '입교' ? '입교' : '파견'}을 명받았습니다`);
    s.dispatch = { id: dp.id, name: dp.name, short: dp.short || dp.name, place: o.place, start, end, allowance: dp.allowance || 0, un: !!dp.un };
    s.dispatches.push({ id: dp.id, name: dp.name, place: o.place, start, end });
    G.log(`${dp.name} ${dp.verb === '입교' ? '입교' : '파견'} (${U.fmt(start)}~${U.fmt(end)})`);
    G.refreshMe();
    G.bgm('dispatch');
    await dp.run(s, H, { start, end });
    await G.passTo(end);
    // 원대 복귀
    s.dispatch = null;
    G.refreshMe();
    G.bgm('unit');
    H.place('office', [H.npc('cpt', 214, { y: 164 })], { mx: 150, my: 166, board: '원대 복귀' });
    await H.report(`${U.fmtK(end)}부로 ${dp.name} ${dp.verb === '입교' ? '교육을 마치고' : '파견을 마치고'} 원대 복귀를 명받았습니다`);
    await H.say('cpt', dp.welcome || '수고 많았다. 덕분에 부대 이름이 섰다. 오늘은 푹 쉬어.');
    if (dp.after) await dp.after(s, H);
    await G.pass(1);
  };

  // ======================================================
  // 전역
  // ======================================================
  St.final = async () => {
    H.bind();
    G.bgm('unit');
    const left = G.leaveLeft();
    const lastDay = U.addDays(s.dischargeDate, -1);
    let lv = Math.max(0, Math.min(left, U.diff(s.date, lastDay) - 1));
    const leaveStart = U.addDays(lastDay, -lv);
    await G.title('전역 준비', `전역 D-${G.dday()} · 남은 휴가 ${left}일`, { kicker: G.rankName() });
    // 인수인계
    H.place(H.home(), [H.npc('junior', 214)], { mx: 150 });
    await H.say('junior', `${G.rankName()}님 진짜 가십니까... ${s.mos.name} 업무, 아직 자신 없습니다.`);
    const a = await G.choose('후임에게 인수인계.', [{ label: '노트에 꼼꼼히 정리해 넘긴다', hint: '평판↑' }, { label: '"넌 잘할 거야" 어깨 두드리기', hint: '멘탈↑' }]);
    G.fx(a === 0 ? { rep: 6 } : { mental: 4, rep: 2 });
    H.place('classroom', [], { mx: 160, my: 168, board: '전역 예정 장병 교육\n예비군 편성 · 취업 지원' });
    await H.narr('전역 예정 장병 교육. 전역하면 예비군에 편성된다. 1~4년차는 동원훈련, 그 뒤로는 기본·작계훈련... 총 8년이다.');
    if (lv > 0) {
      await G.passTo(U.addDays(leaveStart, -1));
      await H.narr(`말년휴가 ${lv}일. 남은 휴가를 전부 몰아서 나간다. 복귀하면 바로 전역이다.`);
      await St.leave(lv, '말년', { start: leaveStart, final: true });
      await G.passTo(lastDay);
      H.place('unitgate', [], { mx: 160, my: 168, sign: H.unitSign(), dusk: true });
      await H.narr('말년휴가 복귀. 이번이 마지막으로 이 정문을 들어오는 날이다.');
    } else await G.passTo(lastDay);
    // 전역 전날 밤
    H.place('barracks', [H.npc('junior', 104, { pose: 'sit', y: 150 }), H.npc('buddy', 214, { pose: 'sit', y: 150 })], { mx: 160, my: 150, mpose: 'sit', night: true });
    await H.narr('전역 전날 밤. 후임들이 롤링페이퍼를 내민다.');
    await H.say('junior', `${G.rankName()}님 덕분에 버텼습니다. 사회 나가서도 꼭 연락 주십시오!`);
    await H.me('너희도 몸 건강히. 남은 시간 금방 간다.');
    // 전역일
    await G.passTo(s.dischargeDate);
    if (s.rankIdx < 3) {
      // 진급이 계속 누락돼도 전역일에는 병장으로 전역(훈령 개정안 취지 반영)
      G.forceRank(3);
      G.log('전역일부 병장 진급');
    }
    H.place('office', [H.npc('cpt', 214, { y: 164 }), H.npc('ssg', 262, { y: 166 })], { mx: 150, my: 166, board: '전역 신고' });
    G.bgm('discharge');
    await G.title('전역', `${U.fmt(s.dischargeDate)}`, { kicker: `D-0 · ${s.unit ? s.unit.short : ''}` });
    await H.report(`${U.fmtK(s.dischargeDate)}부로 전역을 명받았습니다`);
    await H.say('cpt', `${G.totalDays()}일 동안 고생 많았다, ${s.name}. 이제 사회에서 더 크게 되어라.`);
    await H.say('ssg', '예비군 훈련 때 딴짓하지 말고! ...잘 가라.');
    H.place('unitgate', [H.npc('junior', 260, { y: 168 }), H.npc('mom', 96, { y: 168 }), H.npc('dad', 74, { y: 168 })], { mx: 160, my: 168, sign: H.unitSign(), open: true, dusk: true });
    R.char('junior') && (R.char('junior').pose = 'salute');
    await H.narr('위병소 차단기가 올라간다. 후임들이 정문까지 따라 나와 경례한다.');
    R.pose('me', 'salute');
    await H.me(`${H.sal()}!`);
    R.pose('me', 'cheer');
    s.phase = 'end';
    G.refreshMe();
    R.opt.fireworks = true;
    await H.say('mom', `${H.call()}!! 고생했다, 정말 고생했어!`);
    G.log('전역');
  };

  // ---------- 엔딩 ----------
  St.ending = async () => {
    H.bind();
    G.bgm('discharge');
    if (R.scene !== 'unitgate') H.place('unitgate', [H.npc('mom', 96, { y: 168 }), H.npc('dad', 74, { y: 168 })], { mx: 160, my: 168, sign: H.unitSign(), open: true, night: true, fireworks: true, mpose: 'cheer' });
    R.opt.fireworks = true;
    G.hud();
    const months = D.BRANCH[s.branch].months;
    const sav = s.money.saving;
    const interest = Math.round(sav * D.SAVING_RATE * (months / 2 / 12));
    const total = sav * 2 + interest;
    const titles = [];
    const has = (t) => s.awards.some((a) => a.t.includes(t));
    if (has('특급전사')) titles.push('특급전사');
    if (s.dispatches.some((d) => d.id === 'dongmyeong')) titles.push('평화유지군');
    if (s.dispatches.some((d) => d.id === 'cheonghae')) titles.push('아덴만의 수병');
    if (has('표창')) titles.push('표창 수상자');
    if (s.stats.rep >= 80) titles.push('모범 병사');
    if (s.flags.squadLeader) titles.push('분대장');
    if (s.miss.some((x) => x > 0)) titles.push('파란만장');
    const headline = titles[0] ? `${titles[0]} 전역` : '무사 전역';
    await H.doc(
      '전역',
      `<div class="doc-top">전 역 증 서</div>
      <h2 class="doc-title">${U.esc(headline)}</h2>
      <table class="kv">
        <tr><th>성명</th><td>${U.esc(s.name)} (${s.serviceNo})</td></tr>
        <tr><th>군 · 계급</th><td>${D.BRANCH[s.branch].name} 병장</td></tr>
        <tr><th>복무</th><td>${U.fmt(s.enlistDate)} ~ ${U.fmt(s.dischargeDate)} (${G.totalDays()}일)</td></tr>
        <tr><th>입영부대</th><td>${U.esc(s.center.name)}</td></tr>
        <tr><th>주특기</th><td>${U.esc((s.mos.code ? s.mos.code + ' ' : '') + s.mos.name)}</td></tr>
        <tr><th>소속</th><td>${U.esc(s.unit.name)}</td></tr>
        <tr><th>파견</th><td>${s.dispatches.length ? s.dispatches.map((d) => U.esc(d.name)).join(', ') : '없음'}</td></tr>
        <tr><th>포상·표창</th><td>${s.awards.length ? s.awards.map((a) => U.esc(a.t)).join(', ') : '없음'}</td></tr>
        <tr><th>휴가 사용</th><td>${s.leave.used}일</td></tr>
        <tr><th>봉급 누계</th><td>${U.won(s.money.totalPay)}${s.money.extra ? ` (+파병수당 ${U.won(s.money.extra)})` : ''}</td></tr>
        <tr><th>적금 만기</th><td>원금 ${U.won(sav)} + 매칭 ${U.won(sav)} + 이자 약 ${U.won(interest)} = <b>약 ${U.won(total)}</b></td></tr>
        <tr><th>칭호</th><td>${titles.length ? titles.map(U.esc).join(' · ') : '평범하지만 대단한 전역자'}</td></tr>
      </table>
      <p class="small">체력 ${s.stats.hp} · 멘탈 ${s.stats.mental} · 숙련 ${s.stats.skill} · 평판 ${s.stats.rep}. 적금 이자는 게임용 가정치(연 ${Math.round(D.SAVING_RATE * 100)}%)입니다. 예비군은 전역 다음 해부터 8년간 편성됩니다.</p>
      <div class="sign">${U.fmt(s.dischargeDate)} <span class="seal">전역</span></div>`,
      { cls: 'notice', btn: '끝 — 처음 화면으로' }
    );
    await G.title('수고하셨습니다', `${s.name}의 ${G.totalDays()}일`, { kicker: 'THE END', ms: 3000 });
  };

  St.H = H;
})(window.DM);
