import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { TelemetriaRecord, CorridaTipo } from '../types';

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
      tipo_corrida TEXT NOT NULL DEFAULT 'FORMAL',
      primer_intento INTEGER DEFAULT 1
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

  // Migration: ensure tipo_corrida exists if the table was created previously
  try {
    db.exec(`ALTER TABLE telemetria_experimento ADD COLUMN tipo_corrida TEXT NOT NULL DEFAULT 'FORMAL';`);
  } catch {
    // Column already exists
  }
}

export function insertTelemetria(record: TelemetriaRecord): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO telemetria_experimento (
      run_id, escenario, vector, variante, resultado_ataque, motivo_fallo, t_inicio, t_fin, latencia_ms, tipo_corrida, primer_intento
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    record.tipo_corrida || 'FORMAL',
    record.primer_intento ?? 1
  );
}

export function getAllTelemetria(tipo?: CorridaTipo): TelemetriaRecord[] {
  const db = getDb();
  const query = tipo
    ? `SELECT * FROM telemetria_experimento WHERE tipo_corrida = ? ORDER BY rowid ASC`
    : `SELECT * FROM telemetria_experimento ORDER BY rowid ASC`;
  const stmt = db.prepare(query);
  const rows = (tipo ? stmt.all(tipo) : stmt.all()) as any[];
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
    tipo_corrida: (r.tipo_corrida || 'FORMAL') as CorridaTipo,
    primer_intento: r.primer_intento != null ? Number(r.primer_intento) : 1,
  }));
}

export function clearTelemetria(tipo?: CorridaTipo): void {
  const db = getDb();
  if (tipo) {
    const stmt = db.prepare(`DELETE FROM telemetria_experimento WHERE tipo_corrida = ?;`);
    stmt.run(tipo);
  } else {
    db.exec(`DELETE FROM telemetria_experimento;`);
    db.exec(`DELETE FROM usuarios_tradicional;`);
    db.exec(`DELETE FROM credenciales_passkey;`);
  }
}

export function exportCsvString(tipo?: CorridaTipo): string {
  const records = getAllTelemetria(tipo);
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
    'tipo_corrida',
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
    r.latencia_ms.toFixed(4),
    r.tipo_corrida,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
