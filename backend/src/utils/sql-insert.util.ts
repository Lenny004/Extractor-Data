export type SqlDialect = 'mysql' | 'postgresql';

const MAX_IDENT_LEN = 64;

/**
 * Convierte un nombre de columna o tabla en identificador SQL seguro (solo letras, dígitos y _).
 */
export function sanitizeSqlIdentifier(raw: string, fallback: string): string {
    let s = String(raw ?? '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    if (!s) s = fallback;
    if (/^\d/.test(s)) s = `c_${s}`;
    return s.slice(0, MAX_IDENT_LEN);
}

function quoteIdent(name: string, dialect: SqlDialect): string {
    const s = sanitizeSqlIdentifier(name, 'col');
    if (dialect === 'mysql') return `\`${s.replace(/`/g, '')}\``;
    return `"${s.replace(/"/g, '""')}"`;
}

/** Escapado estándar de comillas simples dentro de literales '...' (MySQL y PostgreSQL). */
export function escapeSqlStringLiteral(value: string): string {
    return String(value).replace(/'/g, "''");
}

export function buildInsertSqlScript(opts: {
    tableName: string;
    headers: string[];
    rows: string[][];
    dialect: SqlDialect;
    includeCreateTable: boolean;
    emptyStringAsNull: boolean;
}): string {
    const { headers, rows, dialect, includeCreateTable, emptyStringAsNull } = opts;
    const table = quoteIdent(opts.tableName, dialect);
    const colNames = headers.map((h) => quoteIdent(h, dialect));

    const lines: string[] = [];

    if (includeCreateTable) {
        const colDefs = colNames.map((cn) => `${cn} TEXT`);
        lines.push(`CREATE TABLE IF NOT EXISTS ${table} (`);
        lines.push(`  ${colDefs.join(',\n  ')}`);
        lines.push(dialect === 'mysql' ? `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;` : `);`);
        lines.push('');
    }

    if (rows.length === 0) {
        lines.push('-- Sin filas de datos.');
        return lines.join('\n');
    }

    const colList = colNames.join(', ');

    for (const row of rows) {
        const cells = [...row];
        while (cells.length < headers.length) {
            cells.push('');
        }
        const vals = cells.slice(0, headers.length).map((cell) => {
            const c = cell ?? '';
            if (emptyStringAsNull && c === '') {
                return 'NULL';
            }
            return `'${escapeSqlStringLiteral(c)}'`;
        });
        lines.push(`INSERT INTO ${table} (${colList}) VALUES (${vals.join(', ')});`);
    }

    return lines.join('\n');
}
