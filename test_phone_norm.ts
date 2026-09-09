import { normalizePhone } from './lib/phone-utils';

interface TestCase {
  scenario: number;
  input: string | number | null | undefined;
  expected: string;
  desc: string;
}

const testCases: TestCase[] = [
  {
    scenario: 1,
    input: "998901234567",
    expected: "998901234567",
    desc: "уже полный формат -> оставить как есть"
  },
  {
    scenario: 2,
    input: "901234567",
    expected: "998901234567",
    desc: "9 цифр без кода страны -> добавить 998 в начало"
  },
  {
    scenario: 3,
    input: "90-123-45-67",
    expected: "998901234567",
    desc: "с дефисами без кода страны"
  },
  {
    scenario: 3,
    input: "90 123 45 67",
    expected: "998901234567",
    desc: "с пробелами без кода страны"
  },
  {
    scenario: 3,
    input: "(90) 123-45-67",
    expected: "998901234567",
    desc: "со скобками без кода страны"
  },
  {
    scenario: 4,
    input: "+998 90 123 45 67",
    expected: "998901234567",
    desc: "с плюсом и пробелами"
  },
  {
    scenario: 5,
    input: "0901234567",
    expected: "998901234567",
    desc: "10 цифр, начинается с локального нуля"
  },
  {
    scenario: 6,
    input: "89901234567",
    expected: "998901234567",
    desc: "с восьмеркой доступа 89901234567"
  },
  {
    scenario: 6,
    input: "8998901234567",
    expected: "998901234567",
    desc: "с восьмеркой доступа 8998901234567"
  },
  {
    scenario: 7,
    input: "998-90-123-45-67",
    expected: "998901234567",
    desc: "код страны с разделителями"
  },
  {
    scenario: 9,
    input: "  \t\uFEFF\u00A0 998901234567 \n\u200B ",
    expected: "998901234567",
    desc: "лишние пробелы, табуляция, юникод-пробелы"
  },
  {
    scenario: 10,
    input: "12345678",
    expected: "",
    desc: "8 или меньше цифр (обрезанный Google Sheets) -> считать невалидным, пустая строка"
  },
  {
    scenario: 10,
    input: 9012345, // 7 digits
    expected: "",
    desc: "7 цифр как число -> не угадывать наугад, пустая строка"
  },
  {
    scenario: 11,
    input: "79030030050",
    expected: "79030030050",
    desc: "российский номер 11 цифр без 998 -> оставить как есть"
  },
  {
    scenario: 11,
    input: "+7 (903) 003-00-50",
    expected: "79030030050",
    desc: "международный номер с форматированием -> очистить только цифры"
  },
  {
    scenario: 12,
    input: "12345",
    expected: "",
    desc: "менее 7 цифр -> пустая строка"
  },
  {
    scenario: 12,
    input: "0000000000",
    expected: "",
    desc: "повторяющиеся нули -> пустая строка"
  },
  {
    scenario: 12,
    input: "999999999999",
    expected: "",
    desc: "повторяющиеся девятки -> пустая строка"
  }
];

let passed = 0;
let failed = 0;

for (const t of testCases) {
  const result = normalizePhone(t.input);
  if (result === t.expected) {
    passed++;
    console.log(`[PASS] Scenario ${t.scenario}: ${t.desc} -> "${result}"`);
  } else {
    failed++;
    console.error(`[FAIL] Scenario ${t.scenario}: ${t.desc}\n  Input: "${t.input}"\n  Expected: "${t.expected}"\n  Got: "${result}"`);
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testCases.length} tests.`);
if (failed > 0) {
  process.exit(1);
}
