import type { CassetteDef } from '@/types';

export const CASSETTES: CassetteDef[] = [
  {
    id: 'summer-porch',
    title: 'Лето на крыльце',
    author: 'Лёха',
    mood: 'acoustic',
    memory:
      'Тёплый июльский вечер. Кто-то играет на расстроенной гитаре, и кажется, что лето теперь навсегда.',
    unlockHint: 'Награда за квест Лёхи.',
  },
  {
    id: 'firefly-waltz',
    title: 'Вальс светлячков',
    author: 'Настя',
    mood: 'piano',
    memory:
      'Маленькие огоньки кружатся над прудом, как будто кто-то рассыпал звёзды по воде.',
    unlockHint: 'Награда за квест Насти.',
  },
  {
    id: 'garage-thunder',
    title: 'Гараж и гроза',
    author: 'Игорь',
    mood: 'rock',
    memory:
      'Грохочет рок-н-ролл. За окном гром, и кажется, что мир сейчас взорвётся — но это просто музыка.',
    unlockHint: 'Включается во время грозы у гаража.',
  },
  {
    id: 'lofi-rain',
    title: 'Дождь по жести',
    author: '—',
    mood: 'lofi',
    memory:
      'Дождь стучит по крыше, и в комнате становится теплее, чем летним днём.',
    unlockHint: 'Найди кассету во время дождя у дома.',
  },
  {
    id: 'moonlight-bell',
    title: 'Колокольчик луны',
    author: 'Маг',
    mood: 'ambient',
    memory:
      'Тихий звон в тумане. Лес слушает. Кажется, время остановилось — и это правильно.',
    unlockHint: 'Награда за квест Мага.',
  },
  {
    id: 'final-fireflies',
    title: 'Ночь Светлячков',
    author: 'Все вместе',
    mood: 'ambient',
    memory:
      'Тысячи огоньков, все на крыше, Рыжик мурчит, и кажется — лето никогда не закончится.',
    unlockHint: 'Финальная сцена. Собери все кассеты.',
  },
];

export const CASSETTE_BY_ID: Record<string, CassetteDef> = Object.fromEntries(
  CASSETTES.map((c) => [c.id, c])
);
