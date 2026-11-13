import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Terminal,
  Activity,
} from 'lucide-react';
import { TelemetriaRecord, StatisticsReport } from '../types';

interface BatchRunnerTabProps {
  stats: StatisticsReport | null;
  records: TelemetriaRecord[];
  onRefreshData: () => Promise<void>;
  onResetDb: () => void;
  isResetting: boolean;
}

export const BatchRunnerTab: React.FC<BatchRunnerTabProps> = ({
  stats,
  records,
  onRefreshData,
  onResetDb,
  isResetting,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<'AMBOS' | 'A' | 'B'>('AMBOS');
  const [selectedVector, setSelectedVector] = useState<'AMBOS' | 1 | 2>('AMBOS');
  const [repsPerVariant, setRepsPerVariant] = useState<number>(10);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [totalExpected, setTotalExpected] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [logFilter, setLogFilter] = useState<'ALL' | 'EXITO' | 'FALLO'>('ALL');

  const calculateBatchTotal = () => {
    const scCount = selectedScenario === 'AMBOS' ? 2 : 1;
    const vecCount = selectedVector === 'AMBOS' ? 2 : 1;
    const variantsPerVector = 5;
    return scCount * vecCount * variantsPerVector * repsPerVariant;
  };

  const handleRunBatch = async () => {
    setIsRunning(true);
    const expected = calculateBatchTotal();
    setTotalExpected(expected);
    setCurrentProgress(0);
    setStatusMessage(`Iniciando corrida automatizada de ${expected} iteraciones de laboratorio...`);
    setExecutionLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] Iniciando lote controlado: Escenarios=${selectedScenario}, Vectores=${selectedVector}, Reps/Variante=${repsPerVariant}`,
      ...prev.slice(0, 50),
    ]);

    try {
      const response = await fetch('/api/simulation/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: selectedScenario,
          vector: selectedVector,
          repsPerVariant,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentProgress(expected);
        setStatusMessage(
          `¡Corrida finalizada con éxito! ${data.recordsAdded} iteraciones agregadas a SQLite. Total en BD: ${data.totalRecords}`
        );
        setExecutionLogs((prev) => [
          `[${new Date().toLocaleTimeString()}] Lote completado: ${data.batchSummary.total} ejecuciones (${data.batchSummary.exitos} ataques exitosos, ${data.batchSummary.fallos} mitigados por el RP).`,
          ...prev.slice(0, 80),
        ]);
        await onRefreshData();
      } else {
        setStatusMessage(`Error en la ejecución: ${data.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`Error de comunicación con el backend: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (logFilter === 'ALL') return true;
    return r.resultado_ataque === logFilter;
  });

  return (
    <div className="space-y-8">
      {/* Configuration Header Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Ejecutor Automatizado de Pruebas Controladas (Experimento Formal)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ejecución reproducible: banco de pruebas de validación criptográfica y protocolos de autenticación con esperas y latencias reales.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetDb}
              disabled={isResetting || isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar BD</span>
            </button>
          </div>
        </div>

        {/* Form Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
          {/* Escenario Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Escenario de Autenticación:
            </label>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value as any)}
              disabled={isRunning}
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="AMBOS">Ambos (A: Tradicional y B: FIDO2)</option>
              <option value="A">Solo Escenario A (Contraseña Hash+Salt)</option>
              <option value="B">Solo Escenario B (WebAuthn / Passkeys)</option>
            </select>
          </div>

          {/* Vector Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Vector de Ataque:
            </label>
            <select
              value={selectedVector}
              onChange={(e) => setSelectedVector(e.target.value === 'AMBOS' ? 'AMBOS' : Number(e.target.value) as any)}
              disabled={isRunning}
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="AMBOS">Ambos (Vector 1: Phishing y Vector 2: Replay)</option>
              <option value="1">Vector 1: Phishing y Suplantación (5 variantes)</option>
              <option value="2">Vector 2: Intercepción y Replay (5 demoras)</option>
            </select>
          </div>

          {/* Repeticiones por variante */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Repeticiones por variante:
            </label>
            <select
              value={repsPerVariant}
              onChange={(e) => setRepsPerVariant(Number(e.target.value))}
              disabled={isRunning}
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10 repeticiones (N=50 formal por vector)</option>
              <option value={5}>5 repeticiones (N=25 prueba reducida)</option>
              <option value={2}>2 repeticiones (N=10 prueba piloto rápida)</option>
              <option value={1}>1 repetición (Verificación de esquema)</option>
            </select>
          </div>
        </div>

        {/* Action Button & Run Status */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white font-mono">
              Total a simular: {calculateBatchTotal()} iteraciones
            </span>
            <span className="text-slate-400">·</span>
            <span>
              {selectedScenario === 'AMBOS' && selectedVector === 'AMBOS' && repsPerVariant === 10
                ? 'Batería Completa N=200'
                : 'Lote configurado a medida'}
            </span>
          </div>

          <button
            onClick={handleRunBatch}
            disabled={isRunning}
            className={`flex items-center gap-2 px-5 py-2.5 font-semibold text-xs sm:text-sm rounded-lg text-white shadow-xs transition-all whitespace-nowrap ${isRunning ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isRunning ? 'Ejecutando Simulación...' : 'Iniciar Batería de Pruebas'}</span>
          </button>
        </div>

        {/* Progress Display */}
        {(isRunning || statusMessage) && (
          <div className="mt-5 p-4 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
            <div className="flex items-center justify-between text-xs text-blue-900 dark:text-blue-300 mb-2">
              <span className="font-medium">{statusMessage}</span>
              <span className="font-mono font-bold">
                {currentProgress} / {totalExpected}
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-900/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{
                  width: totalExpected > 0 ? `${(currentProgress / totalExpected) * 100}%` : '100%',
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Live Execution Stream & Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terminal logs */}
        <div className="lg:col-span-1 bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-xs shadow-xs border border-slate-800 flex flex-col h-[400px]">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 text-slate-400 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Consola de Telemetría</span>
            </div>
            <span>monotónico</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 text-[11px] pr-1">
            {executionLogs.length === 0 ? (
              <div className="text-slate-600 italic">Esperando inicio de pruebas controladas...</div>
            ) : (
              executionLogs.map((log, idx) => (
                <div key={idx} className="leading-tight text-slate-300">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Telemetry records table preview */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col h-[400px]">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Registros en Base de Datos ({records.length})
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 mr-1">Filtro:</span>
              <button
                onClick={() => setLogFilter('ALL')}
                className={`px-2 py-1 text-[11px] rounded transition-colors ${logFilter === 'ALL'
                  ? 'bg-slate-200 dark:bg-slate-700 font-bold text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                Todos
              </button>
              <button
                onClick={() => setLogFilter('EXITO')}
                className={`px-2 py-1 text-[11px] rounded transition-colors ${logFilter === 'EXITO'
                  ? 'bg-rose-100 dark:bg-rose-950/60 font-bold text-rose-700 dark:text-rose-400'
                  : 'text-slate-500 hover:text-rose-600'
                  }`}
              >
                Éxito Atacante
              </button>
              <button
                onClick={() => setLogFilter('FALLO')}
                className={`px-2 py-1 text-[11px] rounded transition-colors ${logFilter === 'FALLO'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 font-bold text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-emerald-600'
                  }`}
              >
                Mitigados (RP)
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredRecords.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No hay registros en la base de datos para este filtro.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 sticky top-0">
                  <tr>
                    <th className="py-1.5 px-2 font-medium">Run ID</th>
                    <th className="py-1.5 px-2 font-medium">Escenario</th>
                    <th className="py-1.5 px-2 font-medium">Vector</th>
                    <th className="py-1.5 px-2 font-medium">Variante</th>
                    <th className="py-1.5 px-2 font-medium">Resultado</th>
                    <th className="py-1.5 px-2 font-medium">Latencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                  {filteredRecords.slice(-50).reverse().map((r) => (
                    <tr key={r.run_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-1.5 px-2 text-slate-900 dark:text-slate-200">{r.run_id}</td>
                      <td className="py-1.5 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.escenario === 'A'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                            }`}
                        >
                          {r.escenario === 'A' ? 'A (Pass)' : 'B (FIDO2)'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">
                        {r.vector === 1 ? 'V1 (Phish)' : 'V2 (Replay)'}
                      </td>
                      <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                        {r.variante}
                      </td>
                      <td className="py-1.5 px-2">
                        {r.resultado_ataque === 'EXITO' ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            ÉXITO
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            FALLO ({r.motivo_fallo ?? 'RECHAZADO'})
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-slate-500 dark:text-slate-400 tabular-nums">
                        {r.latencia_ms.toFixed(1)} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
