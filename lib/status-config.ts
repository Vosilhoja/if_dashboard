// lib/status-config.ts

export interface StatusCategoryConfig {
  id: string;
  name: string;
  description: string;
  phrases: string[];
  maxDistance?: number;
}

export const STATUS_CONFIG: {
  linkSent: StatusCategoryConfig;
  repeatSent: StatusCategoryConfig;
  declined: StatusCategoryConfig;
  alreadyRegistered: StatusCategoryConfig;
  wrongPerson: StatusCategoryConfig;
  thresholds: { smsMatchPercentage: number };
} = {
  linkSent: {
    id: 'link_sent',
    name: 'Ссылка отправлена',
    description: 'Ссылка на регистрацию отправлена абоненту',
    phrases: ['silka yuborildi', 'silka_yuborildi', 'silka yuborilgan', 'silka_yuborilgan', 'yubordik', 'sms yuborildi'],
    maxDistance: 2,
  },
  repeatSent: {
    id: 'repeat_sent',
    name: 'Повторная отправка',
    description: 'Ссылка отправлена повторно',
    phrases: [
      'povtor silka yuborildi',
      'povtor silka',
      'povtor',
      'qayta malumot berildi',
      'qayta silka',
      'кайта малумот берилди',
      'учирган кайта малумот берилди',
    ],
    maxDistance: 2,
  },
  declined: {
    id: 'declined',
    name: 'Отказ',
    description: 'Абонент отказался или недоступен для регистрации',
    phrases: [
      'otkaz',
      "foydalanmasligini aytdi",
      "vaqti yo'q",
      'vaqti yo`q',
      "o'chirib qo'ydi",
      'o`chirib qo`ydi',
      'учириб куйди',
      'ishtirok etmagan',
      'sms ketmadi',
      "o'ylab ko'radi",
      'o`ylab ko`radi',
      'keyinroq',
      'keyinro',
    ],
    maxDistance: 2,
  },
  alreadyRegistered: {
    id: 'already_registered',
    name: 'Уже зарегистрирован через бот',
    description: 'Абонент сообщил, что уже пользуется ботом или сам зарегистрируется',
    phrases: [
      'bot bor',
      'botdan o`zi ro`yxatdan o`tishini aytdi',
      "botdan ro'yxatdan o'tdik",
      'botdan ro`yxatdan o`tdik',
      'руйхатдан уттик',
      "botdan ro'yxatdan o'tdi",
      "o'zi ro'yxatdan o'tishini aytdi",
    ],
    maxDistance: 2,
  },
  wrongPerson: {
    id: 'wrong_person',
    name: 'Не тот человек / номер',
    description: 'Номер принадлежит другому человеку или зарегистрирован с другого номера',
    phrases: [
      'boshqa raqamidan ro`yxatdan o`tgan',
      'boshqa odam',
      'raqam egasi boshqa',
      'иккинчи раками',
    ],
    maxDistance: 2,
  },
  thresholds: {
    smsMatchPercentage: 0.9,
  },
};

export type StatusConfigType = typeof STATUS_CONFIG;
export const DEFAULT_STATUS_CONFIG = STATUS_CONFIG;
