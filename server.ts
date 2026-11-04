import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getDb,
  insertTelemetria,
  getAllTelemetria,
  clearTelemetria,
  exportCsvString,
} from './src/services/db.ts';
import {
  executeSimulatedAttack,
  runBatchSimulation,
} from './src/services/crypto-lab.ts';
import { generateStatisticsReport } from './src/services/statistics.ts';
import { CorridaTipo } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize SQLite database (schema only, no artificial auto-population on boot)
  getDb();
  console.log('[Laboratorio FIDO2] Base de datos SQLite lista (sin auto-inicialización de datos).');

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // Get telemetry records (optional filter ?tipo=PILOTO | FORMAL)
  app.get('/api/telemetria', (req, res) => {
    try {
      const tipo = req.query.tipo as CorridaTipo | undefined;
      const records = getAllTelemetria(tipo);
      res.json({ success: true, count: records.length, records });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Export CSV
  app.get('/api/telemetria/export-csv', (req, res) => {
    try {
      const tipo = req.query.tipo as CorridaTipo | undefined;
      const csv = exportCsvString(tipo);
      const filename = tipo 
        ? `telemetria_fido2_${tipo.toLowerCase()}.csv` 
        : `telemetria_fido2_experimento.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reset experimental database (clean slate or by type)
  app.post('/api/telemetria/reset', (req, res) => {
    try {
      const { tipo } = req.body || {};
      clearTelemetria(tipo as CorridaTipo | undefined);
      res.json({ 
        success: true, 
        message: tipo 
          ? `Registros de tipo "${tipo}" eliminados con éxito.` 
          : 'Base de datos de telemetría reiniciada a estado limpio.' 
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Run automated batch simulation (Formal Experiment)
  app.post('/api/simulation/batch', async (req, res) => {
    try {
      const { scenario = 'AMBOS', vector = 'AMBOS', repsPerVariant = 10 } = req.body;
      const result = await runBatchSimulation(scenario, vector, repsPerVariant, 'FORMAL');

      for (const rec of result.records) {
        insertTelemetria(rec);
      }

      const allRecords = getAllTelemetria('FORMAL');
      const stats = generateStatisticsReport(allRecords);

      res.json({
        success: true,
        batchSummary: result.summary,
        recordsAdded: result.records.length,
        totalRecords: allRecords.length,
        stats,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Run single attack step (Interactive manual playground - Pilot/Trial run)
  app.post('/api/simulation/single', async (req, res) => {
    try {
      const { scenario = 'A', vector = 1, variant = 'subdominio' } = req.body;
      const runId = `PILOTO-${scenario}-V${vector}-${Date.now().toString().slice(-4)}`;
      const result = await executeSimulatedAttack(runId, scenario, vector, variant, undefined, 'PILOTO');

      // Save to SQLite
      insertTelemetria(result.record);

      const allRecords = getAllTelemetria();
      const stats = generateStatisticsReport(allRecords);

      res.json({
        success: true,
        record: result.record,
        packetDetails: result.packetDetails,
        stats,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get full statistical report (supports ?tipo=FORMAL or all)
  app.get('/api/stats/report', (req, res) => {
    try {
      const tipo = req.query.tipo as CorridaTipo | undefined;
      const records = getAllTelemetria(tipo);
      const stats = generateStatisticsReport(records);
      res.json({ success: true, stats, totalRecords: records.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // VITE MIDDLEWARE (DEV) OR STATIC FILES (PROD)
  // -------------------------------------------------------------
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Laboratorio FIDO2 UNER] Servidor activo en http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Error de inicio de servidor]:', err);
});
