import {
  BookOpen,
  Camera,
  Cat,
  CloudRain,
  Compass,
  Map,
  Music2,
  Settings,
  Sparkles,
  SunMoon,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type React from 'react';
import { useEffect } from 'react';
import { LOCATIONS, NPCS, PHOTO_PRESETS, QUESTS, WORLD_OBJECTS, formatClock, phaseFromMinute } from '../content/world';
import type { QuestProgress } from '../types/game';
import { useGameStore } from '../store/gameStore';

const phaseLabel = {
  morning: 'утро',
  day: 'день',
  goldenHour: 'золотой закат',
  blueEvening: 'синий вечер',
  night: 'глубокая ночь',
};

const weatherLabel = {
  sunny: 'солнце',
  cloudy: 'облачно',
  wind: 'ветер',
  rain: 'дождь',
  storm: 'гроза',
  fog: 'туман',
};

const seasonLabel = {
  summer: 'лето',
  autumn: 'осень',
  winter: 'зима',
  spring: 'весна',
};

const collectionTitle = (id: string) => WORLD_OBJECTS.find((object) => object.id === id)?.title ?? id;

const questStepText = (questId: string, progress: QuestProgress) => {
  const quest = QUESTS.find((entry) => entry.id === questId);
  const step = quest?.steps[progress.stepIndex];
  if (!quest || !step) return 'Готово';
  const count = step.count ? ` (${progress.counters[step.id] ?? 0}/${step.count})` : '';
  return `${step.text}${count}`;
};

const PanelButton = ({
  active,
  label,
  children,
  onClick,
}: {
  active?: boolean;
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    className={`hud-button ${active ? 'hud-button-active' : ''}`}
    type="button"
    aria-label={label}
    onClick={onClick}
  >
    {children}
  </button>
);

export const Hud = () => {
  const state = useGameStore();
  const phase = phaseFromMinute(state.dayMinute);
  const location = LOCATIONS.find((entry) => entry.id === state.location) ?? LOCATIONS[0];
  const activeQuests = QUESTS.filter((quest) => ['available', 'active'].includes(state.quests[quest.id]?.status ?? 'locked')).slice(0, 5);
  const completedQuestCount = Object.values(state.quests).filter((quest) => quest.status === 'completed').length;

  useEffect(() => {
    if (!state.toast) return undefined;
    const timeout = window.setTimeout(() => useGameStore.getState().clearToast(), 5200);
    return () => window.clearTimeout(timeout);
  }, [state.toast]);

  return (
    <div className={`pointer-events-none absolute inset-0 ${state.photoMode ? 'photo-mode-active' : ''}`}>
      <div className="pointer-events-auto absolute left-4 top-4 flex max-w-[min(720px,calc(100vw-2rem))] flex-col gap-3 md:left-6 md:top-6">
        <section className="glass-panel px-4 py-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-amber-50/85">
            <span className="inline-flex items-center gap-2 font-semibold text-amber-50">
              <Cat size={18} /> Рыжик
            </span>
            <span className="soft-pill">
              <SunMoon size={15} /> {formatClock(state.dayMinute)} · {phaseLabel[phase]}
            </span>
            <span className="soft-pill">
              <CloudRain size={15} /> {weatherLabel[state.weather]}
            </span>
            <span className="soft-pill">
              <Sparkles size={15} /> {seasonLabel[state.season]}
            </span>
          </div>
          <div className="mt-3">
            <h1 className="font-display text-2xl font-black tracking-tight text-amber-50 md:text-4xl">
              Рыжик и Старый Загородный Дом
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-amber-50/78">{location.subtitle}</p>
          </div>
        </section>

        {!state.onboardingComplete && (
          <section className="glass-panel max-w-2xl px-4 py-4">
            <p className="text-sm leading-relaxed text-amber-50/88">
              Это playable vertical slice: гуляй по дому, двору, лесу, пруду и теплице; общайся с персонажами,
              собирай кассеты/записи/фото, ловли светлячков и оживляй двор.
            </p>
            <div className="mt-3 grid gap-2 text-xs text-amber-50/72 md:grid-cols-2">
              <span>WASD/стрелки — идти, Shift — бежать</span>
              <span>E/Space — взаимодействие, P — мурчать</span>
              <span>J/C/M — журнал, коллекции, карта</span>
              <span>F — фоторежим, R/T — погода и сезон</span>
            </div>
            <button className="warm-button mt-4" type="button" onClick={state.completeOnboarding}>
              Выйти на крыльцо
            </button>
          </section>
        )}
      </div>

      <div className="pointer-events-auto absolute right-4 top-4 flex flex-col items-end gap-2 md:right-6 md:top-6">
        <div className="glass-panel flex gap-2 p-2">
          <PanelButton active={state.activePanel === 'journal'} label="Журнал" onClick={() => state.togglePanel('journal')}>
            <BookOpen size={19} />
          </PanelButton>
          <PanelButton active={state.activePanel === 'collection'} label="Коллекции" onClick={() => state.togglePanel('collection')}>
            <Music2 size={19} />
          </PanelButton>
          <PanelButton active={state.activePanel === 'map'} label="Карта" onClick={() => state.togglePanel('map')}>
            <Map size={19} />
          </PanelButton>
          <PanelButton active={state.photoMode} label="Фоторежим" onClick={state.togglePhotoMode}>
            <Camera size={19} />
          </PanelButton>
          <PanelButton active={state.activePanel === 'settings'} label="Настройки" onClick={() => state.togglePanel('settings')}>
            <Settings size={19} />
          </PanelButton>
          <PanelButton active={state.muted} label="Звук" onClick={state.toggleMute}>
            {state.muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </PanelButton>
        </div>

        {state.activePanel === 'journal' && (
          <section className="glass-panel panel-card">
            <h2 className="panel-title">Журнал дома</h2>
            <p className="panel-subtitle">Завершено квестов: {completedQuestCount}/{QUESTS.length}</p>
            <div className="mt-4 space-y-3">
              {activeQuests.map((quest) => {
                const progress = state.quests[quest.id];
                return (
                  <article key={quest.id} className="rounded-3xl border border-white/10 bg-white/8 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-amber-50">{quest.title}</h3>
                        <p className="text-xs text-amber-50/58">Даёт: {quest.giver}</p>
                      </div>
                      <span className="rounded-full bg-amber-200/15 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-100">
                        {progress.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-amber-50/72">{quest.summary}</p>
                    <p className="mt-2 rounded-2xl bg-black/15 px-3 py-2 text-xs text-amber-100">
                      {questStepText(quest.id, progress)}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {state.activePanel === 'collection' && (
          <section className="glass-panel panel-card">
            <h2 className="panel-title">Коллекции</h2>
            <div className="mt-3 grid gap-3 text-sm">
              {Object.entries(state.collections).map(([key, values]) => (
                <div key={key} className="rounded-3xl bg-white/8 p-3">
                  <div className="font-semibold capitalize text-amber-50">{key}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {values.length ? (
                      values.map((id) => (
                        <span className="soft-pill" key={id}>
                          {collectionTitle(id)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-amber-50/52">Пока пусто</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {state.activePanel === 'map' && (
          <section className="glass-panel panel-card">
            <h2 className="panel-title">Карта тёплого места</h2>
            <div className="mt-4 space-y-2">
              {LOCATIONS.map((entry) => (
                <button
                  key={entry.id}
                  className={`map-row ${entry.id === state.location ? 'map-row-active' : ''}`}
                  type="button"
                  onClick={() => state.setLocation(entry.id)}
                >
                  <Compass size={16} />
                  <span>
                    <b>{entry.title}</b>
                    <small>{entry.atmosphere.join(' · ')}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {state.activePanel === 'settings' && (
          <section className="glass-panel panel-card">
            <h2 className="panel-title">Настройки и портирование</h2>
            <div className="mt-3 grid gap-2 text-sm text-amber-50/74">
              <button className="warm-button" type="button" onClick={state.cycleWeather}>
                Сменить погоду
              </button>
              <button className="warm-button" type="button" onClick={state.cycleSeason}>
                Сменить сезон
              </button>
              <button className="ghost-button" type="button" onClick={state.reset}>
                Новый уютный дом
              </button>
              <p className="text-xs leading-relaxed text-amber-50/58">
                Сохранения уже изолированы адаптером: localStorage сейчас, Firebase/Telegram identity готовы для будущих
                ежедневных событий, визитов друзей и idle-активностей.
              </p>
            </div>
          </section>
        )}
      </div>

      <div className="pointer-events-auto absolute bottom-4 left-4 right-4 flex flex-col gap-3 md:bottom-6 md:left-6 md:right-6">
        {state.activeDialogue.length > 0 && (
          <section className="glass-panel mx-auto max-w-3xl px-4 py-4" onClick={state.closeDialogue}>
            {state.activeDialogue.map((line, index) => (
              <p key={`${line.speaker}-${index}`} className="text-base leading-relaxed text-amber-50 md:text-lg">
                <span className="font-bold text-amber-200">{line.speaker}: </span>
                {line.text}
              </p>
            ))}
            <p className="mt-2 text-xs text-amber-50/50">Нажми, чтобы закрыть</p>
          </section>
        )}

        <section className="glass-panel mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2 px-3 py-2 text-xs text-amber-50/72">
          <span className="soft-pill">Настроение: {state.catMood}</span>
          <span className="soft-pill">Действие: {state.catAction}</span>
          <span className="soft-pill">Декор двора: {state.decorLevel}</span>
          <span className="soft-pill">Светлячки: {state.firefliesFollowing}/3</span>
          {state.flags.finalNightUnlocked && <span className="soft-pill final-pill">Ночь Светлячков открыта</span>}
        </section>
      </div>

      {state.toast && (
        <aside className="toast-card pointer-events-auto absolute left-1/2 top-28 w-[min(92vw,460px)] -translate-x-1/2">
          <h3 className="font-bold text-amber-50">{state.toast.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-amber-50/76">{state.toast.body}</p>
        </aside>
      )}

      {state.photoMode && <PhotoMode />}
    </div>
  );
};

const PhotoMode = () => {
  const state = useGameStore();
  const preset = PHOTO_PRESETS.find((entry) => entry.id === state.selectedPhotoPreset) ?? PHOTO_PRESETS[0];
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backdropFilter: `blur(${preset.blur}px) saturate(${preset.saturation})`,
          boxShadow: `inset 0 0 160px rgba(10, 6, 20, ${preset.vignette})`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,.35), transparent 1px), radial-gradient(circle at 70% 40%, rgba(0,0,0,.35), transparent 1px)',
          backgroundSize: `${Math.max(2, 7 - preset.grain * 10)}px ${Math.max(2, 7 - preset.grain * 10)}px`,
        }}
      />
      <section className="glass-panel pointer-events-auto absolute bottom-28 left-1/2 w-[min(92vw,620px)] -translate-x-1/2 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="panel-title">Фоторежим</h2>
            <p className="panel-subtitle">Свободная камера через клик по миру, cinematic blur, film grain и пресеты.</p>
          </div>
          <button className="warm-button" type="button" onClick={state.togglePhotoMode}>
            Закрыть
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PHOTO_PRESETS.map((entry) => (
            <button
              className={`soft-pill ${entry.id === state.selectedPhotoPreset ? 'final-pill' : ''}`}
              key={entry.id}
              type="button"
              onClick={() => state.setPhotoPreset(entry.id)}
            >
              {entry.title}
            </button>
          ))}
        </div>
      </section>
    </>
  );
};

export const CastPanel = () => (
  <section className="pointer-events-none absolute left-1/2 top-1/2 hidden max-w-5xl -translate-x-1/2 -translate-y-1/2 grid-cols-2 gap-3 opacity-0">
    {NPCS.map((npc) => (
      <article key={npc.id}>
        {npc.name}: {npc.role}
      </article>
    ))}
  </section>
);
