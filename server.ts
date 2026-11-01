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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize SQLite database
  const db = getDb();

  // If table is empty on first boot, pre-populate standard N=50 baseline (200 total runs)
  const existingRecords = getAllTelemetria();
  if (existingRecords.length === 0) {
    console.log('[Laboratorio FIDO2] Inicializando base de datos con corrida experimental N=200...');
    const initialBatch = runBatchSimulation('AMBOS', 'AMBOS', 10);
    for (const rec of initialBatch.records) {
      insertTelemetria(rec);
    }
    console.log(`[Laboratorio FIDO2] ${initialBatch.records.length} iteraciones registradas en SQLite.`);
  }

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // Get all telemetry records
  app.get('/api/telemetria', (req, res) => {
    try {
      const records = getAllTelemetria();
      res.json({ success: true, count: records.length, records });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Export CSV
  app.get('/api/telemetria/export-csv', (req, res) => {
    try {
      const csv = exportCsvString();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="telemetria_fido2_experimento.csv"');
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reset experimental database (clean slate)
  app.post('/api/telemetria/reset', (req, res) => {
    try {
      clearTelemetria();
      res.json({ success: true, message: 'Base de datos de telemetría reiniciada a estado limpio.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Run automated batch simulation (N=50 or custom)
  app.post('/api/simulation/batch', (req, res) => {
    try {
      const { scenario = 'AMBOS', vector = 'AMBOS', repsPerVariant = 10 } = req.body;
      const result = runBatchSimulation(scenario, vector, repsPerVariant);

      for (const rec of result.records) {
        insertTelemetria(rec);
      }

      const allRecords = getAllTelemetria();
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

  // Run single attack step (for interactive manual playground)
  app.post('/api/simulation/single', (req, res) => {
    try {
      const { scenario = 'A', vector = 1, variant = 'subdominio' } = req.body;
      const runId = `MANUAL-${scenario}-V${vector}-${Date.now().toString().slice(-4)}`;
      const result = executeSimulatedAttack(runId, scenario, vector, variant);

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

  // Get full statistical report
  app.get('/api/stats/report', (req, res) => {
    try {
      const records = getAllTelemetria();
      const stats = generateStatisticsReport(records);
      res.json({ success: true, stats });
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
