import { normalizePhoneWithDiagnostics } from './phone-utils';

const cases: Array<[string | number, string, string]> = [
  ['998901072701', '998901072701', 'ok'],
  ['901234567', '998901234567', 'ok'],
  ['0901234567', '998901234567', 'ok'],
  ['90-123-45-67', '998901234567', 'ok'],
  ['+998 90 123 45 67', '998901234567', 'ok'],
  ['380734389998', '380734389998', 'foreign'],
  ['79992208905', '79992208905', 'foreign'],
  ['998708205', '', 'truncated'],
  ['9.09269949997969e+17', '', 'corrupted_scientific'],
  ['0', '', 'invalid'],
  ['0000000', '', 'invalid'],
];

let allPassed = true;

for (const [input, expectedNormalized, expectedStatus] of cases) {
  const result = normalizePhoneWithDiagnostics(input);
  const ok = result.normalized === expectedNormalized && result.status === expectedStatus;
  if (!ok) allPassed = false;
  console.log(
    ok ? 'PASS' : 'FAIL',
    JSON.stringify(input),
    '->',
    result,
    ok ? '' : `(ожидалось ${expectedNormalized} / ${expectedStatus})`
  );
}

if (!allPassed) {
  process.exit(1);
}
