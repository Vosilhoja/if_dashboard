/**
 * Унифицированная утилита для экспорта данных в CSV с поддержкой BOM (UTF-8 Excel)
 * и корректным экранированием спецсимволов.
 */

export interface CSVHeaderOption {
  key: string;
  label: string;
}

export function exportRowsToCSV(
  rows: Record<string, any>[],
  headers: string[] | CSVHeaderOption[],
  filename: string
) {
  if (!rows || rows.length === 0) return;

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const isObjectHeaders = typeof headers[0] === 'object' && headers[0] !== null;

  const headerLabels: string[] = isObjectHeaders
    ? (headers as CSVHeaderOption[]).map((h) => h.label)
    : (headers as string[]);

  const headerKeys: string[] = isObjectHeaders
    ? (headers as CSVHeaderOption[]).map((h) => h.key)
    : (headers as string[]);

  const lines = [
    headerLabels.map(escapeCsv).join(';'),
    ...rows.map((row) =>
      headerKeys.map((key) => escapeCsv(row[key] ?? '')).join(';')
    ),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
