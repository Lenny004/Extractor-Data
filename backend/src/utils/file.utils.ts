import fs from 'fs';
import path from 'path';

export const UPLOAD_MAX_AGE_MS = 120000;
const UPLOAD_FILENAME_TS = /^(\d+)-/;

export function uploadTimestampMs(filename: string, stats: fs.Stats): number {
    const m = filename.match(UPLOAD_FILENAME_TS);
    if (m) {
        const ts = parseInt(m[1], 10);
        if (!Number.isNaN(ts)) return ts;
    }
    const birth = stats.birthtimeMs;
    return birth > 0 ? birth : stats.mtimeMs;
}

export function cleanupExpiredUploads(uploadsDir: string): void {
    const now = Date.now();
    let removed = 0;
    try {
        if (!fs.existsSync(uploadsDir)) return;
        const names = fs.readdirSync(uploadsDir);
        for (const name of names) {
            const filePath = path.join(uploadsDir, name);
            let stats: fs.Stats;
            try { stats = fs.statSync(filePath); } catch { continue; }
            if (!stats.isFile()) continue;
            const uploadedAt = uploadTimestampMs(name, stats);
            if (now - uploadedAt <= UPLOAD_MAX_AGE_MS) continue;
            try { fs.unlinkSync(filePath); removed += 1; } catch { }
        }
        if (removed > 0) console.log(`[uploads] Eliminados ${removed} archivo(s) caducados`);
    } catch (err) {
        console.error('[uploads] Error al limpiar caducados:', err);
    }
}

export function detectType(values: unknown[]): string {
    if (values.length === 0) return 'text';
    const sample = values.slice(0, 50);
    if (sample.every(v => v instanceof Date)) return 'date';
    if (sample.every(v => typeof v === 'number')) return 'number';
    if (sample.every(v => typeof v === 'boolean')) return 'boolean';
    if (sample.every(v => typeof v === 'string' && /^\d{4}[-/]\d{2}[-/]\d{2}/.test(v))) return 'date';
    return 'text';
}

export function formatValue(value: unknown): string {
    if (value instanceof Date) return value.toISOString().split('T')[0];
    return String(value);
}