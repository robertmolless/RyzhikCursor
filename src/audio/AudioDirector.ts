import { Howl, Howler } from 'howler';
import type { DayPhase, LocationId, Weather } from '../game/types';

interface AtmosphereInput {
  dayPhase: DayPhase;
  weather: Weather;
  location: LocationId;
  musicEnabled: boolean;
  ambienceEnabled: boolean;
}

const sampleRate = 22050;

const makeToneDataUri = (frequencies: number[], duration = 2.8, volume = 0.18) => {
  const length = Math.floor(sampleRate * duration);
  const data = new Int16Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t * 3) * Math.min(1, (duration - t) * 1.8);
    const wave =
      frequencies.reduce((sum, frequency, index) => {
        const wobble = Math.sin(t * 0.7 + index) * 1.5;
        return sum + Math.sin(2 * Math.PI * (frequency + wobble) * t) / frequencies.length;
      }, 0) * envelope;
    data[i] = Math.max(-1, Math.min(1, wave * volume)) * 32767;
  }

  const byteRate = sampleRate * 2;
  const buffer = new ArrayBuffer(44 + data.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + data.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, data.length * 2, true);
  data.forEach((sample, index) => view.setInt16(44 + index * 2, sample, true));

  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:audio/wav;base64,${btoa(binary)}`;
};

export class AudioDirector {
  private music?: Howl;
  private ambience?: Howl;
  private started = false;
  private lastMood = '';
  private lastAmbience = '';
  private readonly musicBeds: Record<string, string>;
  private readonly ambienceBeds: Record<string, string>;

  constructor() {
    this.musicBeds = {
      warm: makeToneDataUri([196, 247, 330, 392], 3.4, 0.14),
      dusk: makeToneDataUri([147, 220, 277, 370], 3.6, 0.13),
      night: makeToneDataUri([110, 165, 220, 294], 4.2, 0.12),
      rain: makeToneDataUri([123, 185, 246, 329], 3.2, 0.1),
      magic: makeToneDataUri([174, 261, 349, 523], 4.5, 0.11),
    };
    this.ambienceBeds = {
      insects: makeToneDataUri([740, 880, 1175], 1.2, 0.055),
      rain: makeToneDataUri([90, 180, 360, 720], 0.9, 0.075),
      wind: makeToneDataUri([70, 97, 145], 1.6, 0.06),
      pond: makeToneDataUri([130, 205, 410], 1.4, 0.05),
    };
    Howler.volume(0.82);
  }

  start() {
    if (this.started) return;
    this.started = true;
    void Howler.ctx?.resume();
  }

  update(input: AtmosphereInput) {
    const musicMood = this.pickMusic(input.dayPhase, input.weather, input.location);
    const ambienceMood = this.pickAmbience(input.weather, input.location);
    if (musicMood !== this.lastMood) {
      this.swapMusic(this.musicBeds[musicMood], input.musicEnabled ? 0.34 : 0);
      this.lastMood = musicMood;
    }
    this.music?.fade(this.music.volume(), input.musicEnabled ? 0.34 : 0, 650);
    this.swapAmbience(ambienceMood, this.ambienceBeds[ambienceMood], input.ambienceEnabled ? 0.26 : 0);
  }

  playInteraction(kind: 'purr' | 'collect' | 'quest' | 'photo') {
    const bank = {
      purr: [82, 123, 164],
      collect: [523, 659, 784],
      quest: [196, 294, 392, 587],
      photo: [440, 660, 880],
    };
    const sound = new Howl({ src: [makeToneDataUri(bank[kind], 0.45, 0.2)], volume: 0.42 });
    sound.play();
  }

  setMuted(muted: boolean) {
    Howler.mute(muted);
  }

  private pickMusic(dayPhase: DayPhase, weather: Weather, location: LocationId) {
    if (location === 'greenhouse' || weather === 'fog') return 'magic';
    if (weather === 'rain' || weather === 'storm') return 'rain';
    if (dayPhase === 'night') return 'night';
    if (dayPhase === 'goldenHour' || dayPhase === 'blueEvening') return 'dusk';
    return 'warm';
  }

  private pickAmbience(weather: Weather, location: LocationId) {
    if (weather === 'rain' || weather === 'storm') return 'rain';
    if (weather === 'wind' || weather === 'fog') return 'wind';
    if (location === 'pond') return 'pond';
    return 'insects';
  }

  private swapMusic(src: string, volume: number) {
    const previous = this.music;
    previous?.fade(previous.volume(), 0, 450);
    window.setTimeout(() => previous?.unload(), 520);
    this.music = new Howl({ src: [src], loop: true, volume: 0 });
    this.music.play();
    this.music.fade(0, volume, 900);
  }

  private swapAmbience(mood: string, src: string, volume: number) {
    if (this.lastAmbience === mood && this.ambience) {
      this.ambience.fade(this.ambience.volume(), volume, 650);
      return;
    }
    this.lastAmbience = mood;
    const previous = this.ambience;
    previous?.fade(previous.volume(), 0, 450);
    window.setTimeout(() => previous?.unload(), 520);
    this.ambience = new Howl({ src: [src], loop: true, volume: 0 });
    this.ambience.play();
    this.ambience.fade(0, volume, 900);
  }
}
