// 칩튠 BGM (WebAudio 합성, 외부 음원 없음). 기본값 OFF — 사용자가 ♪ 버튼으로 켠다.
(function (DM) {
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const freq = (n) => {
    if (!n || n === '-') return 0;
    const m = n.match(/^([A-G]#?)(\d)$/);
    if (!m) return 0;
    const midi = 12 * (Number(m[2]) + 1) + NOTE[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  };
  const seq = (s) => s.trim().split(/\s+/);

  // 모든 곡은 자작 멜로디(8분음표 단위 루프)
  const SONGS = {
    title: {
      bpm: 92,
      lead: seq('E4 - G4 - A4 - G4 E4 D4 - E4 - - - - - C4 - D4 - E4 - G4 - A4 - C5 - B4 A4 G4 - - - - -'),
      bass: seq('A2 - - - A2 - - - F2 - - - F2 - - - C3 - - - C3 - - - G2 - - - G2 - - -'),
      drum: 'k---h---k---h---k---h---k-h-h---',
    },
    home: {
      bpm: 100,
      lead: seq('C5 - E5 - D5 C5 A4 - G4 - A4 C5 D5 - - - E5 - D5 - C5 - A4 - C5 - D5 - C5 - - -'),
      bass: seq('F2 - - - C3 - - - D3 - - - A2 - - - F2 - - - C3 - - - G2 - - - C3 - - -'),
      drum: '----h-------h-------h-------h---',
    },
    training: {
      bpm: 120,
      lead: seq('G4 - G4 G4 C5 - E5 - D5 - C5 - D5 - G4 - G4 - G4 G4 C5 - E5 - G5 - E5 - C5 - - -'),
      bass: seq('C3 - G2 - C3 - G2 - G2 - D3 - G2 - D3 - C3 - G2 - C3 - G2 - C3 - G2 - C3 - - -'),
      drum: 'k-h-s-h-k-h-s-h-k-h-s-h-k-k-s-s',
    },
    unit: {
      bpm: 108,
      lead: seq('D5 - A4 - B4 - F#4 - G4 - D4 - G4 - A4 - D5 - A4 - B4 - D5 - E5 - C#5 - D5 - - -'),
      bass: seq('D3 - - - B2 - - - G2 - - - A2 - - - D3 - - - B2 - - - G2 - - - A2 - - -'),
      drum: 'k---h-h-s---h---k---h-h-s---h-h-',
    },
    night: {
      bpm: 76,
      lead: seq('A4 - - - C5 - B4 - A4 - - - E4 - - - F4 - - - E4 - D4 - E4 - - - - - - -'),
      bass: seq('A2 - - - - - - - F2 - - - - - - - D2 - - - - - - - E2 - - - - - - -'),
      drum: '--------h---------------h-------',
    },
    dispatch: {
      bpm: 128,
      lead: seq('E4 G4 A4 - A4 - G4 A4 C5 - A4 - G4 E4 D4 - E4 G4 A4 - A4 - C5 D5 E5 - D5 C5 A4 - - -'),
      bass: seq('A2 - A2 - A2 - E3 - F2 - F2 - F2 - C3 - D3 - D3 - D3 - A2 - E2 - E2 - E2 - G#2 -'),
      drum: 'k-h-s-hkk-h-s-h-k-h-s-hkk-h-s-s-',
    },
    discharge: {
      bpm: 132,
      lead: seq('C5 - C5 D5 E5 - C5 - G5 - E5 - C5 - - - F5 - F5 E5 D5 - E5 - G5 - - - C6 - - -'),
      bass: seq('C3 - G2 - C3 - G2 - A2 - E3 - A2 - E3 - F2 - C3 - F2 - C3 - G2 - D3 - C3 - - -'),
      drum: 'k-h-s-h-k-h-s-h-k-h-s-h-k-s-s-s-',
    },
  };

  const A = { on: false, ctx: null, cur: null, timer: null, step: 0, nextT: 0, master: null };

  function ensure() {
    if (A.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    A.ctx = new AC();
    A.master = A.ctx.createGain();
    A.master.gain.value = 0.18;
    A.master.connect(A.ctx.destination);
    const len = A.ctx.sampleRate * 0.2;
    A.noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = A.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone(type, f, t, dur, vol) {
    if (!f) return;
    const o = A.ctx.createOscillator();
    const gn = A.ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(gn);
    gn.connect(A.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function hit(kind, t) {
    const src = A.ctx.createBufferSource();
    src.buffer = A.noise;
    const gn = A.ctx.createGain();
    const f = A.ctx.createBiquadFilter();
    f.type = kind === 'h' ? 'highpass' : 'lowpass';
    f.frequency.value = kind === 'h' ? 6000 : kind === 's' ? 2500 : 300;
    const v = kind === 'h' ? 0.12 : kind === 's' ? 0.25 : 0.5;
    gn.gain.setValueAtTime(v, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'h' ? 0.04 : 0.12));
    src.connect(f);
    f.connect(gn);
    gn.connect(A.master);
    src.start(t);
    src.stop(t + 0.15);
    if (kind === 'k') tone('sine', 90, t, 0.12, 0.5);
  }

  function schedule() {
    const s = SONGS[A.cur];
    if (!s || !A.ctx) return;
    const stepDur = 60 / s.bpm / 2;
    while (A.nextT < A.ctx.currentTime + 0.15) {
      const i = A.step;
      const L = s.lead[i % s.lead.length];
      const B = s.bass[i % s.bass.length];
      const Dr = s.drum[i % s.drum.length];
      if (L && L !== '-') tone('square', freq(L), A.nextT, stepDur * 1.6, 0.16);
      if (B && B !== '-') tone('triangle', freq(B), A.nextT, stepDur * 3.2, 0.35);
      if (Dr && Dr !== '-') hit(Dr, A.nextT);
      A.nextT += stepDur;
      A.step++;
    }
  }

  const Audio = {
    get on() {
      return A.on;
    },
    play(name) {
      if (name) A.want = name;
      if (!A.on || !A.want || A.cur === A.want) return;
      if (!ensure()) return;
      A.cur = A.want;
      A.step = 0;
      A.nextT = A.ctx.currentTime + 0.05;
      clearInterval(A.timer);
      A.timer = setInterval(schedule, 40);
    },
    stop() {
      clearInterval(A.timer);
      A.timer = null;
      A.cur = null;
    },
    toggle() {
      A.on = !A.on;
      if (A.on) {
        if (!ensure()) {
          A.on = false;
          return false;
        }
        if (A.ctx.state === 'suspended') A.ctx.resume();
        A.cur = null;
        Audio.play(A.want || 'title');
      } else Audio.stop();
      return A.on;
    },
  };

  DM.Audio = Audio;
})(window.DM);
