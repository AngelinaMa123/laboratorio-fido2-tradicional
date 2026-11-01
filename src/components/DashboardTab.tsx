import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  PlayCircle,
  ArrowRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import { StatisticsReport } from '../types';

interface DashboardTabProps {
  stats: StatisticsReport | null;
  onNavigateTab: (tab: string) => void;
  onExportCsv: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  stats,
  onNavigateTab,
  onExportCsv,
}) => {
  const v1 = stats?.vector1;
  const v2 = stats?.vector2;
  const latency = stats?.latency;

  const isH1Confirmed = stats?.hypothesisEvaluation.h1Status === 'EVIDENCIA_A_FAVOR';

  return (
    <div className="space-y-8">
      {/* Formal Hypothesis Assessment Hero Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-400">
              <span className="uppercase tracking-wider font-mono">Contraste de Hipótesis de Investigación (H1 vs H0)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isH1Confirmed
                ? 'Evidencia Empírica Concluyente a Favor de H1'
                : 'Evaluación Experimental en Progreso'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>H1 formal:</strong> &quot;Un sistema de autenticación basado en passkeys sincronizadas (FIDO2/WebAuthn) presenta una menor tasa de éxito de ataque que un sistema de usuario y contraseña, frente a phishing e intercepción de tráfico, en las condiciones del laboratorio definido.&quot;
            </p>
            <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              {stats?.hypothesisEvaluation.summary}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('batch')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors shadow-xs whitespace-nowrap"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Ejecutar Batería N=50</span>
            </button>
            <button
              onClick={() => onNavigateTab('stats')}
              className="flex items-center justify-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-xs rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Ver Tablas de Fisher y Rangos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Criterios Formales (Sección 3.3 de la investigación) */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Criterio 1: Reducción $\ge$ 50%</span>
              {v1 && v2 && v1.fisher.relativeReduction >= 50 && v2.fisher.relativeReduction >= 50 ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <Info className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Phishing: <strong>{v1?.fisher.relativeReduction.toFixed(1) ?? '0.0'}%</strong> · Replay: <strong>{v2?.fisher.relativeReduction.toFixed(1) ?? '0.0'}%</strong>
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Criterio 2: Significativo (p &lt; 0.05)</span>
              {v1 && v2 && v1.fisher.isSignificant && v2.fisher.isSignificant ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <Info className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              V1: p = {v1?.fisher.pValue.toExponential(3) ?? '1.0'} · V2: p = {v2?.fisher.pValue.toExponential(3) ?? '1.0'}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Criterio 3: Clopper-Pearson 95%</span>
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">Cota superior</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              0 éxitos en 50 pruebas acota el riesgo real al <strong>7.1%</strong> (IC 95%).
            </p>
          </div>
        </div>
      </section>

      {/* Primary Comparative Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Metric 1: Vector 1 (Phishing) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                Vector 1 · Phishing (TEP)
              </span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Escenario A (Contraseña)</span>
                  <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                    {(v1?.ciA.proportion ? v1.ciA.proportion * 100 : 0).toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    {v1?.fisher.a ?? 0} éxitos / {(v1?.fisher.a ?? 0) + (v1?.fisher.b ?? 0)} intentos
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Escenario B (FIDO2)</span>
                  <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {(v1?.ciB.proportion ? v1.ciB.proportion * 100 : 0).toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    {v1?.fisher.c ?? 0} éxitos / {(v1?.fisher.c ?? 0) + (v1?.fisher.d ?? 0)} intentos
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${(v1?.ciA.proportion ?? 1) * 50}%` }}
                  title="Tasa Escenario A"
                />
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${(v1?.ciB.proportion ?? 0) * 50}%` }}
                  title="Tasa Escenario B"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Reducción relativa:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
              <TrendingDown className="w-3.5 h-3.5" />
              {v1?.fisher.relativeReduction.toFixed(1) ?? '0.0'}%
            </span>
          </div>
        </div>

        {/* Metric 2: Vector 2 (Replay) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                Vector 2 · Replay (TER)
              </span>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Escenario A (Contraseña)</span>
                  <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                    {(v2?.ciA.proportion ? v2.ciA.proportion * 100 : 0).toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    {v2?.fisher.a ?? 0} éxitos / {(v2?.fisher.a ?? 0) + (v2?.fisher.b ?? 0)} intentos
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Escenario B (FIDO2)</span>
                  <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {(v2?.ciB.proportion ? v2.ciB.proportion * 100 : 0).toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    {v2?.fisher.c ?? 0} éxitos / {(v2?.fisher.c ?? 0) + (v2?.fisher.d ?? 0)} intentos
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${(v2?.ciA.proportion ?? 1) * 50}%` }}
                />
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${(v2?.ciB.proportion ?? 0) * 50}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Reducción relativa:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
              <TrendingDown className="w-3.5 h-3.5" />
              {v2?.fisher.relativeReduction.toFixed(1) ?? '0.0'}%
            </span>
          </div>
        </div>

        {/* Metric 3: Latency & Mann-Whitney */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                Latencia Monotónica
              </span>
              <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Mediana Escenario A</span>
                  <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                    {latency?.medianA.toFixed(1) ?? '0.0'}{' '}
                    <span className="text-xs text-slate-400 font-normal">ms</span>
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    IQR: {latency?.iqrA.toFixed(1) ?? '0.0'} ms
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Mediana Escenario B</span>
                  <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                    {latency?.medianB.toFixed(1) ?? '0.0'}{' '}
                    <span className="text-xs text-slate-400 font-normal">ms</span>
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    IQR: {latency?.iqrB.toFixed(1) ?? '0.0'} ms
                  </span>
                </div>
              </div>

              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-[11px] text-slate-600 dark:text-slate-300">
                <span>Prueba U de Mann-Whitney: </span>
                <strong className="font-mono">U = {latency?.uStatistic ?? 0}</strong>,{' '}
                <span className="font-mono">p = {latency?.pValue ?? 1.0}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Diferencia de costo criptográfico:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              +{latency ? (latency.medianB - latency.medianA).toFixed(1) : '0.0'} ms en RP
            </span>
          </div>
        </div>
      </div>

      {/* Structural Comparison: Why Passkeys Win */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
          Comparativa Estructural de Arquitectura de Seguridad
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Traditional Card */}
          <div className="p-4 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
            <div className="flex items-center gap-2 mb-2 text-rose-800 dark:text-rose-300 font-semibold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>Escenario A: Contraseña (Secreto Compartido)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              Las contraseñas se basan en una cadena estática transmitida por el usuario. No existe vinculación criptográfica al origen web:
            </p>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Frente al Phishing:</strong> El usuario escribe su contraseña en la página falsa; el atacante la captura y la reutiliza en el servidor legítimo sin obstáculos.
              </li>
              <li>
                <strong>Frente a Retransmisión (Replay):</strong> El atacante intercepta la petición HTTP y reenvía el mismo secreto en sesiones posteriores, siendo aceptado.
              </li>
              <li>
                <strong>Dependencia de políticas secundarias:</strong> Requiere rate limiting y CAPTCHAs que solo mitigan la fuerza bruta, no el phishing dirigido.
              </li>
            </ul>
          </div>

          {/* FIDO2 Card */}
          <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
            <div className="flex items-center gap-2 mb-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Escenario B: FIDO2 / WebAuthn (Clave Pública)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              Autenticación asimétrica donde la clave privada nunca sale del autenticador seguro y cada respuesta se firma sobre el contexto de la sesión:
            </p>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Inmunidad al Phishing:</strong> El navegador inyecta el origen real en <code className="font-mono text-[11px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">clientDataJSON.origin</code>. Si el sitio es falso, el RP detecta la discrepancia y descarta la firma (<code className="font-mono text-[11px]">RECHAZO_ORIGIN</code>).
              </li>
              <li>
                <strong>Inmunidad al Replay:</strong> Cada firma cubre un <em>challenge</em> nonce de un solo uso que el RP invalida inmediatamente tras su primer consumo (<code className="font-mono text-[11px]">CHALLENGE_CONSUMED</code>).
              </li>
              <li>
                <strong>Credencial por servicio:</strong> Aislamiento por RP ID que elimina totalmente el <em>credential stuffing</em>.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-600 dark:text-slate-300">
          ¿Desea probar los paquetes criptográficos paso a paso o exportar los datos para el informe de cátedra?
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('playground')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
          >
            Abrir Simulador en Vivo
          </button>
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Descargar Dataset CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
