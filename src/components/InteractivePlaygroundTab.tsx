import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Globe,
  Server,
  Laptop,
  ArrowRight,
  Code2,
  CheckCircle,
  XCircle,
  Play,
  KeyRound,
  Fingerprint,
} from 'lucide-react';
import {
  Scenario,
  AttackVector,
  PhishingVariant,
  ReplayVariant,
  TelemetriaRecord,
} from '../types';
import {
  PHISHING_VARIANTS_MAP,
  REPLAY_VARIANTS_MAP,
  EXPECTED_ORIGIN,
  EXPECTED_RP_ID,
} from '../constants';

interface InteractivePlaygroundTabProps {
  onRefreshData: () => Promise<void>;
}

export const InteractivePlaygroundTab: React.FC<InteractivePlaygroundTabProps> = ({
  onRefreshData,
}) => {
  const [scenario, setScenario] = useState<Scenario>('B');
  const [vector, setVector] = useState<AttackVector>(1);
  const [phishingVariant, setPhishingVariant] = useState<PhishingVariant>('subdominio');
  const [replayVariant, setReplayVariant] = useState<ReplayVariant>('inmediato');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [lastResult, setLastResult] = useState<{
    record: TelemetriaRecord;
    packetDetails: {
      requestPayload: any;
      interceptedPayload: any;
      attackerPayload: any;
      verificationLog: string[];
    };
  } | null>(null);

  const [activeInspectorTab, setActiveInspectorTab] = useState<
    'victim' | 'intercepted' | 'attacker' | 'rp'
  >('rp');

  const handleExecuteSingle = async () => {
    setIsLoading(true);
    const variant = vector === 1 ? phishingVariant : replayVariant;

    try {
      const response = await fetch('/api/simulation/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          vector,
          variant,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setLastResult({
          record: data.record,
          packetDetails: data.packetDetails,
        });
        await onRefreshData();
      }
    } catch (err) {
      console.error('Error al ejecutar prueba interactiva:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentVariantKey = vector === 1 ? phishingVariant : replayVariant;
  const currentVariantLabel =
    vector === 1
      ? PHISHING_VARIANTS_MAP[phishingVariant]?.label
      : REPLAY_VARIANTS_MAP[replayVariant]?.label;

  return (
    <div className="space-y-8">
      {/* Workbench Header & Parameter Controls */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="max-w-3xl mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider font-mono">
            <span>Banco de Pruebas Manual Interactivo</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
            Simulador de Ataque Paso a Paso: Análisis Criptográfico en Vivo
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            Permite inspeccionar los paquetes HTTP exactos, los encabezados y la validación de los 4 pilares en el Relying Party ante cada variante descrita en la metodología.
          </p>
        </div>

        {/* Configuration selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
          {/* Scenario */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              {scenario === 'A' ? <KeyRound className="w-3.5 h-3.5 text-amber-600" /> : <Fingerprint className="w-3.5 h-3.5 text-blue-600" />}
              <span>Mecanismo Evaluado:</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScenario('A')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                  scenario === 'A'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                A: Contraseña
              </button>
              <button
                type="button"
                onClick={() => setScenario('B')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                  scenario === 'B'
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-800'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                B: FIDO2 Passkey
              </button>
            </div>
          </div>

          {/* Vector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Vector de Ataque:
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVector(1)}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                  vector === 1
                    ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                V1: Phishing
              </button>
              <button
                type="button"
                onClick={() => setVector(2)}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                  vector === 2
                    ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                V2: Replay
              </button>
            </div>
          </div>

          {/* Variant Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {vector === 1 ? 'Variante de Suplantación (Dominio):' : 'Variante de Demora (Replay):'}
            </label>
            {vector === 1 ? (
              <select
                value={phishingVariant}
                onChange={(e) => setPhishingVariant(e.target.value as PhishingVariant)}
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="subdominio">1. Subdominio engañoso (auth.legitimo-login.test)</option>
                <option value="homoglifo">2. Homóglifo / similar (legıtimo.test con 'ı')</option>
                <option value="puerto">3. Puerto alternativo (legitimo.test:8080)</option>
                <option value="tld_prueba">4. TLD alternativo (legitimo.org.test)</option>
                <option value="esquema">5. Esquema no seguro (http:// vs https://)</option>
              </select>
            ) : (
              <select
                value={replayVariant}
                onChange={(e) => setReplayVariant(e.target.value as ReplayVariant)}
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="inmediato">1. Retransmisión inmediata (0 ms)</option>
                <option value="delay_100ms">2. Demora de 100 ms (espera física real)</option>
                <option value="delay_250ms">3. Demora de 250 ms (espera física real)</option>
                <option value="delay_500ms">4. Demora de 500 ms (espera física real)</option>
                <option value="delay_1000ms">5. Demora de 1000 ms / 1 s (espera física real)</option>
              </select>
            )}
          </div>
        </div>

        {/* Trigger button */}
        <div className="mt-5 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Objetivo legítimo configurado: <strong className="font-mono text-slate-700 dark:text-slate-300">{EXPECTED_ORIGIN}</strong> (RP ID: <span className="font-mono">{EXPECTED_RP_ID}</span>)
          </div>

          <button
            onClick={handleExecuteSingle}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors shadow-xs"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isLoading ? 'Simulando Ataque...' : 'Lanzar Ataque Controlado'}</span>
          </button>
        </div>
      </section>

      {/* Visual 3-Node Topology Stage */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono mb-4">
          Topología de Red del Laboratorio Experimental
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Node 1: Victim / Client */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-48">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase font-mono text-slate-500">Nodo 1</span>
              <Laptop className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cliente / Víctima</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Cliente WebAuthn Virtual. Flags: <code>userVerification</code>, <code>BE=1</code>, <code>BS=1</code> (Passkey sincronizable).
              </p>
            </div>
            <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 pt-2 border-t border-slate-200 dark:border-slate-700">
              {vector === 1 ? `Visita: ${PHISHING_VARIANTS_MAP[phishingVariant]?.fakeOrigin}` : `Visita legítima: ${EXPECTED_ORIGIN}`}
            </div>
          </div>

          {/* Node 2: Attacker Proxy */}
          <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex flex-col justify-between h-48">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase font-mono text-rose-600 dark:text-rose-400">Nodo 2: Atacante</span>
              <Globe className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                {vector === 1 ? 'Servidor Suplantador (Phishing)' : 'Proxy Sniffer (Retransmisión)'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                {vector === 1
                  ? 'Clona la interfaz y envía petición fraudulenta intentando cosechar credenciales.'
                  : `Captura el tráfico en la red y retransmite el payload tras ${REPLAY_VARIANTS_MAP[replayVariant]?.delayStr}.`}
              </p>
            </div>
            <div className="text-[11px] font-mono text-rose-700 dark:text-rose-400 pt-2 border-t border-rose-200 dark:border-rose-900/50">
              {vector === 1 ? `Falso Origen: ${PHISHING_VARIANTS_MAP[phishingVariant]?.fakeRpId}` : `Delay: ${REPLAY_VARIANTS_MAP[replayVariant]?.delayStr}`}
            </div>
          </div>

          {/* Node 3: Relying Party */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 flex flex-col justify-between h-48">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase font-mono text-blue-600 dark:text-blue-400">Nodo 3: Servidor</span>
              <Server className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-950 dark:text-blue-200">Relying Party (RP)</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Servidor web de autenticación. Evalúa la firma criptográfica o el hash + salt.
              </p>
            </div>
            <div className="text-[11px] font-mono text-blue-700 dark:text-blue-400 pt-2 border-t border-blue-200 dark:border-blue-900/50">
              Origen Legítimo: {EXPECTED_RP_ID}
            </div>
          </div>
        </div>
      </section>

      {/* Execution Results & Detailed Packet Inspector */}
      {lastResult && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
          {/* Result Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              lastResult.record.resultado_ataque === 'EXITO'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {lastResult.record.resultado_ataque === 'EXITO' ? (
                <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              )}
              <div>
                <h4 className="text-sm font-bold">
                  {lastResult.record.resultado_ataque === 'EXITO'
                    ? 'ATAQUE EXITOSO (Vulnerabilidad Demostrada)'
                    : 'ATAQUE FALLIDO (Protocolo Resistente y Mitigado)'}
                </h4>
                <p className="text-xs opacity-90 mt-0.5">
                  {lastResult.record.resultado_ataque === 'EXITO'
                    ? `El atacante abrió una sesión no autorizada en el Relying Party usando ${
                        scenario === 'A' ? 'la contraseña capturada' : 'la credencial'
                      }.`
                    : `El Relying Party rechazó el intento de acceso con motivo: "${
                        lastResult.record.motivo_fallo
                      }".`}
                </p>
              </div>
            </div>

            <div className="font-mono text-xs flex items-center gap-3 shrink-0">
              <span className="px-2 py-1 bg-white/80 dark:bg-slate-900/80 rounded border border-current">
                Latencia real: {lastResult.record.latencia_ms.toFixed(4)} ms
              </span>
              <span className="px-2 py-1 bg-white/80 dark:bg-slate-900/80 rounded border border-current">
                {lastResult.record.run_id} ({lastResult.record.tipo_corrida})
              </span>
            </div>
          </div>

          {/* Relying Party 4 Pillars Verification Box */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/70 dark:bg-slate-800/40">
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 mb-3">
              Pipeline de Validación Criptográfica en el Servidor (RP)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Pillar 1: Origin */}
              <div
                className={`p-3 rounded-lg border ${
                  scenario === 'B' && vector === 1
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/40'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">1. Origin Binding</span>
                  {scenario === 'B' && vector === 1 ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {scenario === 'A'
                    ? 'N/A (No soportado en contraseñas)'
                    : vector === 1
                    ? `Falso: "${PHISHING_VARIANTS_MAP[phishingVariant]?.fakeOrigin}"`
                    : 'Coincide con origen RP'}
                </div>
              </div>

              {/* Pillar 2: RP ID */}
              <div
                className={`p-3 rounded-lg border ${
                  scenario === 'B' && vector === 1
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/40'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">2. RP ID Scope</span>
                  {scenario === 'B' && vector === 1 ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {scenario === 'A' ? 'N/A' : EXPECTED_RP_ID}
                </div>
              </div>

              {/* Pillar 3: Challenge Nonce */}
              <div
                className={`p-3 rounded-lg border ${
                  scenario === 'B' && vector === 2
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/40'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">3. Nonce de 1 Solo Uso</span>
                  {scenario === 'B' && vector === 2 ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {scenario === 'A'
                    ? 'N/A (Secreto estático)'
                    : vector === 2
                    ? 'Ya consumido en sesión previa'
                    : 'Nonce único verificado'}
                </div>
              </div>

              {/* Pillar 4: Public Key Signature */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">4. Firma Criptográfica</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {scenario === 'A' ? 'SHA-256(password + salt)' : 'crypto.verify(Ed25519) OK'}
                </div>
              </div>
            </div>
          </div>

          {/* Packet Inspector Tabs */}
          <div>
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-3">
              <button
                onClick={() => setActiveInspectorTab('rp')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeInspectorTab === 'rp'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Traza de Ejecución RP
              </button>
              <button
                onClick={() => setActiveInspectorTab('victim')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeInspectorTab === 'victim'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Petición Cliente / Víctima
              </button>
              <button
                onClick={() => setActiveInspectorTab('intercepted')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeInspectorTab === 'intercepted'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Payload Interceptado por Atacante
              </button>
              <button
                onClick={() => setActiveInspectorTab('attacker')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeInspectorTab === 'attacker'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Petición Retransmitida al RP
              </button>
            </div>

            <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[300px]">
              {activeInspectorTab === 'rp' && (
                <div className="space-y-1">
                  {lastResult.packetDetails.verificationLog.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.includes('RECHAZO') || log.includes('FALLO') || log.includes('mitigado')
                          ? 'text-emerald-400 font-bold'
                          : log.includes('VULNERABLE') || log.includes('Éxito')
                          ? 'text-rose-400 font-bold'
                          : 'text-slate-300'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}

              {activeInspectorTab === 'victim' && (
                <pre>{JSON.stringify(lastResult.packetDetails.requestPayload, null, 2)}</pre>
              )}

              {activeInspectorTab === 'intercepted' && (
                <pre>{JSON.stringify(lastResult.packetDetails.interceptedPayload, null, 2)}</pre>
              )}

              {activeInspectorTab === 'attacker' && (
                <pre>{JSON.stringify(lastResult.packetDetails.attackerPayload, null, 2)}</pre>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
