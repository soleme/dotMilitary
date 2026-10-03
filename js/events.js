// 자대 생활 이벤트 풀 · 계절 고정 이벤트 · 파견/파병 · 휴가 이벤트
(function (DM) {
  const U = DM.U;
  const D = DM.DATA;
  const G = DM.G;
  const R = DM.R;
  const MG = DM.MG;

  const EV = { pool: [], byId: {} };
  const add = (e) => {
    const ev = Object.assign({ w: 10, cool: 4 }, e);
    EV.pool.push(ev);
    EV.byId[ev.id] = ev;
  };
  const ship = (s) => s.unit && s.unit.type === 'ship';
  const wing = (s) => s.branch === 'air' && s.unit && s.unit.type === 'wing';
  const ground = (s) => s.branch === 'army' || s.branch === 'marine';
  const ut = (s) => (s.unit ? s.unit.type : '');
  const monthsBetween = (a, b) => (U.year(b) - U.year(a)) * 12 + U.month(b) - U.month(a);

  // 숙소 장면(함정은 함정, 산 정상 포대는 포대)
  const living = (H, npcs, opt = {}) => H.place(H.home(), npcs, opt);

  // ======================================================
  // 랜덤 이벤트
  // ======================================================
  add({
    id: 'guard',
    w: 14,
    cool: 2,
    run: async (s, H) => {
      const t = ut(s);
      if (t === 'gop') H.place('gop', [H.npc('senior', 222, { pose: 'rifle' })], { mx: 150, mpose: 'rifle' });
      else if (t === 'ship') H.place('ship', [H.npc('senior', 210)], { night: true, mx: 150 });
      else if (wing(s)) H.place('airbase', [H.npc('senior', 210, { pose: 'rifle' })], { night: true, mx: 150, mpose: 'rifle' });
      else H.place('unitgate', [H.npc('senior', 238, { pose: 'rifle', y: 168 })], { night: true, mx: 196, my: 168, mpose: 'rifle', sign: H.unitSign() });
      const what = t === 'gop' ? 'GOP 철책 경계근무' : t === 'ship' ? '함교 견시 당직' : wing(s) ? '활주로 외곽 경계근무' : '야간 위병소 근무';
      await H.narr(`새벽 2시, ${what}. 별이 쏟아질 것 같은 밤이다.`);
      await H.say('senior', s.rankIdx <= 1 ? '졸리면 말해. 근무는 둘이 서는 거다.' : '야, 요즘 표정 좋다. 전역하면 뭐 할 거냐?');
      const c = await G.choose('졸음이 몰려온다.', [
        { label: '꼿꼿이 서서 정면 주시', hint: '평판↑ 체력↓' },
        { label: '선임과 조용히 이야기', hint: '멘탈↑' },
        { label: '잠깐만 눈을 붙인다', hint: '위험' },
      ]);
      if (c === 0) G.fx({ rep: 3, hp: -2 });
      else if (c === 1) {
        await H.narr('고향 이야기, 전역 후 계획... 근무 시간이 금방 갔다.');
        G.fx({ mental: 5 });
      } else if (U.chance(0.45)) {
        R.emote('me', '!');
        await G.say(H.role('lt'), '근무 중 취침? 이건 그냥 넘어갈 수 없다.');
        await H.narr('경계근무 태만으로 지적을 받았다. 진급 심사에 반영될 수 있다.');
        s.flags.discipline = true;
        G.fx({ rep: -8, mental: -5 });
      } else G.fx({ hp: 3 });
    },
  });

  add({
    id: 'px',
    w: 12,
    cool: 2,
    when: (s) => !ship(s),
    run: async (s, H) => {
      H.place('px', [H.npc('buddy', 204)], { mx: 140 });
      await H.say('buddy', '오늘 냉동 한 판 어때? 물은 내가 끓일게.');
      const c = await G.choose('PX 장바구니.', [
        { label: '냉동 치킨·핫바·라면 풀코스', hint: '멘탈↑↑ · 2만 원' },
        { label: '과자 몇 봉지만', hint: '멘탈↑ · 5천 원' },
        { label: '적금 생각해서 참는다', hint: '통장 보존' },
      ]);
      if (c === 0) {
        await H.narr('전자레인지 앞에 줄 선 전우들. 이 맛에 군 생활 한다.');
        G.fx({ mental: 8, money: -20000, hp: 1 });
      } else if (c === 1) G.fx({ mental: 3, money: -5000 });
      else G.fx({ mental: -1 });
    },
  });

  add({
    id: 'phone',
    w: 12,
    cool: 2,
    run: async (s, H) => {
      if (ship(s)) H.place('port', [H.npc('buddy', 204)], { mx: 150, night: true });
      else H.place('barracks', [H.npc('buddy', 106, { pose: 'sit', y: 150 })], { mx: 170, my: 150, mpose: 'sit', night: true, phone: true });
      await H.narr(ship(s) ? '입항 중 저녁, 휴대폰 사용 시간. 갑판 위로 하나둘 화면 불빛이 켜진다.' : '18시, 휴대폰 사용 시간. 생활관에 화면 불빛이 하나둘 켜진다.');
      const c = await G.choose('오늘은 뭘 할까?', [
        { label: '집에 영상통화', hint: '멘탈↑' },
        { label: '자격증 인강 듣기', hint: '숙련↑' },
        { label: '친구들 단톡방 정주행', hint: '멘탈?' },
        { label: '게임 한 판', hint: '멘탈↑' },
      ]);
      if (c === 0) {
        await G.say('엄마(영상통화)', `얼굴 좋아 보이네! ${U.pick(['아빠가 네 방 청소했어.', '강아지가 네 방 앞에서 자.', '할머니가 김치 보내신대.'])}`);
        G.fx({ mental: 6 });
      } else if (c === 1) G.fx({ skill: 5, mental: -1 });
      else if (c === 2) {
        if (U.chance(0.5)) {
          await H.narr('다들 개강, 여행, 연애 이야기뿐이다...');
          G.fx({ mental: -4 });
        } else {
          await H.narr(`${s.npc.friend}: "휴가 언제 나오냐? 나오면 바로 연락해!"`);
          G.fx({ mental: 5 });
        }
      } else G.fx({ mental: 5 });
    },
  });

  add({
    id: 'sports',
    w: 10,
    cool: 3,
    when: (s) => !ship(s),
    run: async (s, H) => {
      H.place('parade', [H.npc('sgt', 222), H.npc('senior', 98)], { mx: 160, banner: '전투체육' });
      await H.narr('수요일 오후 전투체육. 종목은 부대 전통의 족구다.');
      const c = await G.choose('포지션은?', [
        { label: '공격 (스파이크)', hint: '모 아니면 도' },
        { label: '수비 (리시브)', hint: '안정' },
        { label: '응원 담당', hint: '평판↑' },
      ]);
      if (c === 0) {
        if (U.chance(0.45 + s.stats.hp / 250)) {
          R.emote('me', '!');
          await H.narr('결정적인 스파이크! 생활관이 들썩였다.');
          G.fx({ rep: 6, mental: 5 });
        } else {
          await H.narr('헛발질... 공이 하늘 높이 날아갔다.');
          G.fx({ rep: -2, mental: 2 });
        }
      } else if (c === 1) G.fx({ rep: 3, hp: 2 });
      else G.fx({ rep: 4, mental: 3 });
    },
  });

  add({
    id: 'meal',
    w: 9,
    cool: 3,
    run: async (s, H) => {
      const menu = U.pick(['군대리아', '특식 치킨', '돼지불백', '부대찌개', '짜장 특식']);
      H.place('mess', [H.npc('buddy', 204)], { mx: 140, menu: `오늘의 메뉴: ${menu}` });
      if (['병참', '조리'].includes(s.mos.group)) {
        await H.narr(`오늘은 내가 조리한 ${menu}. 수백 인분을 만드느라 팔이 떨어질 것 같다.`);
        const c = await G.choose(null, [{ label: '간을 한 번 더 본다', hint: '평판↑' }, { label: '레시피대로 간다', hint: '안정' }]);
        G.fx(c === 0 ? { rep: 6, hp: -2 } : { rep: 2 });
        return;
      }
      await H.narr(`점심 메뉴는 ${menu}.${menu === '군대리아' ? ' 빵에 패티, 잼, 샐러드를 끼워 직접 조립하는 그 메뉴.' : ''}`);
      const c = await G.choose(null, [{ label: '취사병에게 "잘 먹겠습니다!"', hint: '평판↑' }, { label: '잔반 없이 깨끗이', hint: '체력↑' }]);
      G.fx(c === 0 ? { rep: 3, mental: 2 } : { hp: 3 });
    },
  });

  add({
    id: 'mail',
    w: 8,
    cool: 5,
    run: async (s, H) => {
      living(H, [H.npc('ssg', 222)], { mx: 150 });
      await H.say('ssg', `${s.name}, 소포 왔다.`);
      const item = U.pick(['엄마표 밑반찬과 편지', '할머니가 보낸 손뜨개 목도리', '친구들이 보낸 과자 한 박스와 롤링페이퍼', '아빠가 보낸 책 세 권과 짧은 편지']);
      await H.narr(`${item}. 생활관 전우들과 나눴다.`);
      G.fx({ mental: 6, rep: 2 });
    },
  });

  add({
    id: 'sick',
    w: 6,
    cool: 6,
    run: async (s, H) => {
      H.place('clinic', [{ key: 'doc', look: G.look('doctor'), x: 214, name: '군의관' }], { mx: 150 });
      await H.narr(U.pick(['며칠째 기침이 멈추지 않는다.', '훈련 중 발목을 접질렸다.', '열이 38도를 넘었다.']));
      const c = await G.choose(null, [{ label: '바로 의무대에 간다', hint: '체력↑' }, { label: '참고 일과에 나간다', hint: '평판↑ 체력↓↓' }]);
      if (c === 0) {
        await G.say('군의관', '잘 왔어요. 이틀 정도 쉬면서 약 먹읍시다. 아픈 건 참는 게 아닙니다.', { key: 'doc' });
        G.fx({ hp: 8, mental: 2 });
      } else {
        await H.narr('결국 더 심해져서 의무대에 실려 갔다.');
        G.fx({ hp: -6, rep: 1 });
      }
    },
  });

  add({
    id: 'weed',
    w: 10,
    cool: 3,
    when: (s) => [5, 6, 7, 8, 9].includes(U.month(s.date)) && !ship(s),
    run: async (s, H) => {
      H.place('field', [H.npc('senior', 212, { pose: 'shovel' })], { mx: 150, mpose: 'shovel', variant: 'trench' });
      await H.narr('제초 작업. 예초기 소리와 풀 냄새, 그리고 끝없는 풀.');
      const c = await G.choose(null, [{ label: '열심히 낫질', hint: '평판↑ 체력↓' }, { label: '요령껏 그늘 쪽부터', hint: '체력 보존' }]);
      G.fx(c === 0 ? { rep: 4, hp: -3 } : { hp: 1, rep: -1 });
    },
  });

  add({
    id: 'snow',
    w: 14,
    cool: 1,
    when: (s) => [12, 1, 2].includes(U.month(s.date)) && !ship(s) && s.branch !== 'air',
    run: async (s, H) => {
      H.place('unitgate', [H.npc('senior', 222, { pose: 'shovel', y: 168 }), H.npc('junior', 100, { pose: 'shovel', y: 168 })], { mx: 160, my: 168, mpose: 'shovel', sign: H.unitSign(), weather: 'snow', season: 'winter' });
      await H.narr('새벽 기상과 동시에 들리는 방송. "전 병력, 제설 작업 준비!"');
      await H.say('senior', '눈은 하늘에서 내리는 쓰레기다... 넉가래 챙겨.');
      const c = await G.choose('밤새 30cm가 쌓였다.', [
        { label: '넉가래 선두에 선다', hint: '평판↑ 체력↓' },
        { label: '싸리비로 마무리 담당', hint: '안정' },
        { label: '눈사람을 슬쩍 만든다', hint: '멘탈↑ 평판?' },
      ]);
      if (c === 0) G.fx({ rep: 5, hp: -4 });
      else if (c === 1) G.fx({ rep: 2 });
      else if (U.chance(0.5)) {
        await H.narr('행보관님이 눈사람을 보고 피식 웃었다.');
        G.fx({ mental: 6, rep: 2 });
      } else {
        await G.say(H.role('ssg'), '지금 눈사람 만들 때냐!');
        G.fx({ mental: 3, rep: -3 });
      }
    },
  });

  add({
    id: 'airSnow',
    w: 16,
    cool: 1,
    when: (s) => wing(s) && [12, 1, 2].includes(U.month(s.date)),
    run: async (s, H) => {
      H.place('airbase', [H.npc('senior', 222, { pose: 'shovel' }), H.npc('buddy', 100, { pose: 'shovel' })], { mx: 160, mpose: 'shovel', snowRunway: true, weather: 'snow', season: 'winter' });
      await H.narr('공군의 겨울은 활주로 제설로 시작한다. 전투기가 뜨려면 활주로에 눈 한 송이 남아선 안 된다.');
      await H.narr('제설 차량이 지나간 뒤, 수십 명이 일렬로 서서 넉가래로 밀고 나간다.');
      const c = await G.choose(null, [{ label: '끝까지 대열 유지', hint: '평판↑ 체력↓' }, { label: '따뜻한 차 타 오는 역할 자원', hint: '평판↑ 멘탈↑' }]);
      G.fx(c === 0 ? { rep: 5, hp: -5 } : { rep: 3, mental: 3 });
      await H.narr('해가 뜰 무렵, 비상대기 전투기가 깨끗해진 활주로를 박차고 날아올랐다.');
    },
  });

  add({
    id: 'fod',
    w: 12,
    cool: 3,
    when: (s) => wing(s),
    run: async (s, H) => {
      H.place('airbase', [H.npc('buddy', 118, { pose: 'walk' }), H.npc('senior', 204, { pose: 'walk' })], { mx: 160, mpose: 'walk' });
      await H.narr('아침 FOD 워크다운. 활주로를 일렬로 걸으며 작은 돌멩이, 볼트 하나까지 줍는다.');
      await H.say('senior', '작은 나사 하나가 엔진에 빨려 들어가면 전투기 한 대가 멈춘다.');
      const c = await G.choose('발밑에 반짝이는 게 보인다.', [{ label: '멈춰서 줍는다', hint: '숙련↑' }, { label: '뒷사람이 줍겠지', hint: '위험' }]);
      if (c === 0) {
        await H.narr('작은 금속 와셔. 정비사가 엄지를 들어 주었다.');
        G.fx({ skill: 3, rep: 4 });
      } else G.fx({ rep: -3 });
    },
  });

  add({
    id: 'scramble',
    w: 8,
    cool: 4,
    when: (s) => wing(s),
    run: async (s, H) => {
      H.place('airbase', [H.npc('senior', 204)], { mx: 140, scramble: true });
      await H.narr('갑자기 울리는 경보음. 비상대기 전투기가 긴급 출격(스크램블)한다!');
      R.shake(0.5);
      await H.say('senior', '방공식별구역에 미식별 항적이래. 우리는 우리 자리에서 할 일을 하면 돼.');
      G.fx({ mental: 3, skill: 2 });
    },
  });

  add({
    id: 'ada',
    w: 14,
    cool: 2,
    when: (s) => ['ada', 'radar'].includes(ut(s)),
    run: async (s, H) => {
      H.place('adasite', [H.npc('senior', 222)], { mx: 150 });
      await H.narr('산 정상 포대. 구름이 발밑으로 흘러간다. 부식 차량이 올라오는 날이 제일 반갑다.');
      const c = await G.choose('고립된 생활. 오늘 저녁은?', [{ label: '포대원들과 운동', hint: '체력↑' }, { label: '진중문고 한 권 독파', hint: '숙련↑ 멘탈↑' }, { label: '별 보며 멍때리기', hint: '멘탈↑' }]);
      G.fx([{ hp: 5 }, { skill: 3, mental: 2 }, { mental: 6 }][c]);
    },
  });

  add({
    id: 'sortie',
    w: 14,
    cool: 2,
    when: (s) => ship(s),
    run: async (s, H) => {
      const storm = U.chance(0.4);
      H.place('ship', [H.npc('senior', 210)], { mx: 150, storm });
      await H.narr('출동. 며칠 동안 바다 위에서 경비 임무를 선다. 육지 신호도 끊긴다.');
      if (storm) await H.narr('파고 3m. 배가 롤링할 때마다 위장도 같이 뒤집힌다.');
      const c = await G.choose('뱃멀미가 올라온다.', [
        { label: '바깥 공기 쐬며 수평선 보기', hint: '체력 회복' },
        { label: '참고 맡은 당직 계속', hint: '평판↑ 체력↓' },
        { label: '선임에게 멀미약 부탁', hint: '멘탈↑' },
      ]);
      G.fx([{ hp: 2, mental: 1 }, { rep: 5, hp: -4 }, { mental: 3, rep: 1 }][c]);
      await H.narr('입항. 육지 불빛이 그렇게 반가울 수가 없다.');
      G.fx({ skill: 3 }, true);
    },
  });

  add({
    id: 'rust',
    w: 10,
    cool: 3,
    when: (s) => s.branch === 'navy',
    run: async (s, H) => {
      H.place(ship(s) ? 'ship' : 'port', [H.npc('senior', 210)], { mx: 150 });
      await H.narr('"깡깡이"의 날. 함정 철판의 녹을 망치와 그라인더로 벗겨 내고 다시 페인트를 칠한다.');
      const c = await G.choose(null, [{ label: '귀마개 끼고 무념무상', hint: '체력↓ 평판↑' }, { label: '선임과 박자 맞춰 흥얼거리며', hint: '멘탈↑' }]);
      G.fx(c === 0 ? { hp: -3, rep: 4 } : { mental: 4, rep: 2 });
    },
  });

  add({
    id: 'navyPort',
    w: 8,
    cool: 4,
    when: (s) => ship(s),
    run: async (s, H) => {
      H.place('port', [H.npc('buddy', 204)], { mx: 150 });
      await H.narr('입항 후 외박. 항구 도시의 국밥집, 목욕탕, 그리고 PC방.');
      const c = await G.choose(null, [{ label: '국밥 + 목욕탕 코스', hint: '체력↑ 멘탈↑' }, { label: '동기들과 노래방', hint: '멘탈↑↑ 돈↓' }]);
      G.fx(c === 0 ? { hp: 4, mental: 4, money: -25000 } : { mental: 8, money: -40000 });
    },
  });

  add({
    id: 'counsel',
    w: 7,
    cool: 6,
    run: async (s, H) => {
      H.place('office', [H.npc('cpt', 214, { y: 164 })], { mx: 150, my: 166, board: '개인 면담' });
      await H.say('cpt', `${s.name}, 요즘 어떠냐? 힘든 거 없고?`);
      const c = await G.choose(null, [{ label: '"전역 후 진로가 고민입니다."', hint: '숙련↑' }, { label: '"솔직히 좀 지칩니다."', hint: '멘탈↑' }, { label: '"괜찮습니다!"', hint: '평판↑' }]);
      if (c === 0) {
        await H.say('cpt', '자기개발비 지원이랑 원격 강좌 알아봐 줄게. 자격증 응시료도 지원된다.');
        G.fx({ skill: 4, mental: 2 });
      } else if (c === 1) {
        await H.say('cpt', '말해 줘서 고맙다. 병영생활 전문상담관 면담도 잡아 줄게. 혼자 버티는 거 아니다.');
        G.fx({ mental: 9 });
      } else G.fx({ rep: 3 });
    },
  });

  add({
    id: 'helpcall',
    w: 4,
    once: true,
    when: (s) => s.rankIdx >= 1,
    run: async (s, H) => {
      living(H, [H.npc('junior', 214), H.npc('senior', 100)], { mx: 156, night: true });
      await H.narr(`늦은 밤, ${s.npc.senior}가 후임 ${s.npc.junior}에게 사적인 심부름을 시키며 언성을 높이는 걸 봤다.`);
      const c = await G.choose('어떻게 할까?', [
        { label: '그 자리에서 정중히 말린다', hint: '평판↑' },
        { label: '마음의 편지 / 국방헬프콜(1303)로 알린다', hint: '원칙대로' },
        { label: '못 본 척한다', hint: '멘탈↓' },
      ]);
      if (c === 0) {
        await H.me('그건 아닌 것 같습니다. 같이 하시죠.');
        await H.narr('분위기가 싸해졌지만, 다음 날 맞선임이 후임에게 사과했다고 들었다.');
        G.fx({ rep: 6, mental: 2 });
      } else if (c === 1) {
        await H.narr('익명으로 마음의 편지를 썼다. 며칠 뒤 간부들이 조용히 조치했고, 생활관 분위기가 달라졌다.');
        G.log('부조리 신고 (마음의 편지)');
        G.fx({ rep: 3, mental: 5 });
      } else {
        await H.narr('잠이 오지 않았다.');
        G.fx({ mental: -6 });
      }
    },
  });

  add({
    id: 'newJunior',
    w: 12,
    once: true,
    when: (s) => s.rankIdx >= 1,
    run: async (s, H) => {
      living(H, [H.npc('junior', 214)], { mx: 150 });
      await H.narr('새 전입 신병이 왔다. 긴장한 눈빛이 몇 달 전의 나와 똑같다.');
      await H.say('junior', `${H.sal()}! 이병 ${s.npc.junior}입니다! 잘 부탁드립니다!`);
      const c = await G.choose('첫마디는?', [
        { label: '"긴장 풀어. 모르는 건 나한테 물어봐."', hint: '평판↑' },
        { label: '일과표와 근무표를 직접 설명해 준다', hint: '평판↑ 숙련↑' },
        { label: '"알아서 잘해."', hint: '평판↓' },
      ]);
      G.fx([{ rep: 5 }, { rep: 4, skill: 2 }, { rep: -4 }][c]);
    },
  });

  add({
    id: 'seniorOut',
    w: 10,
    once: true,
    when: (s) => s.rankIdx >= 1 && s.rankIdx <= 2,
    run: async (s, H) => {
      H.place('unitgate', [H.npc('senior', 204, { y: 168 })], { mx: 150, my: 168, sign: H.unitSign(), open: true });
      await H.say('senior', `야 ${s.name}, 나 간다. 마지막까지 사고 치지 말고, 후임들 잘 챙겨.`);
      R.pose('me', 'salute');
      await H.me(`${H.sal()}! 전역 축하드립니다!`);
      R.pose('me', 'stand');
      await H.narr('정문 밖으로 사라지는 뒷모습을 오래 바라봤다. 언젠가 나도.');
      G.fx({ mental: 3 });
      s.npc.senior = U.uniqueNames(1, Object.values(s.npc))[0];
    },
  });

  add({
    id: 'cert',
    w: 7,
    cool: 6,
    run: async (s, H) => {
      H.place('classroom', [], { mx: 160, my: 168, board: '자기개발 지원\n자격증 응시료 지원' });
      const cert = U.pick(['컴퓨터활용능력 2급', '한국사능력검정 심화', '토익', '정보처리기능사', '지게차운전기능사', '한식조리기능사']);
      await H.narr(`부대 자기개발 지원으로 ${cert} 시험에 응시할 기회가 생겼다.`);
      const c = await G.choose(null, [{ label: '일과 후 매일 1시간 공부', hint: '숙련↑↑' }, { label: '벼락치기', hint: '운' }]);
      const pass = c === 0 ? U.chance(0.75) : U.chance(0.35);
      if (pass) {
        G.award(`${cert} 취득`);
        G.fx({ skill: 6, mental: 4 });
      } else {
        await H.narr('아깝게 불합격. 다음 회차를 노린다.');
        G.fx({ skill: 2, mental: -2 });
      }
    },
  });

  add({
    id: 'outing',
    w: 8,
    cool: 3,
    when: (s) => !ship(s) && !['island', 'ada', 'radar', 'gop'].includes(ut(s)),
    run: async (s, H) => {
      H.place('street', [H.npc('buddy', 192)], { mx: 150 });
      await H.narr('평일 일과 후 외출. 부대 앞 읍내에서 짧지만 달콤한 몇 시간.');
      const c = await G.choose(null, [{ label: '삼겹살', hint: '멘탈↑ 체력↑' }, { label: 'PC방', hint: '멘탈↑' }, { label: '카페에서 책 읽기', hint: '숙련↑' }]);
      G.fx([{ mental: 5, hp: 2, money: -18000 }, { mental: 5, money: -6000 }, { skill: 3, mental: 2, money: -5000 }][c]);
    },
  });

  add({
    id: 'visit',
    w: 6,
    cool: 6,
    when: (s) => !ship(s) && ut(s) !== 'island',
    run: async (s, H) => {
      H.place('unitgate', [H.npc('mom', 204, { y: 168 }), H.npc('dad', 228, { y: 168 })], { mx: 162, my: 168, sign: H.unitSign() });
      await H.narr('주말 면회. 부모님이 새벽부터 차를 몰고 오셨다.');
      await H.say('mom', `통닭이랑 피자 다 사 왔어. ${s.unit.place}까지 진짜 멀더라.`);
      await H.say('dad', '얼굴 좋다. 군인 티가 제법 나네.');
      G.fx({ mental: 9, hp: 2 });
    },
  });

  add({
    id: 'bday',
    w: 5,
    once: true,
    run: async (s, H) => {
      living(H, [H.npc('buddy', 108), H.npc('sgt', 214), H.npc('junior', 252)], { mx: 166, night: true });
      await H.narr('점호 직전, 불이 꺼지더니 PX 케이크와 초코파이 탑이 등장했다.');
      await H.say('sgt', `${s.name}, 생일 축하한다! 소원 빌어.`);
      await H.me('...전역이요.');
      await H.narr('생활관이 웃음바다가 됐다.');
      G.fx({ mental: 10, rep: 3 });
    },
  });

  add({
    id: 'tv',
    w: 6,
    cool: 6,
    when: (s) => !ship(s),
    run: async (s, H) => {
      H.place('barracks', [H.npc('sgt', 214, { pose: 'sit', y: 150 }), H.npc('junior', 100, { pose: 'sit', y: 150 })], { mx: 160, my: 150, mpose: 'sit' });
      await H.narr('주말 오후, 생활관 TV 채널을 두고 묘한 긴장감. 음악방송 vs 축구 중계.');
      const c = await G.choose(null, [{ label: '다수결로 정하자고 제안', hint: '평판↑' }, { label: '조용히 사지방(사이버지식정보방)으로 피신', hint: '멘탈↑' }]);
      G.fx(c === 0 ? { rep: 3 } : { mental: 3 });
    },
  });

  add({
    id: 'mistake',
    w: 14,
    once: true,
    when: (s) => s.rankIdx === 0,
    run: async (s, H) => {
      H.place('unitgate', [H.npc('lt', 214, { y: 168 })], { mx: 150, my: 168, sign: H.unitSign() });
      await H.narr('PX에서 나오다 소대장님과 마주쳤다. 손에는 과자 봉지가 한가득.');
      const c = await G.choose('순간 머리가 하얘진다.', [{ label: '봉지를 왼손으로 옮기고 경례', hint: '정답' }, { label: '그대로 꾸벅 인사', hint: '민간인 습관' }]);
      if (c === 0) {
        R.pose('me', 'salute');
        await H.me(`${H.sal()}!`);
        R.pose('me', 'stand');
        await H.say('lt', '오, 신병 맞아? 잘하네.');
        G.fx({ rep: 4 });
      } else {
        await H.say('lt', '하하, 아직 민간인 티가 나네. 경례는 습관이야.');
        G.fx({ rep: -2, mental: -1 });
      }
    },
  });

  add({
    id: 'inspect',
    w: 8,
    cool: 4,
    run: async (s, H) => {
      living(H, [H.npc('ssg', 214)], { mx: 150 });
      await H.say('ssg', '지금부터 관물대·침구 정리 상태 점검한다.');
      if (s.stats.rep + U.rand(-20, 20) > 45) {
        await H.narr('각 잡힌 모포, 줄 맞춘 전투복. 칭찬을 들었다.');
        G.fx({ rep: 4 });
      } else {
        await H.narr('관물대 구석에서 지난주 과자 봉지가 나왔다...');
        G.fx({ rep: -4, mental: -2 });
      }
    },
  });

  add({
    id: 'security',
    w: 5,
    once: true,
    run: async (s, H) => {
      living(H, [H.npc('buddy', 204)], { mx: 150, night: true });
      await H.say('buddy', '야, 여기 풍경 진짜 예술인데 사진 찍어서 SNS에 올릴까?');
      const c = await G.choose('부대 내부 촬영·게시는 보안 위반이다.', [{ label: '"안 돼. 보안 위반이야."', hint: '평판↑' }, { label: '"한 장쯤이야..."', hint: '위험' }]);
      if (c === 0) G.fx({ rep: 3 });
      else {
        await H.narr('며칠 뒤 보안 점검에 걸렸다. 징계 결과 휴가단축 2일.');
        s.flags.discipline = true;
        s.leave.used += 2;
        G.log('보안 위반 — 징계(휴가단축 2일)');
        G.fx({ rep: -10, mental: -8 });
      }
    },
  });

  add({
    id: 'boar',
    w: 10,
    once: true,
    when: (s) => ['gop', 'front', 'corps', 'rear', 'mech'].includes(ut(s)),
    run: async (s, H) => {
      H.place('gop', [H.npc('senior', 222, { pose: 'rifle' })], { mx: 150, mpose: 'rifle', boar: true });
      await H.narr('야간 경계 중. 철책 너머 수풀이 크게 흔들린다. 열상감시장비 화면에 커다란 열 신호.');
      R.emote('me', '!');
      const c = await G.choose(null, [{ label: '즉시 상황 보고 ("움직임 포착!")', hint: '정석' }, { label: '일단 좀 더 지켜본다', hint: '위험' }]);
      if (c === 0) {
        await H.narr('5분 대기조가 출동했다. 정체는... 멧돼지 가족. 그래도 보고는 정확했다며 칭찬을 들었다.');
        G.fx({ rep: 6, skill: 3 });
      } else {
        await H.narr('멧돼지였지만, 보고가 늦었다는 지적을 받았다.');
        G.fx({ rep: -4 });
      }
    },
  });

  add({
    id: 'kctc',
    w: 8,
    once: true,
    when: (s) => s.branch === 'army' && s.rankIdx >= 1 && ['gop', 'front', 'mech', 'rear', 'corps'].includes(ut(s)),
    run: async (s, H) => {
      H.place('field', [H.npc('sgt', 214), H.npc('buddy', 100)], { mx: 150, variant: 'trench' });
      await G.title('KCTC 과학화전투훈련', '강원 인제 · 전문 대항군과 실전처럼', { kicker: '대대 훈련' });
      await H.narr('마일즈(MILES) 장비를 몸에 달고 레이저 교전으로 전문 대항군과 맞붙는다. 맞으면 삐— 소리와 함께 "전사".');
      const c = await G.choose('수풀 속에서 적 매복을 발견했다.', [{ label: '분대장에게 수신호로 알린다', hint: '숙련↑ 평판↑' }, { label: '혼자 돌격', hint: '모 아니면 도' }]);
      if (c === 0) {
        await H.narr('분대가 우회해 매복을 제압했다! 사후검토(AAR)에서 이름이 불렸다.');
        G.fx({ skill: 6, rep: 6 });
      } else if (U.chance(0.3)) {
        await H.narr('기적의 돌파! 대항군이 혀를 내둘렀다.');
        G.fx({ rep: 8, mental: 4 });
      } else {
        R.shake(0.3);
        await H.narr('삐———. 3초 만에 전사 판정.');
        G.fx({ rep: -3, mental: -2 });
      }
    },
  });

  add({
    id: 'alert',
    w: 6,
    cool: 5,
    run: async (s, H) => {
      living(H, [H.npc('sgt', 214)], { mx: 150, night: true });
      R.shake(0.4);
      await H.narr('새벽 3시, 비상 사이렌. "전 병력 비상소집! 5분 안에 완전군장!"');
      const c = await G.choose('어둠 속에서 군장을 챙긴다.', [{ label: '평소 정리해 둔 대로 착착', hint: '숙련↑' }, { label: '허둥지둥 후임 것까지 챙긴다', hint: '평판↑' }]);
      if (c === 0) G.fx(s.stats.skill > 40 ? { skill: 3, rep: 3 } : { skill: 2 });
      else G.fx({ rep: 4, hp: -1 });
      await H.narr('불시 점검이었다. 상황 해제 후 다시 누웠지만 잠이 오지 않았다.');
    },
  });

  add({
    id: 'mosWork',
    w: 12,
    cool: 3,
    run: async (s, H) => {
      const g = s.mos.group;
      const lines = {
        보병: ['분대 전술 훈련. 엄폐, 사격, 기동을 몸이 기억할 때까지.', '화기 손질. 총열 안의 그을음을 닦아 낸다.'],
        포병: ['포반 훈련. 방열 시간 단축이 목표다. "사격 준비 끝!"', 'K9 자주포 정비. 거대한 궤도에 기름칠을 한다.'],
        기갑: ['전차 정비의 날. 궤도 장력을 맞추고 엔진룸을 점검한다.', '기동훈련. 흙먼지를 일으키며 전차가 달린다.'],
        공병: ['교량 가설 훈련. 무거운 부재를 함께 들어 올린다.', '지뢰 탐지 훈련. 탐지기 소리에 온 신경을 집중한다.'],
        정보통신: ['통신망 개통 훈련. 안테나를 세우고 교신 상태를 확인한다.', '장비 점검. 무전기 배터리와 케이블을 하나하나 확인한다.'],
        통신: ['통신망 개통 훈련. 안테나를 세우고 교신 상태를 확인한다.', '함정·부대 통신 장비 점검.'],
        수송: ['간부를 태우고 산길 운행. 커브마다 브레이크를 밟는 발에 힘이 들어간다.', '차량 일일 점검. 엔진오일, 타이어 공기압, 등화 상태.'],
        병참: ['새벽 4시 기상. 수백 명분 아침 식사 준비.', '식자재 검수. 유통기한 하나하나 확인한다.'],
        조리: ['새벽 조리. 대형 솥 앞에서 땀이 비 오듯.', '식자재 검수와 위생 점검.'],
        의무: ['의무대 근무. 진료 접수와 응급처치 훈련.', '구급차 대기 근무. 훈련장 옆에서 무전기를 꼭 쥔다.'],
        인사행정: ['휴가·진급 서류 정리. 숫자 하나 틀리면 누군가의 휴가가 날아간다.', '공문서 작성. 보안 규정을 지키며.'],
        행정: ['휴가·진급 서류 정리. 숫자 하나 틀리면 누군가의 휴가가 날아간다.', '공문서 작성과 보안 점검.'],
        군사경찰: ['부대 출입 통제 근무. 차량 번호와 출입증을 확인한다.', '교통 통제 훈련.'],
        정비: ['전투기 정비 보조. 공구 하나도 개수를 세어 반납한다(FOD 방지).', '정비 기록부 정리.'],
        보급: ['보급품 수령·불출. 재고 숫자를 맞추는 건 생각보다 어렵다.', '창고 정리. 군수품에도 다 이름과 번호가 있다.'],
        방공: ['방공 훈련. 표적 탐지부터 교전 절차까지 반복.', '발사대 점검.'],
      }[g] || [`${s.mos.name} 직무 훈련. 손에 익어 갈수록 재미가 붙는다.`];
      H.place(g === '수송' ? 'unitgate' : g === '정비' || g === '방공' ? H.home() : g === '의무' ? 'clinic' : g === '병참' || g === '조리' ? 'mess' : g === '인사행정' || g === '행정' ? 'office' : H.home() === 'barracks' ? 'field' : H.home(), [H.npc('sgt', 214)], { mx: 150, sign: H.unitSign(), menu: '오늘의 메뉴', board: `${s.mos.name} 업무` });
      await H.narr(U.pick(lines));
      const c = await G.choose('주특기 업무.', [{ label: '선임에게 노하우를 캐묻는다', hint: '숙련↑↑' }, { label: '배운 대로 성실하게', hint: '숙련↑ 평판↑' }]);
      G.fx(c === 0 ? { skill: 6 } : { skill: 3, rep: 3 });
    },
  });

  add({
    id: 'reading',
    w: 5,
    cool: 5,
    run: async (s, H) => {
      living(H, [], { mx: 160 });
      const b = U.pick(['역사 소설', '자기계발서', '여행 에세이', '과학 교양서', '추리 소설']);
      await H.narr(`진중문고에서 ${b} 한 권을 빌렸다. 사회에선 1년에 한 권도 안 읽었는데.`);
      G.fx({ mental: 4, skill: 2 });
    },
  });

  add({
    id: 'mentalEdu',
    w: 5,
    cool: 5,
    run: async (s, H) => {
      H.place('classroom', [H.npc('cpt', 230, { y: 166 })], { mx: 150, my: 168, board: '정신전력교육\n대한민국과 국군' });
      await H.narr('정신전력교육 시간. 6·25 참전용사의 영상 증언이 이어진다. 졸던 동기들도 고개를 든다.');
      G.fx({ mental: 2, rep: 1 });
    },
  });

  add({
    id: 'squadDuty',
    w: 12,
    cool: 3,
    when: (s) => s.flags.squadLeader,
    run: async (s, H) => {
      living(H, [H.npc('junior', 214), H.npc('buddy', 100)], { mx: 156 });
      await H.narr('분대장 업무. 분대원 둘이 근무 순서 때문에 다투고 있다.');
      const c = await G.choose('분대장으로서 어떻게 할까?', [{ label: '둘 다 불러 공평하게 근무표를 다시 짠다', hint: '평판↑' }, { label: '내가 근무 하나를 대신 선다', hint: '평판↑ 체력↓' }]);
      G.fx(c === 0 ? { rep: 5, skill: 2 } : { rep: 6, hp: -3 });
    },
  });

  add({
    id: 'dday100',
    w: 200,
    once: true,
    when: (s) => s.rankIdx === 3 && G.dday() <= 105 && G.dday() >= 60,
    run: async (s, H) => {
      living(H, [H.npc('buddy', 108), H.npc('junior', 214)], { mx: 160, night: true });
      await H.narr(`전역 D-${G.dday()}. 관물대 안쪽에 몰래 붙인 달력의 칸이 이제 얼마 남지 않았다.`);
      await H.say('buddy', '야, 우리 진짜 나가긴 나가는구나.');
      await H.say('junior', `${G.rankName()}님들 나가시면 생활관 허전해서 어떡합니까...`);
      G.fx({ mental: 6 });
    },
  });

  add({
    id: 'jobFair',
    w: 10,
    once: true,
    when: (s) => s.rankIdx === 3,
    run: async (s, H) => {
      H.place('classroom', [], { mx: 160, my: 168, board: '전역 예정 장병\n진로·취업 지원' });
      await H.narr('전역 예정 장병 진로 상담·취업 박람회. 기업 부스와 이력서 클리닉이 열렸다.');
      const c = await G.choose(null, [{ label: '이력서 첨삭 받기', hint: '숙련↑' }, { label: '복학 계획 세우기', hint: '멘탈↑' }, { label: '군 경력 살려 부사관 상담', hint: '평판↑' }]);
      G.fx([{ skill: 5 }, { mental: 5 }, { rep: 4 }][c]);
    },
  });

  add({
    id: 'island',
    w: 14,
    cool: 2,
    when: (s) => ut(s) === 'island',
    run: async (s, H) => {
      H.place('beach', [H.npc('senior', 222, { pose: 'rifle' })], { mx: 150, mpose: 'rifle', sign: '서북도서' });
      await H.narr('짙은 해무가 낀 해안 초소. 바다 건너가 바로 북녘 땅이다.');
      const c = await G.choose('안개 속에서 어선 불빛이 깜빡인다.', [{ label: '좌표·방위를 정확히 보고', hint: '숙련↑' }, { label: '레이더 상황실과 교차 확인', hint: '평판↑' }]);
      G.fx(c === 0 ? { skill: 4 } : { rep: 4 });
      await H.narr('알고 보니 조업 중인 우리 어선. 그래도 확인 또 확인이 서북도서의 철칙이다.');
    },
  });

  add({
    id: 'ssangyong',
    w: 8,
    once: true,
    when: (s) => s.branch === 'marine' && [3, 4, 8, 9].includes(U.month(s.date)),
    run: async (s, H) => {
      H.place('beach', [H.npc('sgt', 222), H.npc('buddy', 96)], { mx: 150, sign: '쌍룡훈련' });
      await G.title('쌍룡훈련', '한미 연합 상륙훈련', { kicker: '해병대' });
      await H.narr('상륙돌격장갑차가 바다를 가르고, 해안에 연막이 피어오른다. 연합군 해병들과 함께 해안 교두보를 확보한다.');
      const c = await G.choose(null, [{ label: '미 해병과 장비 교환 구경', hint: '멘탈↑' }, { label: '내 임무에만 집중', hint: '숙련↑' }]);
      G.fx(c === 0 ? { mental: 5, skill: 1 } : { skill: 5 });
    },
  });

  add({
    id: 'gasDrill',
    w: 5,
    cool: 8,
    run: async (s, H) => {
      H.place('gas', [H.npc('sgt', 222)], { mx: 150 });
      await H.narr('화생방 정기 훈련. 훈련소 이후 오랜만의 가스실이다.');
      const m = await MG.mask();
      G.fx(m.ok ? { skill: 3 } : { hp: -2, mental: -2 });
      await H.narr(m.ok ? `${m.time.toFixed(1)}초. 몸이 기억하고 있었다.` : '콜록콜록... 정화통을 덜 끼웠다.');
    },
  });

  // ======================================================
  // 계절 고정 이벤트 (월별)
  // ======================================================
  add({
    id: 'winterEx',
    fixedOnly: true,
    run: async (s, H) => {
      H.place('field', [H.npc('sgt', 214), H.npc('buddy', 100)], { mx: 150, night: true, season: 'winter' });
      await G.title('혹한기 훈련', '영하 20도의 숙영', { kicker: '1월' });
      await H.narr('영하 20도. 텐트를 치고, 침낭에 핫팩을 넣고, 방상내피 위에 방한복까지 껴입는다.');
      const c = await G.choose('새벽, 발가락 감각이 없다.', [
        { label: '전투화 벗고 발 마사지 + 양말 교체', hint: '체력↑' },
        { label: '그냥 참는다', hint: '동상 위험' },
        { label: '동기와 핫팩 나눠 쓰기', hint: '평판↑' },
      ]);
      if (c === 0) G.fx({ hp: 3, skill: 2 });
      else if (c === 1) {
        await H.narr('발가락이 붉게 부어올랐다. 의무병이 바로 조치해 줬다.');
        G.fx({ hp: -7 });
      } else G.fx({ rep: 5, mental: 3 });
      await H.narr('3박 4일 뒤 복귀. 생활관 난방이 이렇게 따뜻한 거였다니.');
    },
  });

  add({
    id: 'seolhanji',
    fixedOnly: true,
    run: async (s, H) => {
      H.place('field', [H.npc('sgt', 214), H.npc('buddy', 100)], { mx: 150, season: 'winter' });
      await G.title('동계 설한지 훈련', '해병대 동계 특수훈련', { kicker: '2월' });
      await H.narr('허벅지까지 빠지는 눈. 설상 기동과 설동(雪洞) 구축, 동계 생존 훈련이 이어진다.');
      const c = await G.choose(null, [{ label: '상의 탈의 구보에 자원', hint: '멘탈↑ 체력↓' }, { label: '설동을 누구보다 튼튼하게', hint: '숙련↑' }]);
      G.fx(c === 0 ? { mental: 6, hp: -3, rep: 3 } : { skill: 5 });
    },
  });

  async function checkElite(s, H) {
    if (s.flags.topShooter && s.flags.topFit && !s.flags.elite && s.branch === 'army') {
      s.flags.elite = true;
      await H.narr('사격 특등, 체력 특급. 정신전력·전투기술 평가까지 통과해 특급전사로 선발되었다!');
      G.award('특급전사 선발');
      G.fx({ reward: 4, rep: 8 });
    }
  }

  add({
    id: 'shootTest',
    fixedOnly: true,
    run: async (s, H) => {
      H.place('range', [H.npc('sgt', 222)], { mx: 150, firing: true });
      await G.title('개인화기 사격 측정', '특등사수는 포상휴가', { kicker: `${U.month(s.date)}월` });
      const r = await MG.shoot();
      const gi = MG.gradeShoot(r.hits);
      await H.narr(`20발 중 ${r.hits}발 — ${D.SHOOT_GRADE[gi]}.`);
      if (gi === 0) {
        if (!s.flags.topShooter) G.award('특등사수');
        s.flags.topShooter = true;
        G.fx({ reward: 2, rep: 4, skill: 3 });
        await checkElite(s, H);
      } else if (gi === 4) {
        await H.narr('불합격. 다음 주 재측정이다...');
        G.fx({ rep: -3, mental: -3, skill: 2 });
      } else G.fx({ skill: 2 });
    },
  });

  add({
    id: 'fitTest',
    fixedOnly: true,
    run: async (s, H) => {
      H.place('parade', [H.npc('sgt', 222)], { mx: 150, banner: '체력검정' });
      await G.title('체력검정', '팔굽혀펴기 · 3km 달리기', { kicker: `${U.month(s.date)}월` });
      const push = Math.round(36 + s.stats.hp * 0.42 + U.rand(-6, 6));
      const pi = D.PUSH_STD.findIndex((x) => push >= x);
      const pg = pi < 0 ? 4 : pi;
      await H.narr(`팔굽혀펴기 2분 ${push}회 — ${D.GRADE[pg]}.`);
      const r = await MG.run();
      const gi = MG.gradeRun(r.sec);
      await H.narr(`3km ${MG.fmtSec(r.sec)} — ${D.GRADE[gi]}.`);
      if (gi === 0 && pg === 0) {
        s.flags.topFit = true;
        G.fx({ rep: 4, hp: 3 });
        await checkElite(s, H);
      } else if (gi === 4) {
        await H.narr('불합격... 체력 단련 대상자가 됐다.');
        G.fx({ rep: -3, hp: 3 });
      } else G.fx({ hp: 2 });
    },
  });

  add({
    id: 'jindi',
    fixedOnly: true,
    run: async (s, H) => {
      H.place('field', [H.npc('senior', 214, { pose: 'shovel' }), H.npc('junior', 100, { pose: 'shovel' })], { mx: 150, mpose: 'shovel', variant: 'trench' });
      await G.title('진지공사', '삽과 마대, 그리고 흙', { kicker: '5월' });
      await H.narr('겨우내 무너진 교통호를 보수하고, 마대에 흙을 채워 쌓는다.');
      const c = await G.choose(null, [{ label: '마대 나르기', hint: '평판↑ 체력↓' }, { label: '측량·정리 담당', hint: '숙련↑' }, { label: '물·간식 보급 담당', hint: '멘탈↑' }]);
      G.fx([{ rep: 5, hp: -5 }, { skill: 4 }, { mental: 3, rep: 2 }][c]);
    },
  });

  add({
    id: 'yugyeok',
    fixedOnly: true,
    run: async (s, H) => {
      H.place('field', [H.npc('sgt', 222)], { mx: 150, variant: 'yugyeok' });
      await G.title('유격훈련', 'PT체조 8번, 온몸 비틀기', { kicker: '6월' });
      await H.say('sgt', '마지막 반복 구호는 생략한다. 알지?');
      await H.narr('"PT체조 8번, 온몸 비틀기! 몇 회 반복?" "열여섯 회!"');
      const c = await G.choose('마지막 열여섯 번째...', [{ label: '입을 꾹 다문다', hint: '정답' }, { label: '"열여섯!" (외쳐 버렸다)', hint: '...' }]);
      if (c === 0) G.fx({ rep: 3, hp: 3 });
      else {
        await H.narr('...처음부터 다시. 중대원 전원의 눈빛이 따갑다. 그래도 다들 웃고 있다.');
        G.fx({ rep: -3, hp: -2, mental: 3 });
      }
      await H.narr('외줄 도하, 레펠, 산악 기동. 진흙투성이로 복귀했지만 어딘가 개운하다.');
      G.fx({ hp: 4 }, true);
    },
  });

  add({
    id: 'ufs',
    fixedOnly: true,
    run: async (s, H) => {
      H.place('office', [H.npc('cpt', 214, { y: 164 }), H.npc('sgt', 98)], { mx: 150, my: 166, board: '을지 자유의 방패\n24시간 상황근무', night: true });
      await G.title('을지 자유의 방패(UFS)', '한미 연합연습', { kicker: '8월' });
      await H.narr('상황실 불이 꺼지지 않는다. 지도 위 기호들이 밤새 움직인다.');
      const c = await G.choose(null, [{ label: '상황일지를 꼼꼼히 기록', hint: '숙련↑' }, { label: '밤샘 근무자 커피 담당 자원', hint: '평판↑' }]);
      G.fx(c === 0 ? { skill: 4, hp: -2 } : { rep: 4, hp: -1 });
    },
  });

  add({
    id: 'hoguk',
    fixedOnly: true,
    run: async (s, H) => {
      const t = s.branch === 'navy' ? '해상 기동훈련' : s.branch === 'air' ? '전시 대비 비상 출격 훈련' : '호국훈련';
      if (ship(s)) H.place('ship', [H.npc('sgt', 210)], { mx: 150 });
      else if (wing(s)) H.place('airbase', [H.npc('sgt', 210)], { mx: 150, scramble: true });
      else H.place('march', [], { formation: G.look('soldier', { rank: 2 }), mx: 150, my: 160, mpose: 'walk' });
      await G.title(t, '대규모 야외 기동', { kicker: '11월' });
      await H.narr('며칠 밤낮을 야외에서 보낸다. 전투식량, 침낭, 그리고 계속되는 이동.');
      const c = await G.choose(null, [{ label: '지도와 좌표를 미리 외워 둔다', hint: '숙련↑' }, { label: '전우들 물집·컨디션 챙기기', hint: '평판↑' }]);
      G.fx(c === 0 ? { skill: 5, hp: -2 } : { rep: 5, hp: -2 });
    },
  });

  add({
    id: 'rainDitch',
    fixedOnly: true,
    run: async (s, H) => {
      H.place('unitgate', [H.npc('senior', 222, { pose: 'shovel', y: 168 })], { mx: 160, my: 168, mpose: 'shovel', sign: H.unitSign(), rain: true });
      await G.title('장마 대비', '배수로 정비 · 취약지역 점검', { kicker: '7월' });
      await H.narr('장대비가 쏟아진다. 막힌 배수로를 뚫고, 경사면에 방수포를 덮는다.');
      G.fx({ hp: -3, rep: 3 });
    },
  });

  add({
    id: 'typhoonShip',
    fixedOnly: true,
    run: async (s, H) => {
      H.place('ship', [H.npc('senior', 210)], { mx: 150, storm: true, rain: true });
      await G.title('태풍 피항', '함정을 지켜라', { kicker: '7월' });
      await H.narr('태풍 북상. 함정들이 안전한 항구로 피항한다. 계류줄을 두 배로 묶고 밤새 당직을 선다.');
      const c = await G.choose(null, [{ label: '계류줄 상태 30분마다 점검', hint: '숙련↑' }, { label: '침수 대비 배수펌프 대기', hint: '평판↑' }]);
      G.fx(c === 0 ? { skill: 4, hp: -2 } : { rep: 4, hp: -2 });
    },
  });

  // 월별 고정 이벤트 결정
  EV.fixedFor = (s, m) => {
    const key = `fx_${U.ym(s.date)}`;
    if (s.seen[key]) return null;
    const al = ground(s);
    const sh = ship(s);
    const wg = wing(s);
    const id = {
      1: al ? 'winterEx' : wg ? 'airSnow' : s.branch === 'air' ? 'ada' : sh ? 'sortie' : 'snow',
      2: s.branch === 'marine' ? 'seolhanji' : wg ? 'airSnow' : sh ? 'rust' : 'snow',
      3: 'shootTest',
      4: 'fitTest',
      5: al ? 'jindi' : wg ? 'fod' : s.branch === 'navy' ? 'rust' : 'gasDrill',
      6: al ? 'yugyeok' : sh ? 'sortie' : 'gasDrill',
      7: sh ? 'typhoonShip' : 'rainDitch',
      8: 'ufs',
      9: 'shootTest',
      10: 'fitTest',
      11: 'hoguk',
      12: wg ? 'airSnow' : sh ? 'sortie' : s.branch === 'air' ? 'ada' : 'snow',
    }[m];
    const ev = EV.byId[id];
    if (!ev || (ev.when && !ev.when(s))) return null;
    s.seen[key] = true;
    return ev;
  };

  EV.pick = (s, n, exclude = []) => {
    s.evAt = s.evAt || {};
    const cand = EV.pool.filter((e) => {
      if (e.fixedOnly || exclude.includes(e.id)) return false;
      if (e.when && !e.when(s)) return false;
      if (e.once && s.seen[e.id]) return false;
      if (e.cool && s.evAt[e.id] && monthsBetween(s.evAt[e.id], s.date) < e.cool) return false;
      return true;
    });
    const out = [];
    while (out.length < n && cand.length) {
      const e = U.wpick(cand);
      out.push(e);
      cand.splice(cand.indexOf(e), 1);
      s.evAt[e.id] = s.date;
    }
    return out;
  };

  // ======================================================
  // 파견 · 해외파병
  // ======================================================
  const DP = [];
  EV.DP = DP;

  // 공통: 파견지에서 여러 날에 걸쳐 일어나는 장면들
  async function spread(s, start, end, steps) {
    const len = U.diff(start, end);
    for (let i = 0; i < steps.length; i++) {
      await G.passTo(U.addDays(start, Math.floor((len * (i + 0.5)) / steps.length)));
      await steps[i]();
    }
  }

  DP.push({
    id: 'flood',
    name: '수해복구 대민지원',
    short: '수해복구',
    p: 0.45,
    when: (s, m) => [7, 8].includes(m) && !ship(s) && !['ada', 'radar', 'island'].includes(ut(s)),
    days: () => U.randi(7, 12),
    place: () => `${U.pick(['경기 북부', '충북 북부', '충남 서부', '경북 북부', '강원 영서'])} 집중호우 피해 지역`,
    mission: '침수 가옥 토사 제거, 농경지 복구, 이재민 지원',
    brief: '주민분들 재산이다. 내 집처럼, 그리고 안전이 최우선이다.',
    run: async (s, H, { start, end }) => {
      const scene = () => H.place('flood', [H.npc('buddy', 98, { pose: 'shovel' }), { key: 'farmer', look: G.look('villager'), x: 238, name: '어르신' }], { mx: 160, mpose: 'shovel', rain: U.chance(0.4) });
      scene();
      await G.title('수해복구 대민지원', `${U.fmt(start)} ~ ${U.fmt(end)}`, { kicker: '파견' });
      await H.narr('마을 전체가 진흙에 잠겼다. 장화를 신고 삽을 든다. 냉장고, 장롱, 가족사진까지 흙투성이다.');
      await H.narr('파견지 지휘관에게 도착 신고를 하고, 마을별로 작업조가 편성됐다.');
      await spread(s, start, end, [
        async () => {
          scene();
          const c = await G.choose('할머니가 젖은 앨범을 붙들고 계신다.', [{ label: '앨범부터 조심스럽게 꺼내 말린다', hint: '평판↑ 멘탈↑' }, { label: '토사 제거부터 빠르게', hint: '숙련↑ 체력↓' }]);
          if (c === 0) {
            await G.say('어르신', '아이고, 우리 영감 사진... 군인 양반, 정말 고마워요.', { key: 'farmer' });
            G.fx({ rep: 5, mental: 5 });
          } else G.fx({ skill: 3, hp: -4, rep: 3 });
        },
        async () => {
          scene();
          await H.narr('폭염 속 작업. 땀이 비 오듯 쏟아진다. 주민분들이 수박과 얼음물을 내오셨다.');
          const c = await G.choose('지역 방송사 카메라가 다가온다.', [{ label: '"당연히 할 일을 했을 뿐입니다."', hint: '평판↑' }, { label: '수줍게 손사래', hint: '—' }]);
          if (c === 0) {
            await H.narr('그날 저녁 뉴스에 3초 나왔다. 엄마에게서 연락이 폭주했다.');
            G.fx({ rep: 4, mental: 4 });
          } else G.fx({ mental: 2 });
          G.fx({ hp: -3 }, true);
        },
      ]);
    },
    welcome: '대민지원 고생했다. 마을 이장님이 감사 편지를 보내 오셨더라.',
    after: async (s) => {
      if (s.stats.rep >= 60 && U.chance(0.5)) {
        G.award('대민지원 유공 포상휴가');
        G.fx({ reward: 2 });
      }
    },
  });

  DP.push({
    id: 'typhoon',
    name: '태풍 피해복구 대민지원',
    short: '태풍 복구',
    p: 0.35,
    when: (s, m) => [8, 9].includes(m) && (s.branch === 'marine' || (s.branch === 'navy' && !ship(s))),
    days: () => U.randi(5, 8),
    place: (s) => `${s.unit.place.split(' ').slice(0, 2).join(' ')} 일대 태풍 피해 지역`,
    mission: '침수 상가·주택 복구, 도로 토사 및 잔해 제거',
    run: async (s, H, { start, end }) => {
      H.place('flood', [H.npc('buddy', 98, { pose: 'shovel' }), { key: 'v', look: G.look('villager'), x: 238, name: '상인' }], { mx: 160, mpose: 'shovel' });
      await G.title('태풍 피해복구', `${U.fmt(start)} ~ ${U.fmt(end)}`, { kicker: '파견' });
      await H.narr('밤새 할퀴고 간 태풍. 시장 상가에 들어찬 진흙을 퍼내고, 쓰러진 간판을 치운다.');
      await spread(s, start, end, [
        async () => {
          const c = await G.choose('상가 주인이 눈물을 훔친다.', [{ label: '"금방 다시 문 여실 수 있게 하겠습니다!"', hint: '평판↑' }, { label: '말없이 손을 더 빨리 놀린다', hint: '숙련↑' }]);
          G.fx(c === 0 ? { rep: 5, mental: 3 } : { skill: 3, hp: -3 });
        },
      ]);
    },
  });

  DP.push({
    id: 'fire',
    name: '산불 진화 지원',
    short: '산불 진화',
    p: 0.3,
    when: (s, m) => [3, 4].includes(m) && s.branch === 'army' && ['gop', 'corps', 'rear', 'mech', 'front'].includes(ut(s)),
    days: () => U.randi(3, 5),
    lead: 0,
    place: () => `${U.pick(['강원 동해안', '경북 북부', '강원 영동'])} 산불 현장`,
    mission: '잔불 정리, 방화선 구축, 주민 대피 지원',
    brief: '산불은 바람 방향이 생명이다. 산림청·소방 지휘에 따르고, 절대 무리하지 마라.',
    run: async (s, H, { start, end }) => {
      H.place('fire', [H.npc('buddy', 100, { pose: 'shovel' }), H.npc('sgt', 222, { pose: 'shovel' })], { mx: 160, mpose: 'shovel' });
      await G.title('산불 진화 지원', `${U.fmt(start)} ~ ${U.fmt(end)}`, { kicker: '긴급 파견' });
      await H.narr('하늘이 주황빛이다. 헬기가 물을 쏟고, 우리는 갈퀴와 등짐펌프로 잔불을 끈다.');
      await spread(s, start, end, [
        async () => {
          const c = await G.choose('바람 방향이 바뀌었다!', [{ label: '즉시 분대장에게 보고하고 후퇴', hint: '정석' }, { label: '조금만 더 정리하고 빠진다', hint: '위험' }]);
          if (c === 0) G.fx({ rep: 4, skill: 3 });
          else {
            R.shake(0.3);
            await H.narr('연기에 갇힐 뻔했다. 지휘관에게 크게 혼났다.');
            G.fx({ hp: -6, rep: -3 });
          }
        },
        async () => {
          await H.narr('밤새 잔불 감시. 꺼진 줄 알았던 땅속에서 불씨가 다시 살아난다. 흙을 파고 물을 붓는다.');
          G.fx({ hp: -3, rep: 3 });
        },
      ]);
    },
  });

  DP.push({
    id: 'asf',
    name: 'ASF 방역 지원',
    short: 'ASF 방역',
    p: 0.22,
    when: (s, m) => [10, 11, 12, 1, 2].includes(m) && s.branch === 'army' && ['gop', 'front', 'corps', 'mech'].includes(ut(s)),
    days: () => U.randi(12, 18),
    place: () => `${U.pick(['경기 북부', '강원 접경지역'])} 아프리카돼지열병(ASF) 방역 거점`,
    mission: '거점소독시설 운영 지원, 광역 울타리 점검, 야생멧돼지 폐사체 수색 지원',
    run: async (s, H, { start, end }) => {
      H.place('asf', [H.npc('buddy', 230)], { mx: 160 });
      await G.title('ASF 방역 지원', `${U.fmt(start)} ~ ${U.fmt(end)}`, { kicker: '파견' });
      await H.narr('방역복을 입고 거점소독시설에서 차량을 소독한다. 바퀴, 하부, 운전석 발판까지.');
      await spread(s, start, end, [
        async () => {
          await H.narr('광역 울타리 순찰 중, 숲속에서 멧돼지 폐사체를 발견했다.');
          const c = await G.choose(null, [{ label: '만지지 않고 위치 표시 후 즉시 신고', hint: '정석' }, { label: '직접 옮겨서 묻는다', hint: '오염 확산 위험' }]);
          if (c === 0) {
            await H.narr('방역 당국이 출동해 시료를 채취했다. 절차대로 한 덕분에 오염 확산을 막았다.');
            G.fx({ rep: 5, skill: 4 });
          } else {
            await H.narr('방역 지침 위반이다. 전신 소독과 함께 질책을 받았다.');
            G.fx({ rep: -5 });
          }
        },
        async () => {
          await H.narr('영하의 새벽, 소독약이 얼지 않게 열선을 점검한다. 지역 주민이 따뜻한 어묵탕을 가져다 주셨다.');
          G.fx({ mental: 4, hp: -2 });
        },
      ]);
    },
  });

  DP.push({
    id: 'adf',
    name: '국군의 날 기념행사 지원',
    short: '국군의 날 행사',
    p: 0.25,
    once: true,
    when: (s, m) => m === 8 && U.day(s.date) <= 25 && s.rankIdx >= 1 && s.rankIdx <= 2,
    lead: 5,
    days: (s) => U.diff(U.addDays(s.date, 5), `${U.year(s.date)}-10-01`) + 1,
    place: () => '국군의 날 기념행사 준비단 (행사장 일대)',
    mission: '기념식 분열·행진 예행연습 및 본 행사 참가',
    run: async (s, H, { start, end }) => {
      H.place('ceremony', [], { mx: 160, my: 170, formation: G.playerLook() });
      await G.title('국군의 날 행사 지원', `${U.fmt(start)} ~ ${U.fmt(end)}`, { kicker: '파견' });
      await H.narr('전국 각 부대에서 선발된 장병들이 모였다. 하루 종일 각을 맞추는 연습. 발끝, 손끝, 시선까지.');
      await spread(s, start, U.addDays(end, -1), [
        async () => {
          const c = await G.choose('폭염 속 예행연습. 옆 사람 보폭이 자꾸 어긋난다.', [{ label: '쉬는 시간에 같이 보폭 맞춰 보기', hint: '평판↑' }, { label: '내 자리만 완벽하게', hint: '숙련↑' }]);
          G.fx(c === 0 ? { rep: 5, hp: -2 } : { skill: 4, hp: -2 });
        },
        async () => {
          await H.narr('예행연습만 수십 번. 군화 밑창이 닳았다. 그래도 대열이 하나로 움직이는 순간, 소름이 돋는다.');
          G.fx({ mental: 4 });
        },
      ]);
      await G.passTo(end);
      H.place('ceremony', [], { mx: 160, my: 170, formation: G.playerLook() });
      await H.narr('10월 1일 국군의 날. 블랙이글스가 하늘에 태극 문양을 그린다. 수많은 시민 앞에서 행진했다.');
      G.award('국군의 날 기념행사 참가');
      G.fx({ mental: 8, rep: 5 });
    },
  });

  DP.push({
    id: 'squad',
    name: '분대장 교육',
    short: '분대장 교육',
    verb: '입교',
    p: 0.6,
    once: true,
    when: (s) => ground(s) && s.rankIdx === 2 && !s.flags.squadLeader && s.stats.rep >= 45,
    days: () => 14,
    place: (s) => (s.unit && s.unit.div ? `${D.DIVS[s.unit.div].name} 분대장 교육대` : `${s.unit.nick} 분대장 교육대`),
    mission: '분대장 직무·리더십·병영생활 지도·전투지휘 교육',
    brief: '분대장 교육 입교다. 다녀오면 분대를 맡긴다.',
    run: async (s, H, { start, end }) => {
      H.place('classroom', [H.npc('lt', 236, { y: 166 })], { mx: 150, my: 168, board: '분대장 교육\n리더십 · 상담 · 전투지휘' });
      await G.title('분대장 교육', `${U.fmt(start)} ~ ${U.fmt(end)}`, { kicker: '입교' });
      await H.narr('각 대대에서 모인 상병들. 리더십, 병영생활 상담 기법, 분대 전투지휘를 배운다.');
      await spread(s, start, end, [
        async () => {
          const c = await G.choose('상담 실습. 역할극 속 "후임"이 고민을 털어놓는다.', [{ label: '끝까지 들어 준 뒤 말한다', hint: '평판↑' }, { label: '바로 해결책을 제시한다', hint: '숙련↑' }]);
          G.fx(c === 0 ? { rep: 4, mental: 2 } : { skill: 4 });
        },
        async () => {
          await H.narr('분대 전투지휘 평가. 무전기로 분대원을 움직이고, 사격 통제를 한다.');
          G.fx({ skill: 5 });
        },
      ]);
    },
    welcome: '분대장 교육 수료 축하한다. 오늘부로 분대장 직책을 맡긴다.',
    after: async (s, H) => {
      s.flags.squadLeader = true;
      G.award('분대장 임명');
      await H.narr('가슴에 분대장 견장을 달았다. 이제 분대원들의 하루가 내 어깨에 있다.');
    },
  });

  // 레바논 동명부대 현지 에피소드
  const LEB = [
    async (s, H) => {
      H.place('lebanon', [H.npc('un', 222), { key: 'it', look: G.look('un', { camo: 'air' }), x: 250, name: '이탈리아군 병사' }], { mx: 160 });
      await H.narr('블루라인 인근 감시·정찰. UN 차량을 타고 정해진 경로를 돌며 이상 징후를 보고한다.');
      await G.say('이탈리아군 병사', 'Ciao, Corea! Good job today.', { key: 'it' });
      const c = await G.choose(null, [{ label: '서툰 영어로 대화를 이어 간다', hint: '숙련↑ 멘탈↑' }, { label: '미소와 엄지척으로 대신한다', hint: '평판↑' }]);
      G.fx(c === 0 ? { skill: 4, mental: 3 } : { rep: 3 });
    },
    async (s, H) => {
      H.place('lebanon', [{ key: 'doc', look: G.look('doctor'), x: 210, name: '군의관' }, { key: 'k1', look: G.look('kid'), x: 240, y: 166, name: '현지 아이' }], { mx: 160 });
      await H.narr('의료지원 동행. 작전지역 마을을 순회하며 진료를 돕는다. 주민들이 줄지어 기다린다.');
      await G.say('현지 아이', '슈크란! (감사합니다!)', { key: 'k1' });
      G.fx({ mental: 6, rep: 3 });
    },
    async (s, H) => {
      H.place('lebanon', [{ key: 'k1', look: G.look('kid'), x: 200, y: 166, name: '현지 아이' }, { key: 'k2', look: G.look('kid', { shirt: '#3a8ae0' }), x: 230, y: 168, name: '현지 아이' }], { mx: 160 });
      await H.narr('동명부대 태권도 교실. 아이들이 "태권!" 하고 기합을 넣는다.');
      const c = await G.choose('오늘은 내가 보조 사범이다.', [{ label: '품새 시범', hint: '평판↑' }, { label: '격파 시범 (송판!)', hint: '모 아니면 도' }]);
      if (c === 1 && U.chance(0.4)) {
        await H.narr('...송판이 안 깨졌다. 아이들이 깔깔 웃는다. 그래도 분위기는 최고.');
        G.fx({ mental: 5 });
      } else G.fx({ rep: 5, mental: 4 });
    },
    async (s, H) => {
      H.place('lebanon', [H.npc('un', 222)], { mx: 160, night: true });
      R.shake(0.5);
      await H.narr('한밤중 경보. 인근 지역 교전 정황으로 전 장병 방호시설로 대피한다.');
      const c = await G.choose('방호시설 안.', [{ label: '인원 점검을 돕는다', hint: '평판↑' }, { label: '침착하게 상황 방송에 집중', hint: '멘탈↑' }]);
      G.fx(c === 0 ? { rep: 5 } : { mental: 3 });
      await H.narr('상황 해제. 평화를 지킨다는 말의 무게를 처음으로 실감했다.');
    },
    async (s, H) => {
      H.place('lebanon', [H.npc('cpt', 214), H.npc('un', 240)], { mx: 160 });
      await H.narr('UN 메달 퍼레이드. 일정 기간 이상 임무를 수행한 평화유지군에게 UN 메달이 수여된다.');
      G.award('UN 평화유지 메달');
      G.fx({ mental: 6, rep: 4 });
    },
    async (s, H) => {
      H.place('lebanon', [H.npc('buddy', 214)], { mx: 160 });
      await H.narr('영상편지 촬영의 날. 화면 너머 가족에게 손을 흔든다. 지중해 노을이 유난히 붉다.');
      G.fx({ mental: 5 });
    },
  ];

  DP.push({
    id: 'dongmyeong',
    name: '레바논 동명부대 해외파병',
    short: '동명부대(레바논)',
    un: true,
    allowance: 1000000,
    p: 0.35,
    once: true,
    lead: 3,
    when: (s) => s.branch === 'army' && s.rankIdx >= 1 && s.rankIdx <= 2 && U.diff(s.date, s.dischargeDate) >= 320,
    days: () => 240,
    issuer: () => '국방부',
    signer: () => '국방부장관',
    orderTitle: '국외 파견(해외파병) 명령',
    place: () => '레바논 티르 일대 · 유엔레바논평화유지군(UNIFIL) 동명부대',
    mission: 'UNIFIL 작전지역 감시·정찰, 레바논군 협력, 의료·대민 지원',
    extra: '해외파병 근무수당은 계급별로 별도 지급함(게임 내 월 100만 원 가정).',
    brief: '파병 기간에도 원 소속은 우리 중대다. 건강하게, 꼭 무사히 돌아와라.',
    pre: async (s, H) => {
      H.place('office', [H.npc('cpt', 214, { y: 164 })], { mx: 150, my: 166, board: '해외파병 모집 공고\n레바논 동명부대' });
      await H.say('cpt', '레바논 동명부대 파병 인원 모집 공고가 내려왔다. 병사도 지원할 수 있다. 생각 있나?');
      await H.narr('유엔레바논평화유지군(UNIFIL)의 일원으로 레바논 남부 티르 일대에서 임무를 수행한다. 파병 기간은 약 8개월.');
      const c = await G.choose('지원할까?', [{ label: '지원한다', hint: '본인 지원 · 보호자 동의 · 선발 평가' }, { label: '이번엔 패스' }]);
      if (c === 1) return false;
      H.place('barracks', [], { mx: 160, my: 150, mpose: 'sit', night: true, phone: true });
      await H.narr('휴대폰 시간, 부모님께 전화했다. 병사의 해외파병은 본인 지원에 보호자 동의가 필요하다.');
      await G.say('아빠(전화)', '...위험하지는 않고? 네가 진짜 하고 싶은 거라면, 아빠는 동의한다. 엄마는 내가 설득할게.');
      H.place('parade', [H.npc('cpt', 214)], { mx: 150, banner: '파병 선발 평가' });
      await H.narr('선발 평가: 체력검정, 신체검사, 인성검사, 면접.');
      const r = await MG.run({ label: '파병 선발 체력검정' });
      const gi = MG.gradeRun(r.sec);
      await H.narr(`3km ${MG.fmtSec(r.sec)} — ${D.GRADE[gi]}.`);
      const q = await G.choose('면접관: "왜 파병에 지원했습니까?"', [{ label: '"평화유지 임무에 기여하고 싶습니다."' }, { label: '"외국 군과 일하며 시야를 넓히고 싶습니다."' }, { label: '"솔직히 수당이..."' }]);
      const score = (gi <= 2 ? 2 : gi === 3 ? 1 : 0) + (q < 2 ? 1 : 0) + (s.stats.rep >= 55 ? 1 : 0) + (s.stats.skill >= 45 ? 1 : 0);
      if (score < 3 && !G.forcePass) {
        await G.title('선발 탈락', '동명부대 파병 선발 결과', { kicker: '국방부' });
        await H.narr('이번 선발에서는 떨어졌다. 그래도 도전한 경험은 남았다.');
        G.fx({ mental: -3, hp: 2 });
        return false;
      }
      R.flash('#fff6c0');
      await G.title('최종 선발!', '레바논 동명부대', { kicker: '국방부' });
      G.log('동명부대 파병 선발');
      await G.pass(4);
      H.place('classroom', [H.npc('lt', 236, { y: 166, look: { head: 'bluehelm' } })], { mx: 150, my: 168, board: '국제평화지원단\n파병 전 교육' });
      await H.narr('파병 전 교육. 국제평화지원단(경기 이천)에서 UN 교전규칙, 폭발물 식별, 아랍어 기초, 현지 문화를 배운다.');
      await H.say('lt', '"마르하바(안녕하세요)", "슈크란(감사합니다)". 현지 주민의 신뢰가 곧 우리의 안전이다.');
      G.fx({ skill: 6 });
      await G.pass(24);
      return true;
    },
    run: async (s, H, { start, end }) => {
      H.place('airport', [H.npc('buddy', 108, { look: { head: 'bluehelm', un: true } })], { mx: 160, board2: 'BEIRUT  탑승 중' });
      await G.title('출국', '인천국제공항 → 레바논', { kicker: '동명부대' });
      await H.narr('환송식이 끝나고, 가족의 배웅을 받으며 출국장으로 들어선다. 파란 헬멧이 아직 어색하다.');
      H.place('lebanon', [H.npc('cpt', 214)], { mx: 160 });
      await H.narr('티르 기지 도착. 전 제대와 임무를 인수인계받고 현지 적응 교육을 받는다.');
      const eps = U.shuffle(LEB.slice(0, 4)).concat([LEB[4], LEB[5]]);
      const len = U.diff(start, end);
      for (let i = 0; i < eps.length; i++) {
        await G.passTo(U.addDays(start, Math.floor((len * (i + 1)) / (eps.length + 1))));
        G.bgm('dispatch');
        await eps[i](s, H);
      }
      await G.passTo(U.addDays(end, -1));
      H.place('airport', [H.npc('mom', 208), H.npc('dad', 232)], { mx: 160, board: '도착 ARRIVAL', board2: 'INCHEON  도착' });
      await H.narr('귀국. 공항 입국장에서 가족들이 플래카드를 들고 기다리고 있었다.');
      await H.say('mom', `${H.call()}! 까맣게 탔네... 무사히 와 줘서 고마워.`);
    },
    welcome: '무사 귀환을 환영한다. 중대 전원이 기다렸다.',
    after: async (s) => {
      G.fx({ reward: 3 });
    },
  });

  // 청해부대 현지 에피소드
  const CHH = [
    async (s, H) => {
      H.place('ship', [H.npc('senior', 210)], { mx: 150 });
      await H.narr('선박 호송 임무. 우리 상선들이 줄지어 뒤따른다. 함교에서 쌍안경으로 수평선을 훑는다.');
      const c = await G.choose('수평선 끝에 소형 보트가 보인다.', [{ label: '즉시 함교에 보고', hint: '정석' }, { label: '조금 더 확인 후 보고', hint: '위험' }]);
      if (c === 0) {
        await H.narr('경계태세 강화. 보트는 방향을 돌려 사라졌다. 빠른 보고가 상선을 지켰다.');
        G.fx({ rep: 6, skill: 4 });
      } else G.fx({ rep: -3 });
    },
    async (s, H) => {
      H.place('ship', [H.npc('sgt', 210)], { mx: 150 });
      await H.narr('갑판 온도 50도. 철판 위 공기가 일렁인다. 수분과 염분 보충은 생존 수칙이다.');
      G.fx({ hp: -4, mental: -2 });
    },
    async (s, H) => {
      H.place('port', [H.npc('buddy', 204)], { mx: 150 });
      await H.narr('기항지 정박. 오랜만에 밟는 육지, 군수품 적재를 마치고 짧은 휴식이 주어졌다.');
      G.fx({ mental: 8, hp: 4 });
    },
    async (s, H) => {
      H.place('ship', [H.npc('senior', 210)], { mx: 150, night: true });
      await H.narr('검문검색대가 의심 선박 승선 훈련을 한다. 우리는 함정 위에서 지원 절차를 반복한다.');
      G.fx({ skill: 5 });
    },
    async (s, H) => {
      H.place('ship', [H.npc('cpt', 210)], { mx: 150 });
      await H.narr('함상 체육대회. 갑판 위 줄다리기에서 우리 부서가 우승했다!');
      G.fx({ mental: 6, rep: 3 });
    },
  ];

  DP.push({
    id: 'cheonghae',
    name: '청해부대 해외파병',
    short: '청해부대(아덴만)',
    allowance: 1000000,
    p: 0.35,
    once: true,
    lead: 3,
    when: (s) => s.branch === 'navy' && s.rankIdx >= 1 && s.rankIdx <= 2 && U.diff(s.date, s.dischargeDate) >= 230,
    days: () => 180,
    issuer: () => '국방부',
    signer: () => '국방부장관',
    orderTitle: '국외 파견(해외파병) 명령',
    place: () => '소말리아 아덴만 해역 일대 · 청해부대',
    mission: '우리 선박 호송 및 안전 항해 지원, 해양안보 작전',
    extra: '해외파병 근무수당은 계급별로 별도 지급함(게임 내 월 100만 원 가정).',
    pre: async (s, H) => {
      H.place('office', [H.npc('cpt', 214, { y: 164 })], { mx: 150, my: 166, board: '청해부대 파병 인원 모집' });
      await H.say('cpt', '청해부대 파병 인원 모집이다. 함정 근무 경험자 우선. 지원하겠나?');
      const c = await G.choose('약 6개월간의 원해 파병.', [{ label: '지원한다', hint: '보호자 동의 · 선발' }, { label: '이번엔 패스' }]);
      if (c === 1) return false;
      await G.say('엄마(전화)', '배 타고 그렇게 멀리...? 그래도 네가 원하면 응원할게. 꼭 연락하고.');
      const ok = s.stats.rep + s.stats.skill + U.rand(-15, 15) >= 85 || G.forcePass;
      if (!ok) {
        await G.title('선발 탈락', '청해부대 파병 선발 결과', { kicker: '국방부' });
        G.fx({ mental: -3 });
        return false;
      }
      R.flash('#fff6c0');
      await G.title('최종 선발!', '청해부대', { kicker: '국방부' });
      G.log('청해부대 파병 선발');
      H.place('classroom', [H.npc('lt', 236, { y: 166 })], { mx: 150, my: 168, board: '파병 전 교육\n해양안보 · 해적 대응' });
      await H.narr('파병 전 교육. 해적 대응 절차, 열대 기후 적응, 응급처치, 현지 정세를 익힌다.');
      G.fx({ skill: 5 });
      await G.pass(14);
      return true;
    },
    run: async (s, H, { start, end }) => {
      H.place('port', [H.npc('mom', 208), H.npc('dad', 232)], { mx: 160 });
      await G.title('출항', '부산 작전기지 → 아덴만', { kicker: '청해부대' });
      await H.narr('환송식. 부두에서 손을 흔드는 가족들이 점점 작아진다.');
      const eps = U.shuffle(CHH);
      const len = U.diff(start, end);
      for (let i = 0; i < eps.length; i++) {
        await G.passTo(U.addDays(start, Math.floor((len * (i + 1)) / (eps.length + 1))));
        G.bgm('dispatch');
        await eps[i](s, H);
      }
      await G.passTo(U.addDays(end, -1));
      H.place('port', [H.npc('mom', 208), H.npc('dad', 232)], { mx: 160 });
      await H.narr('귀항. 6개월 만에 밟는 우리 땅. 가족들이 부두에서 이름을 부른다.');
      G.award('청해부대 파병 임무 완수');
    },
    welcome: '아덴만에서 고생 많았다. 함정에서 쌓은 경험, 후임들에게 잘 전해 줘라.',
    after: async () => G.fx({ reward: 3 }),
  });

  DP.push({
    id: 'adex',
    name: '서울 ADEX 행사 지원',
    short: 'ADEX 지원',
    p: 0.5,
    once: true,
    lead: 18,
    when: (s, m) => s.branch === 'air' && m === 9 && U.year(s.date) % 2 === 1,
    days: () => 21,
    place: () => '서울공항 (경기 성남시)',
    mission: '국제 항공우주·방위산업 전시회 행사장 경계, 관람객 안내, 질서 유지',
    run: async (s, H, { start, end }) => {
      H.place('airbase', [H.npc('buddy', 120), { key: 'c1', look: G.look('civil'), x: 220, name: '관람객' }], { mx: 160, scramble: true });
      await G.title('서울 ADEX 지원', `${U.fmt(start)} ~ ${U.fmt(end)}`, { kicker: '파견' });
      await H.narr('세계 각국의 항공기와 방산 기업 부스. 관람객 수만 명이 몰린다.');
      await spread(s, start, end, [
        async () => {
          const c = await G.choose('관람객이 길을 묻는다. 영어다!', [{ label: '손짓 발짓 섞어 안내', hint: '평판↑' }, { label: '통역 부스로 안내', hint: '숙련↑' }]);
          G.fx(c === 0 ? { rep: 4, mental: 3 } : { skill: 3 });
        },
        async () => {
          await H.narr('블랙이글스 에어쇼. 근무 중이지만 고개가 저절로 하늘로 향한다.');
          G.fx({ mental: 6 });
        },
      ]);
    },
  });

  EV.dispatchFor = (s, m) => {
    const cand = DP.filter((d) => {
      if (d.once && s.seen[`dp_${d.id}`]) return false;
      if (!d.when(s, m)) return false;
      return true;
    });
    for (const d of U.shuffle(cand)) {
      if (Math.random() < d.p || G.forceDispatch === d.id) {
        s.seen[`dp_${d.id}`] = (s.seen[`dp_${d.id}`] || 0) + 1;
        return d;
      }
    }
    return null;
  };

  // ======================================================
  // 휴가 이벤트
  // ======================================================
  EV.leaveEvent = async (s, H, days) => {
    const plans = [
      { label: '집밥 먹고 가족과 시간', hint: '멘탈↑' },
      { label: '친구들 만나기', hint: '멘탈↑↑ 돈↓' },
      { label: '알람 없이 하루 종일 자기', hint: '체력↑' },
      { label: days >= 7 ? '친구들과 바다 여행' : '할머니 댁 방문', hint: days >= 7 ? '멘탈↑↑ 돈↓↓' : '용돈?' },
    ];
    const rounds = days >= 6 ? 2 : 1;
    for (let r = 0; r < rounds; r++) {
      const c = await G.choose(r === 0 ? '휴가 첫날, 무엇부터 할까?' : '휴가가 절반 지났다. 남은 날은?', plans);
      if (c === 0) {
        H.place('home', [H.npc('mom', 210), H.npc('dad', 100)], { mx: 156, night: true });
        await H.say('mom', U.pick(['상다리 부러지겠다고? 다 네가 좋아하는 거야.', '살 빠졌네. 더 먹어.', '군대 얘기 좀 해 봐. 엄마 다 듣고 싶어.']));
        await H.say('dad', U.pick(['요즘 부대 밥은 어떠냐?', '아빠 때는 말이야...', '휴가 때는 푹 쉬어.']));
        G.fx({ mental: 8, hp: 2 });
      } else if (c === 1) {
        H.place('street', [H.npc('friend', 186), H.npc('friend2', 212)], { mx: 150, night: true });
        await H.say('friend', `${G.rankName()} ${s.name}님 오셨다! 머리 봐 ㅋㅋㅋ`);
        await H.say('friend2', '군대 어때? 진짜 드라마처럼 그래?');
        await H.me(U.pick(['생각보다 할 만해. 근데 다시 가라면...', '밥은 진짜 잘 나와. 진짜로.', '말로는 설명이 안 돼. 너도 가 보면 알아.']));
        G.fx({ mental: 9, money: -60000 });
      } else if (c === 2) {
        H.place('home', [], { mx: 286, my: 132, mpose: 'sit' });
        await H.narr('알람 없이 열두 시간을 잤다. 기상나팔 없는 아침이 이렇게 고요할 줄이야.');
        G.fx({ hp: 8, mental: 4 });
      } else if (days >= 7) {
        H.place('beach', [H.npc('friend', 190), H.npc('friend2', 214)], { mx: 150, sign: '바다 여행' });
        await H.narr('친구들과 바다로. 파도 소리, 조개구이, 그리고 새벽까지 이어진 수다.');
        G.fx({ mental: 12, money: -150000 });
      } else {
        H.place('home', [H.npc('grandma', 206)], { mx: 156 });
        await H.say('grandma', '아이고 우리 강아지, 나라 지키느라 고생이 많다. 이거 받아라.');
        G.fx({ mental: 6, money: 100000 });
      }
      if (r === 0 && rounds > 1) await G.pass(Math.floor(days / 2));
    }
    if (!s.flags.lastLeaveNote) {
      s.flags.lastLeaveNote = true;
      await H.narr('복귀 전날 밤. 시계 초침 소리가 유난히 크다.');
    }
  };

  DM.EV = EV;
})(window.DM);
