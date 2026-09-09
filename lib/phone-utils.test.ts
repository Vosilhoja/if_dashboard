import { normalizePhoneWithDiagnostics, formatPhoneDisplay, CountryCode } from './phone-utils';

const cases: Array<{
  input: string | number;
  expectedNormalized: string;
  expectedStatus: string;
  expectedCountry: CountryCode;
  expectedFormatted?: string;
}> = [
  // Uzbekistan standard cases (highest priority)
  { input: '998901072701', expectedNormalized: '998901072701', expectedStatus: 'ok', expectedCountry: 'UZ', expectedFormatted: '+998 (90) 107-27-01' },
  { input: '901234567', expectedNormalized: '998901234567', expectedStatus: 'ok', expectedCountry: 'UZ', expectedFormatted: '+998 (90) 123-45-67' },
  { input: '0901234567', expectedNormalized: '998901234567', expectedStatus: 'ok', expectedCountry: 'UZ' }, // 10 digits with leading 0 is Uzbek local
  { input: '90-123-45-67', expectedNormalized: '998901234567', expectedStatus: 'ok', expectedCountry: 'UZ' },
  { input: '+998 90 123 45 67', expectedNormalized: '998901234567', expectedStatus: 'ok', expectedCountry: 'UZ' },
  
  // Russia (+7 / 8...)
  { input: '89000000000', expectedNormalized: '79000000000', expectedStatus: 'foreign', expectedCountry: 'RU', expectedFormatted: '+7 (900) 000-00-00' },
  { input: '79992208905', expectedNormalized: '79992208905', expectedStatus: 'foreign', expectedCountry: 'RU', expectedFormatted: '+7 (999) 220-89-05' },
  { input: '9000000000', expectedNormalized: '79000000000', expectedStatus: 'foreign', expectedCountry: 'RU' }, // 10 digits without leading 0 -> RU
  
  // Kazakhstan (+7 / 770...)
  { input: '77012345678', expectedNormalized: '77012345678', expectedStatus: 'foreign', expectedCountry: 'KZ', expectedFormatted: '+7 (701) 234-56-78' },
  { input: '87012345678', expectedNormalized: '77012345678', expectedStatus: 'foreign', expectedCountry: 'KZ' },
  
  // Ukraine (+380...)
  { input: '380734389998', expectedNormalized: '380734389998', expectedStatus: 'foreign', expectedCountry: 'UA', expectedFormatted: '+380 73 438 99 98' },
  { input: '+380 (50) 123-45-67', expectedNormalized: '380501234567', expectedStatus: 'foreign', expectedCountry: 'UA', expectedFormatted: '+380 50 123 45 67' },
  
  // USA (+1...)
  { input: '14155552671', expectedNormalized: '14155552671', expectedStatus: 'foreign', expectedCountry: 'US', expectedFormatted: '+1 (415) 555-2671' },
  { input: '+1 (212) 555-0199', expectedNormalized: '12125550199', expectedStatus: 'foreign', expectedCountry: 'US', expectedFormatted: '+1 (212) 555-0199' },

  // Truncated / corrupt / invalid
  { input: '998708205', expectedNormalized: '', expectedStatus: 'truncated', expectedCountry: 'UZ' },
  { input: '9.09269949997969e+17', expectedNormalized: '', expectedStatus: 'corrupted_scientific', expectedCountry: 'UNKNOWN' },
  { input: '0', expectedNormalized: '', expectedStatus: 'invalid', expectedCountry: 'UNKNOWN' },
  { input: '0000000', expectedNormalized: '', expectedStatus: 'invalid', expectedCountry: 'UNKNOWN' },
];

let allPassed = true;

for (const c of cases) {
  const result = normalizePhoneWithDiagnostics(c.input);
  const okNorm = result.normalized === c.expectedNormalized;
  const okStatus = result.status === c.expectedStatus;
  const okCountry = result.country === c.expectedCountry;
  let okFormat = true;
  if (c.expectedFormatted) {
    const formatted = formatPhoneDisplay(result.normalized, result.country);
    okFormat = formatted === c.expectedFormatted;
  }

  const ok = okNorm && okStatus && okCountry && okFormat;
  if (!ok) allPassed = false;
  console.log(
    ok ? 'PASS' : 'FAIL',
    JSON.stringify(c.input),
    '->',
    result,
    c.expectedFormatted ? `Formatted: ${formatPhoneDisplay(result.normalized, result.country)}` : '',
    ok ? '' : `(Expected: norm=${c.expectedNormalized}, status=${c.expectedStatus}, country=${c.expectedCountry})`
  );
}

if (!allPassed) {
  process.exit(1);
}
console.log('\nAll phone normalization & formatting tests passed successfully!');
