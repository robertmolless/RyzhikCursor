// Procedural ambient audio engine — no shipped assets required.
// Uses the Web Audio API to synthesize:
//   - a soft pad layer for "ambience" with breathing filter
//   - a cricket layer (filtered noise pulses)
//   - rain layer (filtered noise)
//   - a tiny generative melody loop per "cassette mood"
//
// All sources can be muted/volumed at runtime, and started lazily after a
// user gesture (browser autoplay policy).

type Mood = 'lofi' | 'acoustic' | 'rock' | 'ambient' | 'piano';

const NOTES_C_MAJOR_PENT = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.26];
const NOTES_A_MINOR_PENT = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
const NOTES_E_DORIAN = [164.81, 184.99, 207.65, 220, 246.94, 277.18, 311.13, 329.63];

export class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  ambGain: GainNode | null = null;
  rainGain: GainNode | null = null;
  cricketGain: GainNode | null = null;
  musicGain: GainNode | null = null;
  started = false;
  private padTimer: number | null = null;
  private cricketTimer: number | null = null;
  private musicTimer: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private currentMood: Mood | null = null;
  private musicEnabled = true;

  start() {
    if (this.started) return;
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);

      this.ambGain = this.ctx.createGain();
      this.ambGain.gain.value = 0.25;
      this.ambGain.connect(this.master);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0.0;
      this.rainGain.connect(this.master);

      this.cricketGain = this.ctx.createGain();
      this.cricketGain.gain.value = 0.0;
      this.cricketGain.connect(this.master);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.32;
      this.musicGain.connect(this.master);

      this.noiseBuffer = this.makeNoiseBuffer(2);
      this.startPad();
      this.startCricketLoop();
      this.startRainLoop();
      this.startMusic('lofi');
      this.started = true;

      // Resume on first interaction.
      const resume = () => {
        this.ctx?.resume();
        window.removeEventListener('pointerdown', resume);
        window.removeEventListener('keydown', resume);
      };
      window.addEventListener('pointerdown', resume);
      window.addEventListener('keydown', resume);
    } catch {
      this.started = false;
    }
  }

  stop() {
    if (this.padTimer) window.clearTimeout(this.padTimer);
    if (this.cricketTimer) window.clearTimeout(this.cricketTimer);
    if (this.musicTimer) window.clearTimeout(this.musicTimer);
    try {
      this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.started = false;
  }

  setMaster(v: number) {
    if (this.master) this.master.gain.value = v;
  }
  setMusicEnabled(on: boolean) {
    this.musicEnabled = on;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.5);
    }
  }
  setRainAmount(v: number) {
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setTargetAtTime(v * 0.35, this.ctx.currentTime, 0.6);
    }
  }
  setNightAmount(v: number) {
    if (this.cricketGain && this.ctx) {
      this.cricketGain.gain.setTargetAtTime(v * 0.2, this.ctx.currentTime, 1);
    }
  }

  // --------- Cassette playback (just changes the music mood) ---------
  playCassette(id: string) {
    const mood: Mood =
      id === 'summer-porch'
        ? 'acoustic'
        : id === 'firefly-waltz'
        ? 'piano'
        : id === 'garage-thunder'
        ? 'rock'
        : id === 'moonlight-bell'
        ? 'ambient'
        : 'lofi';
    this.startMusic(mood);
  }

  // --------- One-shot bell ---------
  bell() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    [880, 1320, 1760].forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.value = 0;
      g.gain.setValueAtTime(0, now + i * 0.02);
      g.gain.linearRampToValueAtTime(0.25, now + 0.02 + i * 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.0 + i * 0.05);
      osc.connect(g).connect(this.master!);
      osc.start(now + i * 0.02);
      osc.stop(now + 2.2 + i * 0.05);
    });
  }

  // --------- Helpers ---------
  private makeNoiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * seconds, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private startPad() {
    if (!this.ctx || !this.ambGain) return;
    // 3 detuned saws filtered low; slowly modulated LFO on cutoff.
    const ctx = this.ctx;
    const base = [110, 138.59, 164.81]; // A2, C#3, E3 — A minor add ish
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 1;

    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoG.gain.value = 350;
    lfo.connect(lfoG).connect(filter.frequency);
    lfo.start();

    base.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = (i - 1) * 5;
      const og = ctx.createGain();
      og.gain.value = 0.1;
      o.connect(og).connect(filter);
      o.start();
    });
    filter.connect(this.ambGain);
  }

  private startCricketLoop() {
    if (!this.ctx || !this.cricketGain || !this.noiseBuffer) return;
    const tick = () => {
      if (!this.ctx || !this.cricketGain || !this.noiseBuffer) return;
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = false;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3500 + Math.random() * 1500;
      bp.Q.value = 25;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      const dur = 0.04;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.4, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(bp).connect(g).connect(this.cricketGain);
      src.start(now);
      src.stop(now + dur);
      this.cricketTimer = window.setTimeout(tick, 200 + Math.random() * 250);
    };
    tick();
  }

  private startRainLoop() {
    if (!this.ctx || !this.rainGain || !this.noiseBuffer) return;
    // Continuous filtered noise.
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2000;
    src.connect(lp).connect(this.rainGain);
    src.start();
  }

  // --------- Generative music ---------
  private startMusic(mood: Mood) {
    if (this.currentMood === mood) return;
    this.currentMood = mood;
    if (this.musicTimer) window.clearTimeout(this.musicTimer);
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;
    const scales: Record<Mood, number[]> = {
      lofi: NOTES_A_MINOR_PENT,
      acoustic: NOTES_C_MAJOR_PENT,
      piano: NOTES_C_MAJOR_PENT,
      ambient: NOTES_E_DORIAN,
      rock: NOTES_A_MINOR_PENT,
    };
    const bpm: Record<Mood, number> = {
      lofi: 78,
      acoustic: 84,
      piano: 70,
      ambient: 56,
      rock: 124,
    };
    const oscType: Record<Mood, OscillatorType> = {
      lofi: 'triangle',
      acoustic: 'triangle',
      piano: 'sine',
      ambient: 'sine',
      rock: 'sawtooth',
    };

    const step = () => {
      if (!this.ctx || !this.musicGain || this.currentMood !== mood) return;
      const interval = 60 / bpm[mood] / 2;
      const now = ctx.currentTime;
      // play 1 note + occasional harmony
      const notes = scales[mood];
      const f = notes[(Math.random() * notes.length) | 0];
      this.playTone(f, now, interval * 0.95, oscType[mood], mood === 'rock' ? 0.16 : 0.1);
      if (Math.random() > 0.65) {
        const f2 = notes[(Math.random() * notes.length) | 0];
        this.playTone(f2 * 0.5, now, interval * 1.4, oscType[mood], 0.06);
      }
      this.musicTimer = window.setTimeout(step, interval * 1000);
    };
    step();
  }

  private playTone(freq: number, when: number, dur: number, type: OscillatorType, gain: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = 0;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g).connect(this.musicGain);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }
}
