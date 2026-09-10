// lib/region-name-map.ts

export const REGION_RU_TO_EN: Record<string, string> = {
  'г. Ташкент': 'Tashkent',
  'Ташкентская область': 'Tashkent Region',
  'Самаркандская область': 'Samarqand Region',
  'Ферганская область': 'Fergana Region',
  'Андижанская область': 'Andijan Region',
  'Наманганская область': 'Namangan Region',
  'Бухарская область': 'Bukhara Region',
  'Хорезмская область': 'Xorazm Region',
  'Кашкадарьинская область': 'Qashqadaryo Region',
  'Сурхандарьинская область': 'Surxondaryo Region',
  'Навоийская область': 'Navoiy Region',
  'Джизакская область': 'Jizzakh Region',
  'Сырдарьинская область': 'Sirdaryo Region',
  'Республика Каракалпакстан': 'Republic of Karakalpakstan',
};

// Reverse map: EN shape name -> RU name as in main_base
export const REGION_EN_TO_RU: Record<string, string> = Object.entries(REGION_RU_TO_EN).reduce(
  (acc, [ru, en]) => {
    acc[en] = ru;
    return acc;
  },
  {} as Record<string, string>
);

// Map normalized variations to canonical RU name
const NORMALIZED_RU_MAP: Record<string, string> = {
  'ташкент': 'г. Ташкент',
  'г. ташкент': 'г. Ташкент',
  'город ташкент': 'г. Ташкент',
  'ташкентская область': 'Ташкентская область',
  'ташкентская обл.': 'Ташкентская область',
  'самаркандская область': 'Самаркандская область',
  'самарканд': 'Самаркандская область',
  'ферганская область': 'Ферганская область',
  'фергана': 'Ферганская область',
  'андижанская область': 'Андижанская область',
  'андижан': 'Андижанская область',
  'наманганская область': 'Наманганская область',
  'наманган': 'Наманганская область',
  'бухарская область': 'Бухарская область',
  'бухара': 'Бухарская область',
  'хорезмская область': 'Хорезмская область',
  'хорезм': 'Хорезмская область',
  'кашкадарьинская область': 'Кашкадарьинская область',
  'кашкадарья': 'Кашкадарьинская область',
  'сурхандарьинская область': 'Сурхандарьинская область',
  'сурхандарья': 'Сурхандарьинская область',
  'навоийская область': 'Навоийская область',
  'навои': 'Навоийская область',
  'джизакская область': 'Джизакская область',
  'джизак': 'Джизакская область',
  'сырдарьинская область': 'Сырдарьинская область',
  'сырдарья': 'Сырдарьинская область',
  'республика каракалпакстан': 'Республика Каракалпакстан',
  'каракалпакстан': 'Республика Каракалпакстан',
};

/**
 * Normalizes any variation of region name to the canonical Russian name in main_base
 */
export function normalizeRegionName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (REGION_RU_TO_EN[trimmed]) return trimmed;

  const lower = trimmed.toLowerCase();
  if (NORMALIZED_RU_MAP[lower]) return NORMALIZED_RU_MAP[lower];

  // Also check if it's already an EN shape name
  if (REGION_EN_TO_RU[trimmed]) return REGION_EN_TO_RU[trimmed];

  return trimmed;
}

/**
 * Get English name for GeoJSON matching from Russian region name
 */
export function getRegionEnName(ruName: string): string {
  const canonical = normalizeRegionName(ruName);
  return REGION_RU_TO_EN[canonical] || canonical;
}
