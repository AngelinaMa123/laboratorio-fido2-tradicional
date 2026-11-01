/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { ProjectHeader } from './components/ProjectHeader';
import { DashboardTab } from './components/DashboardTab';
import { BatchRunnerTab } from './components/BatchRunnerTab';
import { InteractivePlaygroundTab } from './components/InteractivePlaygroundTab';
import { TelemetryAnalysisTab } from './components/TelemetryAnalysisTab';
import { TelemetriaRecord, StatisticsReport } from './types';
import { generateStatisticsReport } from './services/statistics';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [records, setRecords] = useState<TelemetriaRecord[]>([]);
  const [stats, setStats] = useState<StatisticsReport | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync dark mode class on <html>
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/telemetria');
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
        const computedReport = generateStatisticsReport(data.records);
        setStats(computedReport);
      }
    } catch (err) {
      console.error('Error al cargar telemetría:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetDb = async () => {
    if (!window.confirm('¿Desea reiniciar la base de datos de telemetría a estado limpio? Se borrarán las iteraciones actuales.')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch('/api/telemetria/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Error al reiniciar base de datos:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportCsv = () => {
    window.location.href = '/api/telemetria/export-csv';
  };

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Strict 3-zone Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        setIsDark={setIsDark}
        onExportCsv={handleExportCsv}
      />

      {/* Academic Institutional Context Header */}
      <ProjectHeader
        stats={stats}
        onResetDb={handleResetDb}
        isResetting={isResetting}
      />

      {/* Main Workspace Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            onNavigateTab={setActiveTab}
            onExportCsv={handleExportCsv}
          />
        )}

        {activeTab === 'batch' && (
          <BatchRunnerTab
            stats={stats}
            records={records}
            onRefreshData={loadData}
            onResetDb={handleResetDb}
            isResetting={isResetting}
          />
        )}

        {activeTab === 'playground' && (
          <InteractivePlaygroundTab onRefreshData={loadData} />
        )}

        {activeTab === 'stats' && (
          <TelemetryAnalysisTab
            stats={stats}
            records={records}
            onExportCsv={handleExportCsv}
          />
        )}

      </main>

      {/* Quiet Academic Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">UNER</span>
            <span>·</span>
            <span>Facultad de Ciencias de la Administración</span>
            <span>·</span>
            <span>Licenciatura en Sistemas</span>
          </div>

          <div className="text-center sm:text-right">
            <span>Taller de Investigación (2026) · Vialle, Caraballo, Chang &amp; Chang</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
