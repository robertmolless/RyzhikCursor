import type { GameSnapshot } from '../types/game';

const SAVE_KEY = 'ryzhik-country-house-save-v1';

export interface SaveAdapter {
  load(): GameSnapshot | null;
  save(snapshot: GameSnapshot): void;
  clear(): void;
}

export const localSaveAdapter: SaveAdapter = {
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? (JSON.parse(raw) as GameSnapshot) : null;
    } catch (error) {
      console.warn('Could not read local save', error);
      return null;
    }
  },
  save(snapshot) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...snapshot, lastSavedAt: Date.now() }));
    } catch (error) {
      console.warn('Could not write local save', error);
    }
  },
  clear() {
    localStorage.removeItem(SAVE_KEY);
  },
};

export const createCloudSaveEnvelope = (snapshot: GameSnapshot) => ({
  schemaVersion: 1,
  gameId: 'ryzhik-country-house',
  updatedAt: new Date().toISOString(),
  snapshot,
});
