import React, { useState } from 'react';
import {
  Download,
  Search,
  HelpCircle,
  Calculator,
} from 'lucide-react';
import { TelemetriaRecord, StatisticsReport } from '../types';

interface TelemetryAnalysisTabProps {
  stats: StatisticsReport | null;
  records: TelemetriaRecord[];
  onExportCsv: () => void;
}

export const TelemetryAnalysisTab: React.FC<TelemetryAnalysisTabProps> = ({
  stats,
  records,
  onExportCsv,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEscenario, setFilterEscenario] = useState<'TODOS' | 'A' | 'B'>('TODOS');
  const [filterVector, setFilterVector] = useState<'TODOS' | '1' | '2'>('TODOS');
  const [filterResultado, setFilterResultado] = useState<'TODOS' | 'EXITO' | 'FALLO'>('TODOS');
  const [filterTipo, setFilterTipo] = useState<'TODOS' | 'FORMAL' | 'PILOTO'>('TODOS');

  const v1 = stats?.vector1;
  const v2 = stats?.vector2;
  const latency = stats?.latency;

  const filteredRecords = records.filter((r) => {
    if (filterTipo !== 'TODOS' && r.tipo_corrida !== filterTipo) return false;
    if (filterEscenario !== 'TODOS' && r.escenario !== filterEscenario) return false;
    if (filterVector !== 'TODOS' && String(r.vector) !== filterVector) return false;
    if (filterResultado !== 'TODOS' && r.resultado_ataque !== filterResultado) return false;
    if (
      searchTerm &&
      !r.run_id.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !r.variante.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(r.motivo_fallo?.toLowerCase().includes(searchTerm.toLowerCase()))
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header & Export Action */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider font-mono">
            <span>Fase 4: Análisis Estadístico Descriptivo e Inferencial</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
            Contraste de Hipótesis y Telemetría Experimental
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cálculo formal del Test Exacto de Fisher (Fisher, 1922), Intervalos Clopper-Pearson al 95% (1934) y Mann-Whitney U (1947).
          </p>
        </div>

        <button
          onClick={onExportCsv}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0 whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Dataset CSV ({records.length} filas)</span>
        </button>
      </section>

      {/* Contingency Tables (2x2) and Fisher Exact Test */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Vector 1 (Phishing) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-mono uppercase text-blue-600 dark:text-blue-400 font-semibold block">
                Vector 1 · Phishing y Suplantación
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tabla de Contingencia 2x2 &amp; Test de Fisher
              </h3>
            </div>
            <Calculator className="w-4 h-4 text-slate-400" />
          </div>

          <div className="mt-4">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                  <th className="py-2 text-left">Esquema</th>
                  <th className="py-2 text-right">Éxito Atacante</th>
                  <th className="py-2 text-right">Fallo Atacante</th>
                  <th className="py-2 text-right">Total (n)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-2 font-medium text-slate-900 dark:text-slate-200">
                    Escenario A (Contraseña)
                  </td>
                  <td className="py-2 text-right font-bold text-rose-600 dark:text-rose-400">
                    {v1?.fisher.a ?? 0}
                  </td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                    {v1?.fisher.b ?? 0}
                  </td>
                  <td className="py-2 text-right font-semibold">
                    {(v1?.fisher.a ?? 0) + (v1?.fisher.b ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-slate-900 dark:text-slate-200">
                    Escenario B (FIDO2)
                  </td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                    {v1?.fisher.c ?? 0}
                  </td>
                  <td className="py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {v1?.fisher.d ?? 0}
                  </td>
                  <td className="py-2 text-right font-semibold">
                    {(v1?.fisher.c ?? 0) + (v1?.fisher.d ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300">Test exacto de Fisher (bilateral):</span>
              <strong className="font-mono text-slate-900 dark:text-white">
                p = {v1?.fisher.pValue.toExponential(4) ?? '1.0'}
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300">Significación estadística (α = 0.05):</span>
              <span
                className={`font-semibold ${v1?.fisher.isSignificant ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                  }`}
              >
                {v1?.fisher.isSignificant ? 'Significativo (p < 0.05)' : 'No significativo'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300">Reducción relativa del riesgo:</span>
              <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                {v1?.fisher.relativeReduction.toFixed(1) ?? '0.0'}%
              </strong>
            </div>
          </div>
        </div>

        {/* Table 2: Vector 2 (Replay) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-mono uppercase text-blue-600 dark:text-blue-400 font-semibold block">
                Vector 2 · Retransmisión (Replay)
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tabla de Contingencia 2x2 &amp; Test de Fisher
              </h3>
            </div>
            <Calculator className="w-4 h-4 text-slate-400" />
          </div>

          <div className="mt-4">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                  <th className="py-2 text-left">Esquema</th>
                  <th className="py-2 text-right">Éxito Atacante</th>
                  <th className="py-2 text-right">Fallo Atacante</th>
                  <th className="py-2 text-right">Total (n)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-2 font-medium text-slate-900 dark:text-slate-200">
                    Escenario A (Contraseña)
                  </td>
                  <td className="py-2 text-right font-bold text-rose-600 dark:text-rose-400">
                    {v2?.fisher.a ?? 0}
                  </td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                    {v2?.fisher.b ?? 0}
                  </td>
                  <td className="py-2 text-right font-semibold">
                    {(v2?.fisher.a ?? 0) + (v2?.fisher.b ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-slate-900 dark:text-slate-200">
                    Escenario B (FIDO2)
                  </td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                    {v2?.fisher.c ?? 0}
                  </td>
                  <td className="py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {v2?.fisher.d ?? 0}
                  </td>
                  <td className="py-2 text-right font-semibold">
                    {(v2?.fisher.c ?? 0) + (v2?.fisher.d ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300">Test exacto de Fisher (bilateral):</span>
              <strong className="font-mono text-slate-900 dark:text-white">
                p = {v2?.fisher.pValue.toExponential(4) ?? '1.0'}
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300">Significación estadística (α = 0.05):</span>
              <span
                className={`font-semibold ${v2?.fisher.isSignificant ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                  }`}
              >
                {v2?.fisher.isSignificant ? 'Significativo (p < 0.05)' : 'No significativo'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300">Reducción relativa del riesgo:</span>
              <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                {v2?.fisher.relativeReduction.toFixed(1) ?? '0.0'}%
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* Clopper-Pearson 95% Confidence Intervals & Interpretation */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Intervalos de Confianza Exactos de Clopper-Pearson (95%)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Estimación binomial rigurosa de la tasa de ataque para N=50 réplicas.
            </p>
          </div>
          <span className="text-xs font-mono text-blue-600 dark:text-blue-400">Biometrika (1934)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Vector 1: Contraseña Tradicional (Escenario A)
                </span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {v1?.ciA.percentStr}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full relative overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{ width: `${(v1?.ciA.proportion ?? 1) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Vector 1: FIDO2 / WebAuthn (Escenario B)
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {v1?.ciB.percentStr}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full relative overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.max((v1?.ciB.upper ?? 0.071) * 100, 2)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Academic Note from thesis page 24 */}
          <div className="p-4 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <div className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Fundamento Epistemológico</span>
            </div>
            <p className="leading-relaxed">
              <em>&quot;Un resultado de 0 ataques exitosos en 50 iteraciones no equivale a riesgo nulo: el límite superior del intervalo de confianza del 95% para 0 de 50 es 7.1%. Por eso las conclusiones se formularán como evidencia dentro de las condiciones del laboratorio.&quot;</em>
            </p>
          </div>
        </div>
      </section>

      {/* Latency Analysis & Mann-Whitney U */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Análisis No Paramétrico de Latencia (Mann y Whitney, 1947)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Medición de tiempo monotónico (t_fin - t_inicio) en milisegundos durante la autenticación legítima (Vector 2).
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">N=50 mediciones por escenario</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-mono text-slate-400 block uppercase">Escenario A (Contraseña)</span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
              {latency?.medianA.toFixed(1) ?? '0.0'} <span className="text-xs font-normal text-slate-500">ms</span>
            </div>
            <div className="text-xs text-slate-500 mt-2 font-mono">
              Q1: {latency?.q1A.toFixed(1)} ms · Q3: {latency?.q3A.toFixed(1)} ms
              <br />
              Rango Intercuartil (IQR): <strong>{latency?.iqrA.toFixed(1)} ms</strong>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 block uppercase">Escenario B (FIDO2)</span>
            <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
              {latency?.medianB.toFixed(1) ?? '0.0'} <span className="text-xs font-normal text-slate-500">ms</span>
            </div>
            <div className="text-xs text-slate-500 mt-2 font-mono">
              Q1: {latency?.q1B.toFixed(1)} ms · Q3: {latency?.q3B.toFixed(1)} ms
              <br />
              Rango Intercuartil (IQR): <strong>{latency?.iqrB.toFixed(1)} ms</strong>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-mono text-slate-400 block uppercase">Estadísticos de Prueba</span>
              <div className="text-xs font-mono space-y-1 mt-2 text-slate-700 dark:text-slate-300">
                <div>Estadístico U: <strong>{latency?.uStatistic ?? 0}</strong></div>
                <div>Puntuación Z: <strong>{latency?.zScore ?? 0}</strong></div>
                <div>p-valor asintótico: <strong>{latency?.pValue ?? 1.0}</strong></div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Resultado descriptivo que no condiciona la hipótesis H1.
            </p>
          </div>
        </div>
      </section>

      {/* Breakdown by Variant */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Desglose Controlado por Variante de Ataque (Sección 3.6)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vector 1 Variants */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase text-slate-500 mb-2">
              Vector 1: Variantes de Suplantación de Dominio (Phishing)
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                  <tr>
                    <th className="py-2 px-3 text-left">Variante</th>
                    <th className="py-2 px-3 text-right">Escenario A</th>
                    <th className="py-2 px-3 text-right">Escenario B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {v1?.variants.map((v) => (
                    <tr key={v.variante}>
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {v.variante}
                      </td>
                      <td className="py-2 px-3 text-right text-rose-600 dark:text-rose-400 font-bold">
                        {v.tasaA.toFixed(0)}% ({v.exitosA}/{v.totalA})
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        {v.tasaB.toFixed(0)}% ({v.exitosB}/{v.totalB})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vector 2 Variants */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase text-slate-500 mb-2">
              Vector 2: Variantes de Demora de Retransmisión (Replay)
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                  <tr>
                    <th className="py-2 px-3 text-left">Demora</th>
                    <th className="py-2 px-3 text-right">Escenario A</th>
                    <th className="py-2 px-3 text-right">Escenario B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {v2?.variants.map((v) => (
                    <tr key={v.variante}>
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {v.variante}
                      </td>
                      <td className="py-2 px-3 text-right text-rose-600 dark:text-rose-400 font-bold">
                        {v.tasaA.toFixed(0)}% ({v.exitosA}/{v.totalA})
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        {v.tasaB.toFixed(0)}% ({v.exitosB}/{v.totalB})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Raw Telemetry Records Table with Full Filtering */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Explorador de Telemetría SQLite (Tabla telemetria_experimento)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Mostrando {filteredRecords.length} de {records.length} iteraciones registradas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por run_id o motivo..."
                className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-52"
              />
            </div>

            <select
              value={filterEscenario}
              onChange={(e) => setFilterEscenario(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white"
            >
              <option value="TODOS">Todos Escenarios</option>
              <option value="A">Solo Escenario A</option>
              <option value="B">Solo Escenario B</option>
            </select>

            <select
              value={filterVector}
              onChange={(e) => setFilterVector(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white"
            >
              <option value="TODOS">Todos Vectores</option>
              <option value="1">Vector 1 (Phishing)</option>
              <option value="2">Vector 2 (Replay)</option>
            </select>

            <select
              value={filterResultado}
              onChange={(e) => setFilterResultado(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white"
            >
              <option value="TODOS">Todos Resultados</option>
              <option value="EXITO">Solo Éxito</option>
              <option value="FALLO">Solo Fallo</option>
            </select>

            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white"
            >
              <option value="TODOS">Todos los Tipos</option>
              <option value="FORMAL">Solo Formal (Experimento)</option>
              <option value="PILOTO">Solo Piloto (Pruebas)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[450px]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">run_id</th>
                <th className="py-2 px-3 font-semibold">tipo</th>
                <th className="py-2 px-3 font-semibold">escenario</th>
                <th className="py-2 px-3 font-semibold">vector</th>
                <th className="py-2 px-3 font-semibold">variante</th>
                <th className="py-2 px-3 font-semibold">resultado_ataque</th>
                <th className="py-2 px-3 font-semibold">motivo_fallo</th>
                <th className="py-2 px-3 font-semibold">latencia_ms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
              {filteredRecords.map((r) => (
                <tr key={r.run_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">{r.run_id}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        r.tipo_corrida === 'FORMAL'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {r.tipo_corrida || 'FORMAL'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${r.escenario === 'A'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                        }`}
                    >
                      {r.escenario}
                    </span>
                  </td>
                  <td className="py-2 px-3">{r.vector}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{r.variante}</td>
                  <td className="py-2 px-3">
                    {r.resultado_ataque === 'EXITO' ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">EXITO</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">FALLO</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-500 italic">{r.motivo_fallo ?? '-'}</td>
                  <td className="py-2 px-3 font-mono tabular-nums">{r.latencia_ms.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
