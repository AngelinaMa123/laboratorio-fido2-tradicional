import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { TelemetriaRecord } from '../types';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = path.resolve(process.cwd(), 'telemetria.db');
    dbInstance = new DatabaseSync(dbPath);
    initSchema(dbInstance);
  }
  return dbInstance;
}

export function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS telemetria_experimento (
      run_id TEXT PRIMARY KEY,
      escenario TEXT NOT NULL,
      vector INTEGER NOT NULL,
      variante TEXT NOT NULL,
      resultado_ataque TEXT NOT NULL,
      motivo_fallo TEXT,
      t_inicio REAL NOT NULL,
      t_fin REAL NOT NULL,
      latencia_ms REAL NOT NULL,
      primer_intento INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usuarios_tradicional (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credenciales_passkey (
      credential_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      public_key TEXT NOT NULL,
      sign_count INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

export function insertTelemetria(record: TelemetriaRecord): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO telemetria_experimento (
      run_id, escenario, vector, variante, resultado_ataque, motivo_fallo, t_inicio, t_fin, latencia_ms, primer_intento
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.run_id,
    record.escenario,
    record.vector,
    record.variante,
    record.resultado_ataque,
    record.motivo_fallo ?? null,
    record.t_inicio,
    record.t_fin,
    record.latencia_ms,
    record.primer_intento
  );
}

export function getAllTelemetria(): TelemetriaRecord[] {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM telemetria_experimento ORDER BY rowid ASC`);
  const rows = stmt.all() as any[];
  return rows.map((r) => ({
    run_id: String(r.run_id),
    escenario: r.escenario as 'A' | 'B',
    vector: Number(r.vector) as 1 | 2,
    variante: String(r.variante),
    resultado_ataque: r.resultado_ataque as 'EXITO' | 'FALLO',
    motivo_fallo: r.motivo_fallo ? String(r.motivo_fallo) : null,
    t_inicio: Number(r.t_inicio),
    t_fin: Number(r.t_fin),
    latencia_ms: Number(r.latencia_ms),
    primer_intento: Number(r.primer_intento),
  }));
}

export function clearTelemetria(): void {
  const db = getDb();
  db.exec(`DELETE FROM telemetria_experimento;`);
  db.exec(`DELETE FROM usuarios_tradicional;`);
  db.exec(`DELETE FROM credenciales_passkey;`);
}

export function exportCsvString(): string {
  const records = getAllTelemetria();
  const headers = [
    'run_id',
    'escenario',
    'vector',
    'variante',
    'resultado_ataque',
    'motivo_fallo',
    't_inicio',
    't_fin',
    'latencia_ms',
    'primer_intento',
  ];

  const rows = records.map((r) => [
    r.run_id,
    r.escenario,
    r.vector,
    `"${r.variante.replace(/"/g, '""')}"`,
    r.resultado_ataque,
    r.motivo_fallo ? `"${r.motivo_fallo.replace(/"/g, '""')}"` : '',
    r.t_inicio.toFixed(4),
    r.t_fin.toFixed(4),
    r.latencia_ms.toFixed(2),
    r.primer_intento,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
