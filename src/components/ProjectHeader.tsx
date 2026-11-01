import React from 'react';
import { Database, CheckCircle2, AlertTriangle } from 'lucide-react';
import { StatisticsReport } from '../types';

interface ProjectHeaderProps {
  stats: StatisticsReport | null;
  onResetDb: () => void;
  isResetting: boolean;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ stats, onResetDb, isResetting }) => {
  const isH1Supported = stats?.hypothesisEvaluation.h1Status === 'EVIDENCIA_A_FAVOR';

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          {/* Institutional Kicker with subtle typographic separators */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            <span>UNER · Fac. Ciencias de la Administración</span>
            <span aria-hidden="true">·</span>
            <span>Lic. en Sistemas</span>
            <span aria-hidden="true">·</span>
            <span>Taller de Investigación</span>
            <span aria-hidden="true">·</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Evaluar la seguridad de FIDO2/Passkeys frente a la autenticación mediante contraseña
          </h1>


        </div>

        {/* Telemetry Status and Reset Action */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase tracking-wider font-mono">Corridas en SQLite</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {stats?.totalRuns ?? 0} <span className="text-slate-400 font-normal">/ 200 meta</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
            {isH1Supported ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase tracking-wider font-mono">Contraste de H1</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {stats?.hypothesisEvaluation.h1Status === 'EVIDENCIA_A_FAVOR'
                  ? 'Evidencia Favorable'
                  : stats?.totalRuns === 0
                    ? 'Sin Datos'
                    : 'Parcial / En Progreso'}
              </span>
            </div>
          </div>

          <button
            onClick={onResetDb}
            disabled={isResetting}
            title="Reiniciar base de datos de telemetría a estado limpio"
            className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900 rounded-lg transition-colors whitespace-nowrap"
          >
            {isResetting ? 'Reiniciando...' : 'Reiniciar BD'}
          </button>
        </div>
      </div>
    </div>
  );
};
