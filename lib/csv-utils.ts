/**
 * Унифицированная утилита для экспорта данных в CSV и Excel (.xls / XML Spreadsheet)
 * с поддержкой кириллицы/узбекских символов, BOM и настраиваемых разделителей.
 */

export interface CSVHeaderOption {
  key: string;
  label: string;
}

export function getExportSettings(): { delimiter: string; withBOM: boolean; defaultFormat: 'csv' | 'xlsx' } {
  if (typeof window === 'undefined') {
    return { delimiter: ';', withBOM: true, defaultFormat: 'xlsx' };
  }
  const delimiter = localStorage.getItem('hurmo_csv_delimiter') || ';';
  const withBOM = localStorage.getItem('hurmo_csv_bom') !== 'false';
  const defaultFormat = (localStorage.getItem('hurmo_export_format') as 'csv' | 'xlsx') || 'xlsx';
  return { delimiter, withBOM, defaultFormat };
}

export function exportRowsToCSV(
  rows: Record<string, any>[],
  headers: string[] | CSVHeaderOption[],
  filename: string,
  customDelimiter?: string
) {
  if (!rows || rows.length === 0) return;

  const { delimiter: savedDelimiter, withBOM } = getExportSettings();
  const sep = customDelimiter || savedDelimiter;

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
    headerLabels.map(escapeCsv).join(sep),
    ...rows.map((row) =>
      headerKeys.map((key) => escapeCsv(row[key] ?? '')).join(sep)
    ),
  ];

  const prefix = withBOM ? '\uFEFF' : '';
  const blob = new Blob([prefix + lines.join('\r\n')], {
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

/**
 * Экспорт в нативный формат Microsoft Excel XML Spreadsheet
 * Открывается в Excel на любой версии Windows/Mac без проблем с кодировками или точками с запятой.
 */
export function exportRowsToExcel(
  rows: Record<string, any>[],
  headers: string[] | CSVHeaderOption[],
  filename: string
) {
  if (!rows || rows.length === 0) return;

  const isObjectHeaders = typeof headers[0] === 'object' && headers[0] !== null;

  const headerLabels: string[] = isObjectHeaders
    ? (headers as CSVHeaderOption[]).map((h) => h.label)
    : (headers as string[]);

  const headerKeys: string[] = isObjectHeaders
    ? (headers as CSVHeaderOption[]).map((h) => h.key)
    : (headers as string[]);

  const escapeXml = (val: any) => {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const headerCells = headerLabels
    .map(
      (lbl) =>
        `<Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(lbl)}</Data></Cell>`
    )
    .join('');

  const rowXmls = rows.map((row) => {
    const cells = headerKeys.map((key) => {
      const val = row[key];
      const isNum = typeof val === 'number' && !isNaN(val);
      const type = isNum ? 'Number' : 'String';
      return `<Cell><Data ss:Type="${type}">${escapeXml(val ?? '')}</Data></Cell>`;
    });
    return `<Row>${cells.join('')}</Row>`;
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="11"/>
    </Style>
    <Style ss:ID="HeaderStyle">
      <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#466FF6" ss:Pattern="Solid"/>
      <Alignment ss:Vertical="Center"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Данные">
    <Table>
      <Row ss:Height="24">${headerCells}</Row>
      ${rowXmls.join('\n      ')}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanName = filename.replace(/\.(csv|xlsx|xls)$/i, '');
  link.setAttribute('download', `${cleanName}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
