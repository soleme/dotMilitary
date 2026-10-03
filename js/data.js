// 고증 데이터 (2026년 기준, 게임용으로 단순화)
// - 복무기간: 육군·해병대 18개월, 해군 20개월, 공군 21개월
// - 병 봉급(2026, 2025년 수준 동결): 이병 75만 / 일병 90만 / 상병 120만 / 병장 150만
// - 장병내일준비적금: 월 최대 55만 원 납입, 정부 매칭지원금 100%
// - 진급: 이병 2개월(입영월 포함) → 일병 6개월 → 상병 6개월 → 병장(전역까지)
// - 신병교육대 운영 현황은 매년 바뀜(2024년 1·9·25사단 신교대 해제 등). 게임 목록은 예시.
(function (DM) {
  const D = {};

  D.PAY = [750000, 900000, 1200000, 1500000];
  D.SAVING_MAX = 550000;
  D.SAVING_RATE = 0.05; // 기본금리 가정치(게임)
  D.RANKS = ['이병', '일병', '상병', '병장'];

  D.BRANCH = {
    army: { id: 'army', name: '육군', months: 18, leave: 24, firstPromo: 2, step: 6, trainWeeks: 5, salute: '충성' },
    marine: { id: 'marine', name: '해병대', months: 18, leave: 24, firstPromo: 2, step: 6, trainWeeks: 7, salute: '필승' },
    navy: { id: 'navy', name: '해군', months: 20, leave: 27, firstPromo: 2, step: 6, trainWeeks: 5, salute: '필승' },
    air: { id: 'air', name: '공군', months: 21, leave: 28, firstPromo: 2, step: 6, trainWeeks: 6, salute: '필승' },
  };

  // 육군 사단(자대 후보). type: gop(철책 경계) / front / mech / rear(향토) / capital / corps
  D.DIVS = {
    d1: { name: '제1보병사단', nick: '전진부대', place: '경기 파주시', type: 'gop' },
    d3: { name: '제3보병사단', nick: '백골부대', place: '강원 철원군', type: 'gop' },
    d5: { name: '제5보병사단', nick: '열쇠부대', place: '경기 연천군', type: 'gop' },
    d6: { name: '제6보병사단', nick: '청성부대', place: '강원 철원군', type: 'gop' },
    d7: { name: '제7보병사단', nick: '칠성부대', place: '강원 화천군', type: 'gop' },
    d12: { name: '제12보병사단', nick: '을지부대', place: '강원 인제군', type: 'gop' },
    d15: { name: '제15보병사단', nick: '승리부대', place: '강원 화천군', type: 'gop' },
    d21: { name: '제21보병사단', nick: '백두산부대', place: '강원 양구군', type: 'gop' },
    d22: { name: '제22보병사단', nick: '율곡부대', place: '강원 고성군', type: 'gop' },
    d25: { name: '제25보병사단', nick: '상승비룡부대', place: '경기 양주시', type: 'gop' },
    d28: { name: '제28보병사단', nick: '무적태풍부대', place: '경기 연천군', type: 'gop' },
    d9: { name: '제9보병사단', nick: '백마부대', place: '경기 고양시', type: 'front' },
    dcm: { name: '수도기계화보병사단', nick: '맹호부대', place: '경기 포천시', type: 'mech' },
    d11: { name: '제11기동사단', nick: '화랑부대', place: '강원 홍천군', type: 'mech' },
    d31: { name: '제31보병사단', nick: '충장부대', place: '광주광역시', type: 'rear' },
    d32: { name: '제32보병사단', nick: '백룡부대', place: '세종특별자치시', type: 'rear' },
    d35: { name: '제35보병사단', nick: '충성부대', place: '전북 임실군', type: 'rear' },
    d36: { name: '제36보병사단', nick: '백호부대', place: '강원 원주시', type: 'rear' },
    d50: { name: '제50보병사단', nick: '강철부대', place: '대구광역시', type: 'rear' },
    d53: { name: '제53보병사단', nick: '철벽부대', place: '부산광역시', type: 'rear' },
    cdc: { name: '수도방위사령부', nick: '수방사', place: '서울특별시', type: 'capital' },
    c2: { name: '제2군단 직할부대', nick: '2군단', place: '강원 춘천시', type: 'corps' },
  };

  // 입영부대 (육군 현역병 징집). kind: ktc(육군훈련소) / div(사단 신병교육대)
  D.ARMY_CENTERS = [
    { id: 'ktc', name: '육군훈련소', gate: '연무대', place: '충남 논산시 연무읍', w: 55, kind: 'ktc' },
    ...['d3', 'd5', 'd6', 'd7', 'd12', 'd15', 'd21', 'd22', 'd28', 'd31', 'd32', 'd35', 'd36', 'd50', 'd53'].map((k) => ({
      id: k,
      name: `${D.DIVS[k].name} 신병교육대`,
      gate: D.DIVS[k].nick,
      place: D.DIVS[k].place,
      w: D.DIVS[k].type === 'gop' ? 3.5 : 2.5,
      kind: 'div',
      div: k,
    })),
  ];
  D.CENTERS = {
    navy: { id: 'navy', name: '해군교육사령부', gate: '해군교육사령부', place: '경남 창원시 진해구', kind: 'navy' },
    air: { id: 'air', name: '공군교육사령부 기본군사훈련단', gate: '공군 기본군사훈련단', place: '경남 진주시', kind: 'air' },
    marine: { id: 'marine', name: '해병대교육훈련단', gate: '해병대교육훈련단', place: '경북 포항시', kind: 'marine' },
  };

  // 주특기. code는 확실한 것만 표기. unit: 자대 내 배치 단위
  const sangmu = '전남 장성군 (상무대)';
  const jaun = '대전 유성구 (자운대)';
  D.MOS = {
    army: [
      { id: 'rifle', name: '소총수', code: '111.101', group: '보병', w: 42, unit: 'inf', divOK: true },
      { id: 'mg', name: '기관총사수', group: '보병', w: 7, unit: 'inf', divOK: true },
      { id: 'mortar', name: '박격포병', group: '보병', w: 6, unit: 'inf', divOK: true },
      { id: 'arty', name: '야전포병', group: '포병', w: 9, unit: 'arty', school: { name: '육군포병학교', place: sangmu, weeks: 3 } },
      { id: 'tank', name: '전차승무병', group: '기갑', w: 3, unit: 'armor', school: { name: '육군기계화학교', place: sangmu, weeks: 4 } },
      { id: 'eng', name: '공병', group: '공병', w: 5, unit: 'eng', school: { name: '육군공병학교', place: sangmu, weeks: 3 } },
      { id: 'cbr', name: '화생방병', group: '화생방', w: 2, unit: 'cbr', school: { name: '육군화생방학교', place: sangmu, weeks: 3 } },
      { id: 'sig', name: '통신병', group: '정보통신', w: 6, unit: 'sig', bonus: 'it', school: { name: '육군정보통신학교', place: jaun, weeks: 4 } },
      { id: 'drv', name: '운전병', group: '수송', w: 6, unit: 'trans', req: 'license', divOK: true, school: { name: '육군 수송교육단', place: '운전병 양성과정', weeks: 4 } },
      { id: 'cook', name: '조리병', group: '병참', w: 4, unit: 'cook', bonus: 'cook', divOK: true, school: { name: '육군종합군수학교', place: jaun, weeks: 2 } },
      { id: 'med', name: '의무병', group: '의무', w: 3, unit: 'med', bonus: 'med', school: { name: '국군의무학교', place: jaun, weeks: 4 } },
      { id: 'adm', name: '행정병', group: '인사행정', w: 3, unit: 'adm', bonus: 'hum', divOK: true, school: { name: '육군종합행정학교', place: '행정병 특기과정', weeks: 2 } },
      { id: 'mp', name: '군사경찰병', group: '군사경찰', w: 2, unit: 'mp', school: { name: '육군군사경찰학교', place: '군사경찰 특기과정', weeks: 3 } },
    ],
    navy: [
      { id: 'deck', name: '갑판병', group: '갑판', w: 14, ship: true },
      { id: 'helm', name: '조타병', group: '조타', w: 8, ship: true },
      { id: 'radar', name: '전탐병', group: '전탐', w: 8, ship: true, bonus: 'it' },
      { id: 'gun', name: '병기병', group: '병기', w: 8, ship: true },
      { id: 'engine', name: '추진기관병', group: '기관', w: 10, ship: true },
      { id: 'elec', name: '전기병', group: '전기', w: 7, ship: true, bonus: 'it' },
      { id: 'ncomm', name: '정보통신병', group: '통신', w: 7, bonus: 'it' },
      { id: 'ncook', name: '조리병', group: '조리', w: 8, bonus: 'cook' },
      { id: 'nmed', name: '의무병', group: '의무', w: 4, bonus: 'med' },
      { id: 'nsup', name: '보급병', group: '보급', w: 6 },
      { id: 'ndrv', name: '수송병(운전)', group: '수송', w: 5, req: 'license' },
      { id: 'nmp', name: '군사경찰병', group: '군사경찰', w: 6 },
      { id: 'nadm', name: '행정병', group: '행정', w: 4, bonus: 'hum' },
    ],
    air: [
      { id: 'amx', name: '항공기정비병', group: '정비', w: 12, bonus: 'it' },
      { id: 'asup', name: '보급병', group: '보급', w: 10 },
      { id: 'adrv', name: '차량운전병', group: '수송', w: 8, req: 'license' },
      { id: 'acook', name: '조리병', group: '조리', w: 8, bonus: 'cook' },
      { id: 'asec', name: '군사경찰병(경계)', group: '군사경찰', w: 14 },
      { id: 'aada', name: '방공포병', group: '방공', w: 8 },
      { id: 'acom', name: '통신전자병', group: '정보통신', w: 8, bonus: 'it' },
      { id: 'acs', name: '전산병', group: '전산', w: 5, bonus: 'it' },
      { id: 'afire', name: '소방병', group: '시설', w: 5 },
      { id: 'amed', name: '의무병', group: '의무', w: 4, bonus: 'med' },
      { id: 'aadm', name: '행정병', group: '행정', w: 5, bonus: 'hum' },
      { id: 'awx', name: '기상병', group: '기상', w: 3 },
    ],
    marine: [
      { id: 'mrifle', name: '소총수', group: '보병', w: 40 },
      { id: 'mmg', name: '기관총사수', group: '보병', w: 8 },
      { id: 'marty', name: '포병', group: '포병', w: 12 },
      { id: 'mkaav', name: '상륙돌격장갑차 승무병', group: '기갑', w: 6 },
      { id: 'mtank', name: '전차승무병', group: '기갑', w: 4 },
      { id: 'meng', name: '공병', group: '공병', w: 6 },
      { id: 'msig', name: '통신병', group: '통신', w: 6, bonus: 'it' },
      { id: 'mdrv', name: '운전병', group: '수송', w: 6, req: 'license' },
      { id: 'mcook', name: '조리병', group: '조리', w: 5, bonus: 'cook' },
      { id: 'mmed', name: '의무병', group: '의무', w: 3, bonus: 'med' },
      { id: 'mrecon', name: '수색병', group: '수색', w: 4, needHp: 65 },
    ],
  };
  // 육군 기술행정병(모집병) 지원 가능 특기
  D.ARMY_TECH = ['drv', 'sig', 'med', 'cook', 'adm', 'mp', 'cbr', 'arty', 'eng'];

  // 해군 배치
  D.NAVY_FLEETS = [
    { name: '제1함대', place: '강원 동해시' },
    { name: '제2함대', place: '경기 평택시' },
    { name: '제3함대', place: '전남 목포 인근' },
  ];
  D.NAVY_SHIPS = ['호위함(FFG)', '유도탄고속함(PKG)', '상륙함(LST)', '소해함(MHC)', '구조함(ATS)'];
  D.NAVY_SHORE = [
    { name: '해군작전사령부 지원대대', place: '부산광역시' },
    { name: '진해기지사령부 경비대대', place: '경남 창원시 진해구' },
    { name: '제2함대 기지전대', place: '경기 평택시' },
  ];

  // 공군 배치
  D.AIR_WINGS = [
    { name: '제1전투비행단', place: '광주광역시' },
    { name: '제8전투비행단', place: '강원 원주시' },
    { name: '제10전투비행단', place: '경기 수원시' },
    { name: '제11전투비행단', place: '대구광역시' },
    { name: '제15특수임무비행단', place: '경기 성남시' },
    { name: '제16전투비행단', place: '경북 예천군' },
    { name: '제17전투비행단', place: '충북 청주시' },
    { name: '제18전투비행단', place: '강원 강릉시' },
    { name: '제19전투비행단', place: '충북 충주시' },
    { name: '제20전투비행단', place: '충남 서산시' },
  ];
  D.AIR_SITES = [
    { name: '미사일방어사령부 예하 방공포대', place: '경기 북부 산 정상', type: 'ada' },
    { name: '방공관제단 예하 레이더기지', place: '강원 산악지역 정상', type: 'radar' },
  ];

  // 해병대 배치
  D.MARINE_UNITS = [
    { name: '해병대 제1사단', nick: '해룡부대', place: '경북 포항시', w: 35, type: 'mdiv' },
    { name: '해병대 제2사단', nick: '청룡부대', place: '경기 김포시', w: 30, type: 'mdiv' },
    { name: '연평부대', nick: '연평부대', place: '인천 옹진군 연평도', w: 12, type: 'island' },
    { name: '제6해병여단', nick: '흑룡부대', place: '인천 옹진군 백령도', w: 15, type: 'island' },
    { name: '제9해병여단', nick: '9여단', place: '제주특별자치도', w: 8, type: 'jeju' },
  ];

  // 육군 체력검정 기준(3km 달리기 초, 팔굽혀펴기 2분 회수) — 특급/1급/2급/3급
  D.RUN_STD = [750, 812, 874, 936];
  D.PUSH_STD = [72, 64, 56, 48];
  D.GRADE = ['특급', '1급', '2급', '3급', '불합격'];
  // 기록사격 20발 기준
  D.SHOOT_STD = [18, 15, 12, 10];
  D.SHOOT_GRADE = ['특등사수', '1급', '2급', '3급', '불합격'];

  // 고향 → 관할 병무청
  D.HOMETOWNS = [
    { city: '서울', mma: '서울지방병무청' },
    { city: '부산', mma: '부산울산지방병무청' },
    { city: '대구', mma: '대구경북지방병무청' },
    { city: '인천', mma: '인천병무지청' },
    { city: '광주', mma: '광주전남지방병무청' },
    { city: '대전', mma: '대전충남지방병무청' },
    { city: '수원', mma: '경인지방병무청' },
    { city: '전주', mma: '전북지방병무청' },
    { city: '청주', mma: '충북지방병무청' },
    { city: '창원', mma: '경남지방병무청' },
    { city: '강릉', mma: '강원영동병무지청' },
    { city: '제주', mma: '제주지방병무청' },
  ];

  D.MAJORS = [
    { id: 'hum', name: '인문·사회', desc: '행정병 분류에 유리', fx: { rep: 3 } },
    { id: 'it', name: '공학·IT', desc: '통신·전산·정비 분류에 유리', fx: { skill: 4 } },
    { id: 'med', name: '보건·간호', desc: '의무병 분류에 유리', fx: { skill: 2, rep: 1 } },
    { id: 'cook', name: '조리·외식', desc: '조리병 분류에 유리', fx: { mental: 3 } },
    { id: 'pe', name: '체육', desc: '체력이 좋다', fx: { hp: 8 } },
    { id: 'none', name: '딱히 없음', desc: '운명에 맡긴다', fx: { mental: 4 } },
  ];

  DM.DATA = D;
})(window.DM);
