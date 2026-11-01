export type Scenario = 'A' | 'B'; // 'A' = Contraseña Tradicional, 'B' = FIDO2/Passkey
export type AttackVector = 1 | 2; // 1 = Phishing/Suplantación, 2 = Retransmisión/Replay
export type AttackResult = 'EXITO' | 'FALLO';

export type PhishingVariant = 
  | 'subdominio'     // auth.legitimo-login.test
  | 'homoglifo'      // legıtimo.test (caracteres homóglifos)
  | 'puerto'         // legitimo.test:8080
  | 'tld_prueba'     // legitimo.org.test
  | 'esquema';       // http://legitimo.test

export type ReplayVariant = 
  | 'inmediato'      // 0s inmediato
  | 'delay_10s'      // 10 segundos
  | 'delay_1m'       // 1 minuto
  | 'delay_5m'       // 5 minutos
  | 'delay_30m';      // 30 minutos

export interface TelemetriaRecord {
  run_id: string;
  escenario: Scenario;
  vector: AttackVector;
  variante: string;
  resultado_ataque: AttackResult;
  motivo_fallo: string | null;
  t_inicio: number;
  t_fin: number;
  latencia_ms: number;
  primer_intento: number; // 1 = exito directo, 0 = requirio reintento o fallo
}

export interface FisherResult {
  a: number; // Escenario A exitos
  b: number; // Escenario A fallos
  c: number; // Escenario B exitos
  d: number; // Escenario B fallos
  pValue: number;
  isSignificant: boolean; // p < 0.05
  relativeReduction: number; // % reducción relativa de B vs A
  hypothesisSupported: boolean; // evidencia a favor de H1
}

export interface ClopperPearsonCI {
  k: number;
  n: number;
  proportion: number;
  lower: number;
  upper: number;
  percentStr: string;
}

export interface MannWhitneyResult {
  medianA: number;
  iqrA: number;
  q1A: number;
  q3A: number;
  medianB: number;
  iqrB: number;
  q1B: number;
  q3B: number;
  uStatistic: number;
  zScore: number;
  pValue: number;
  countA: number;
  countB: number;
}

export interface VariantSummary {
  variante: string;
  totalA: number;
  exitosA: number;
  tasaA: number;
  totalB: number;
  exitosB: number;
  tasaB: number;
}

export interface StatisticsReport {
  totalRuns: number;
  runsByScenario: {
    A: number;
    B: number;
  };
  vector1: {
    fisher: FisherResult;
    ciA: ClopperPearsonCI;
    ciB: ClopperPearsonCI;
    variants: VariantSummary[];
  };
  vector2: {
    fisher: FisherResult;
    ciA: ClopperPearsonCI;
    ciB: ClopperPearsonCI;
    variants: VariantSummary[];
  };
  latency: MannWhitneyResult;
  hypothesisEvaluation: {
    h1Status: 'EVIDENCIA_A_FAVOR' | 'EVIDENCIA_EN_CONTRA_O_PARCIAL' | 'DATOS_INSUFICIENTES';
    summary: string;
  };
}

export interface SimulationLog {
  id: string;
  timestamp: string;
  run_id: string;
  escenario: Scenario;
  vector: AttackVector;
  variante: string;
  step: string;
  details: string;
  resultado: AttackResult;
  motivo_fallo?: string | null;
}
