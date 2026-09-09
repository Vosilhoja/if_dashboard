// lib/chart-colors.ts

export const DATA_PALETTE = {
  data1: '#5B7FFF', // мягкий синий — основной
  data2: '#E8A85C', // тёплый охра — контраст без кислотности
  data3: '#6FCF97', // приглушённый зелёный
  data4: '#B98CE8', // приглушённый лавандовый
  data5: '#E86F6F', // приглушённый терракотовый
};

export const DATA_COLORS_LIST = [
  DATA_PALETTE.data1,
  DATA_PALETTE.data2,
  DATA_PALETTE.data3,
  DATA_PALETTE.data4,
  DATA_PALETTE.data5,
];

// Consistent mapping for Gender
export const GENDER_COLORS = {
  Мужской: DATA_PALETTE.data1,
  Женский: DATA_PALETTE.data2,
};
