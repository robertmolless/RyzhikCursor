import { Howl, Howler } from 'howler';
import type { DayPhase, LocationId, Weather } from '../types/game';

const makeToneDataUri = (frequency: number, duration = 0.28, volume = 0.24) => {
  const sampleRate = 22050;
  const sampleCount = Math.floor(sampleRate * duration);
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const buffer = new ArrayBuffer(44 + sampleCount * bytesPerSample);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + sampleCount * bytesPerSample, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, sampleCount * bytesPerSample, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.sin(Math.PI * Math.min(1, i / sampleCount));
    const sample =
      Math.sin(2 * Math.PI * frequency * t) * 0.65 +
      Math.sin(2 * Math.PI * frequency * 1.5 * t) * 0.18;
    view.setInt16(44 + i * bytesPerSample, sample * envelope * volume * 32767, true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
};

export class AudioDirector {
  private context?: AudioContext;
  private master?: GainNode;
  private ambienceOscillators: OscillatorNode[] = [];
  private ambienceGains: GainNode[] = [];
  private currentKey = '';
  private started = false;
  private chime = new Howl({ src: [makeToneDataUri(880, 0.22, 0.16)], volume: 0.42 });
  private purr = new Howl({ src: [makeToneDataUri(108, 0.5, 0.2)], volume: 0.5 });
  private collect = new Howl({ src: [makeToneDataUri(660, 0.18, 0.18)], volume: 0.45 });

  async start() {
    if (this.started) return;
    this.started = true;
    Howler.volume(0.82);
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.context.destination);
    await this.context.resume();
  }

  stop() {
    this.ambienceOscillators.forEach((oscillator) => oscillator.stop());
    this.ambienceOscillators = [];
    this.ambienceGains = [];
  }

  setScene(location: LocationId, phase: DayPhase, weather: Weather) {
    if (!this.context || !this.master) return;
    const key = `${location}:${phase}:${weather}`;
    if (key === this.currentKey) return;
    this.currentKey = key;
    this.stop();

    const baseFrequency = this.getBaseFrequency(location, phase);
    const weatherShift = weather === 'rain' ? -14 : weather === 'storm' ? -27 : weather === 'fog' ? -9 : 0;
    const voices = [baseFrequency, baseFrequency * 1.5 + weatherShift, baseFrequency * 2 + weatherShift * 0.4];

    voices.forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      oscillator.type = index === 0 ? 'sine' : index === 1 ? 'triangle' : 'sawtooth';
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.12 : 0.035;
      oscillator.connect(gain);
      gain.connect(this.master!);
      oscillator.start();
      this.ambienceOscillators.push(oscillator);
      this.ambienceGains.push(gain);
    });
  }

  pulsePurr() {
    this.purr.play();
  }

  playCollect() {
    this.collect.play();
  }

  playChime() {
    this.chime.play();
  }

  setMuted(muted: boolean) {
    Howler.mute(muted);
    if (this.master) this.master.gain.value = muted ? 0 : 0.16;
  }

  private getBaseFrequency(location: LocationId, phase: DayPhase) {
    const locationRoot: Record<LocationId, number> = {
      house: 146.83,
      yard: 174.61,
      forest: 130.81,
      pond: 196,
      greenhouse: 220,
    };
    const phaseMultiplier: Record<DayPhase, number> = {
      morning: 1.12,
      day: 1,
      goldenHour: 0.94,
      blueEvening: 0.84,
      night: 0.72,
    };
    return locationRoot[location] * phaseMultiplier[phase];
  }
}
