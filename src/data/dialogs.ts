import type { DialogLine, TimeOfDay, WeatherKind } from '@/types';

// Multi-line dialog snippets per NPC, indexed by context.
// The dialog system picks the best match based on quest state, time, weather.

type Ctx = {
  questStatus: 'locked' | 'offered' | 'active' | 'completed' | 'unknown';
  time: TimeOfDay;
  weather: WeatherKind;
  friendship: number;
};

type DialogBank = (ctx: Ctx) => DialogLine[];

const lyokha: DialogBank = (ctx) => {
  if (ctx.questStatus === 'completed') {
    return [
      { speaker: 'Лёха', text: 'Эта кассета… она звучит как ты, Рыжик. Спокойно.' },
      { speaker: 'Лёха', text: 'Хочешь молока? У меня всегда есть. Для тебя.' },
    ];
  }
  if (ctx.questStatus === 'active') {
    return [
      { speaker: 'Лёха', text: 'Нашёл? Я искал её весь день. Это в сарае где-то.' },
    ];
  }
  if (ctx.weather === 'rain') {
    return [
      { speaker: 'Лёха', text: 'Слушай, как дождь по крыше… Хорошо.' },
      { speaker: 'Лёха', text: 'Я бы сейчас просто посидел тут с тобой.' },
    ];
  }
  if (ctx.time === 'night') {
    return [
      { speaker: 'Лёха', text: 'Ночью всё другое. Тише. Ближе.' },
      { speaker: 'Лёха', text: 'Слышишь сверчков? Это лучшее радио.' },
    ];
  }
  return [
    { speaker: 'Лёха', text: 'Привет, рыжее существо. Опять не спал?' },
    { speaker: 'Лёха', text: 'Я тут… кое-что искал. Кассету. Если найдёшь — приноси.' },
  ];
};

const igor: DialogBank = (ctx) => {
  if (ctx.questStatus === 'completed') {
    return [{ speaker: 'Игорь', text: 'Котяра-выручатель. Сегодня репетиция в гараже!' }];
  }
  if (ctx.weather === 'storm') {
    return [{ speaker: 'Игорь', text: 'Гроза. Это моё настроение, понял?' }];
  }
  return [
    { speaker: 'Игорь', text: 'Слышь, медиатор где-то у костра обронил. Не видел?' },
  ];
};

const nastya: DialogBank = (ctx) => {
  if (ctx.questStatus === 'completed') {
    return [
      { speaker: 'Настя', text: 'У меня теперь самая красивая фотография этого лета.' },
    ];
  }
  if (ctx.time === 'night') {
    return [
      { speaker: 'Настя', text: 'Светлячки уже летают. Если приведёшь их к пруду — будет волшебно.' },
    ];
  }
  return [
    { speaker: 'Настя', text: 'Жду ночи. Мне нужно фото со светлячками.' },
  ];
};

const liza: DialogBank = (ctx) => {
  if (ctx.questStatus === 'completed') {
    return [{ speaker: 'Лиза', text: 'Теперь двор СВЕТИТСЯ! Я ослепла от счастья!' }];
  }
  return [
    { speaker: 'Лиза', text: 'Помоги собрать наклейки, а? Они везде! ВЕЗДЕ!' },
  ];
};

const mage: DialogBank = (ctx) => {
  if (ctx.time !== 'night') {
    return [
      { speaker: 'Маг', text: 'Я приду, когда солнце ляжет. Ты увидишь.' },
    ];
  }
  if (ctx.questStatus === 'completed') {
    return [
      { speaker: 'Маг', text: 'Ты слышал колокольчик. Теперь это место знает тебя.' },
    ];
  }
  return [
    { speaker: 'Маг', text: 'Когда часы покажут полночь, у леса зазвенит колокольчик.' },
    { speaker: 'Маг', text: 'Пойди. Услышь. И больше ничего не нужно.' },
  ];
};

const sonya: DialogBank = () => [
  { speaker: 'Соня', text: 'Лес сегодня дышит ровно. Туда можно идти.' },
];
const nena: DialogBank = () => [
  { speaker: 'Нэна', text: 'Я записала ещё одну странность. Здесь всё помнит о чём-то.' },
];
const kristina: DialogBank = () => [
  { speaker: 'Кристина', text: 'Дай мне пару дней — и каждая лампа будет светить.' },
];
const danya: DialogBank = () => [
  { speaker: 'Даня', text: 'Я сделал тебе игрушку! Ну, почти. Она ещё не взрывается, не бойся.' },
];
const prokhor: DialogBank = () => [
  { speaker: 'Прохор', text: 'Забор почти починил. Гуляй спокойно, котёнок.' },
];

export const DIALOGS: Record<string, DialogBank> = {
  lyokha,
  igor,
  nastya,
  liza,
  mage,
  sonya,
  nena,
  kristina,
  danya,
  prokhor,
};

export const GREETINGS: DialogLine[] = [
  { speaker: '…', text: 'Тёплый ветер качает гирлянды. Где-то далеко играет гитара.' },
  { speaker: '…', text: 'Кажется, лето здесь никогда не торопится.' },
];
