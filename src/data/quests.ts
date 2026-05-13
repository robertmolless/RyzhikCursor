import type { QuestDef } from '@/types';

// Quest content. Steps are deliberately simple so they can be completed by
// triggering world events (interacting with props, reaching coordinates,
// waiting for the right time of day, catching fireflies, etc).
export const QUESTS: QuestDef[] = [
  {
    id: 'oldCassette',
    npcId: 'lyokha',
    title: 'Старая кассета',
    intro:
      'Лёха где-то потерял кассету. Кажется, в сарае. Она была важная — на ней песня, которую он писал ещё в школе.',
    outro:
      'Спасибо. Я думал, она навсегда пропала. Слышишь? — это лето, записанное на плёнку.',
    reward: { friendship: 3, cassetteId: 'summer-porch' },
    steps: [
      {
        id: 'goto_shed',
        text: 'Подойти к сараю во дворе',
        hint: 'Сарай — справа от дома.',
      },
      {
        id: 'find_cassette',
        text: 'Найти кассету среди коробок',
        hint: 'Толкни коробки — Рыжик это умеет.',
      },
      {
        id: 'return_lyokha',
        text: 'Вернуть кассету Лёхе',
      },
    ],
  },
  {
    id: 'fireflyPhoto',
    npcId: 'nastya',
    title: 'Фото со светлячками',
    intro:
      'Настя хочет сделать фото со светлячками у пруда. Нужно дождаться ночи и привести хотя бы троих к воде.',
    outro:
      'Получилось… идеально. Знаешь, мне теперь не страшно, что лето кончится — оно у меня в кадре.',
    reward: { friendship: 3, cassetteId: 'firefly-waltz' },
    steps: [
      {
        id: 'wait_night',
        text: 'Дождаться ночи',
        hint: 'Можно ускорить время в углу экрана.',
      },
      {
        id: 'catch_3',
        text: 'Поймать 3 светлячков',
        hint: 'Подбегай к ним — они идут за Рыжиком.',
      },
      {
        id: 'lead_to_pond',
        text: 'Привести их к пруду',
      },
    ],
  },
  {
    id: 'lostPick',
    npcId: 'igor',
    title: 'Пропавший медиатор',
    intro:
      'Игорь обронил медиатор где-то у костра. Без него — никакой репетиции.',
    outro: 'Слышь, котяра, ты мой человек. То есть кот. Ну ты понял.',
    reward: { friendship: 2 },
    steps: [
      {
        id: 'goto_fire',
        text: 'Поискать у костра',
      },
      {
        id: 'pick_up',
        text: 'Подобрать медиатор',
      },
      {
        id: 'return_igor',
        text: 'Принести Игорю',
      },
    ],
  },
  {
    id: 'lostStickers',
    npcId: 'liza',
    title: 'Потерянные наклейки',
    intro:
      'Лиза рассыпала наклейки по двору. Помоги их собрать — она украсит ими гирлянды.',
    outro: 'Ты лучший. Теперь двор будет светиться вдвойне.',
    reward: { friendship: 2 },
    steps: [
      { id: 'gather_3', text: 'Собрать 3 наклейки во дворе' },
      { id: 'return_liza', text: 'Принести Лизе' },
    ],
  },
  {
    id: 'moonBell',
    npcId: 'mage',
    title: 'Колокольчик луны',
    intro:
      'Где-то ночью у тропы звенит старый колокольчик. Маг хочет, чтобы кто-то его услышал.',
    outro: 'Этот звук слышит только тот, кому здесь рады. Запомни его.',
    reward: { friendship: 3, cassetteId: 'moonlight-bell' },
    steps: [
      { id: 'wait_midnight', text: 'Дождаться полуночи' },
      { id: 'find_bell', text: 'Найти колокольчик у леса' },
    ],
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(
  QUESTS.map((q) => [q.id, q])
);
