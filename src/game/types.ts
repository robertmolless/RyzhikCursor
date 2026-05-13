export type DayPhase = 'morning' | 'day' | 'goldenHour' | 'blueEvening' | 'night';
export type Weather = 'sun' | 'rain' | 'storm' | 'fog' | 'wind' | 'cloudy';
export type Season = 'summer' | 'autumn' | 'winter' | 'spring';

export type LocationId =
  | 'oldHouse'
  | 'yard'
  | 'forest'
  | 'pond'
  | 'greenhouse'
  | 'garage'
  | 'roof'
  | 'attic'
  | 'basement';

export type NpcId =
  | 'lyokha'
  | 'igor'
  | 'nastya'
  | 'liza'
  | 'mage'
  | 'sonya'
  | 'nena'
  | 'kristina'
  | 'danya'
  | 'prokhor';

export type QuestId =
  | 'oldCassette'
  | 'fireflyPhoto'
  | 'stormNight'
  | 'roofNight'
  | 'moonBell'
  | 'greenhouse';

export type CollectibleKind = 'cassette' | 'photo' | 'note' | 'charm' | 'sticker' | 'plant' | 'toy';
export type CatIntent =
  | 'wander'
  | 'followWarmth'
  | 'reactToMusic'
  | 'hideFromStorm'
  | 'nap'
  | 'play'
  | 'sitWithFriends'
  | 'huntFireflies';

export interface Vec2 {
  x: number;
  y: number;
}

export interface NpcDefinition {
  id: NpcId;
  name: string;
  role: string;
  appearance: string;
  color: number;
  accent: number;
  home: LocationId;
  likes: string[];
  quest: QuestId;
  schedule: Partial<Record<DayPhase, LocationId>>;
  lines: Record<DayPhase | Weather | 'friend' | 'quest', string[]>;
}

export interface LocationDefinition {
  id: LocationId;
  title: string;
  subtitle: string;
  mood: string;
  unlockHint?: string;
}

export interface QuestObjective {
  id: string;
  text: string;
  done: boolean;
}

export interface QuestDefinition {
  id: QuestId;
  title: string;
  npc: NpcId;
  summary: string;
  reward: string;
  unlocks: string[];
  objectives: string[];
}

export interface CollectibleDefinition {
  id: string;
  kind: CollectibleKind;
  title: string;
  description: string;
  location: LocationId;
  weather?: Weather;
  dayPhase?: DayPhase;
}

export interface UpgradeDefinition {
  id: string;
  title: string;
  description: string;
  costLabel: string;
}
