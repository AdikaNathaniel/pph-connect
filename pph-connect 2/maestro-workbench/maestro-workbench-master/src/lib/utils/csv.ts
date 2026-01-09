type ColumnDefinition = {
  key: string;
  label?: string;
  example?: string;
};

const escapeField = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  if (/[,\r\n]/.test(stringValue)) {
    return `"${stringValue}"`;
  }

  return stringValue;
};

export const generateCSVTemplate = (columns: ColumnDefinition[]): string => {
  if (!Array.isArray(columns) || columns.length === 0) {
    return '';
  }

  const headers = columns.map((column) => column.label ?? column.key).join(',');
  const exampleRow = columns.map((column) => escapeField(column.example ?? '')).join(',');

  return `${headers}\n${exampleRow}\n`;
};

export const parseCSV = (content: string): { headers: string[]; rows: Record<string, string>[] } => {
  if (!content || typeof content !== 'string') {
    return { headers: [], rows: [] };
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];

      if (char === '"') {
        const next = line[index + 1];
        if (inQuotes && next === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result.map((entry) => entry.trim());
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });

    return record;
  });

  return { headers, rows };
};

export const exportToCSV = (
  data: Record<string, unknown>[],
  headers: string[],
  filename: string,
  saver: (filename: string, content: string) => void
) => {
  const headerLine = headers.join(',');
  const rows = data.map((row) =>
    headers.map((header) => escapeField(row[header] ?? '')).join(',')
  );

  const csvContent = `${headerLine}\n${rows.join('\n')}\n`;
  saver(filename, csvContent);
};
