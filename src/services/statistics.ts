import {
  TelemetriaRecord,
  FisherResult,
  ClopperPearsonCI,
  MannWhitneyResult,
  StatisticsReport,
  VariantSummary,
} from '../types';

/**
 * Log-gamma function approximation (Lanczos formula) for computing factorials and Beta functions.
 */
function logGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109583115912,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }

  z -= 1;
  let base = c[0];
  for (let i = 1; i < g + 2; i++) {
    base += c[i] / (z + i);
  }

  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(base);
}

function logFactorial(n: number): number {
  if (n <= 1) return 0;
  return logGamma(n + 1);
}

/**
 * Hypergeometric probability P(X = k)
 * a = successes in pop 1, b = failures in pop 1
 * c = successes in pop 2, d = failures in pop 2
 */
function hypergeometricProb(a: number, b: number, c: number, d: number): number {
  const n = a + b + c + d;
  const logP =
    logFactorial(a + b) +
    logFactorial(c + d) +
    logFactorial(a + c) +
    logFactorial(b + d) -
    (logFactorial(a) +
      logFactorial(b) +
      logFactorial(c) +
      logFactorial(d) +
      logFactorial(n));
  return Math.exp(logP);
}

/**
 * Two-tailed Fisher's Exact Test for 2x2 table:
 * [[a, b],
 *  [c, d]]
 * a = Escenario A éxitos, b = Escenario A fallos
 * c = Escenario B éxitos, d = Escenario B fallos
 */
export function calculateFisherExact(
  a: number,
  b: number,
  c: number,
  d: number,
  alpha = 0.05
): FisherResult {
  const totalA = a + b;
  const totalB = c + d;
  const totalSuccess = a + c;
  const totalFail = b + d;
  const n = totalA + totalB;

  if (totalA === 0 || totalB === 0) {
    return {
      a,
      b,
      c,
      d,
      pValue: 1.0,
      isSignificant: false,
      relativeReduction: 0,
      hypothesisSupported: false,
    };
  }

  const currentProb = hypergeometricProb(a, b, c, d);
  let pValue = 0;

  // Possible values for 'a' range from max(0, totalA - totalFail) to min(totalA, totalSuccess)
  const minA = Math.max(0, totalA - totalFail);
  const maxA = Math.min(totalA, totalSuccess);

  for (let testA = minA; testA <= maxA; testA++) {
    const testB = totalA - testA;
    const testC = totalSuccess - testA;
    const testD = totalFail - testB;

    if (testB >= 0 && testC >= 0 && testD >= 0) {
      const prob = hypergeometricProb(testA, testB, testC, testD);
      // Two-sided test: sum all probabilities less than or equal to observed table prob (with small float tolerance)
      if (prob <= currentProb * (1 + 1e-10)) {
        pValue += prob;
      }
    }
  }

  pValue = Math.min(1.0, pValue);

  const rateA = totalA > 0 ? a / totalA : 0;
  const rateB = totalB > 0 ? c / totalB : 0;
  const relativeReduction = rateA > 0 ? ((rateA - rateB) / rateA) * 100 : 0;

  // Criterio del proyecto UNER:
  // Reducción >= 50% y estadísticamente significativo (p < 0.05)
  const isSignificant = pValue < alpha;
  const hypothesisSupported = isSignificant && relativeReduction >= 50;

  return {
    a,
    b,
    c,
    d,
    pValue,
    isSignificant,
    relativeReduction: Math.max(0, relativeReduction),
    hypothesisSupported,
  };
}

/**
 * Incomplete Beta function continued fraction approximation
 */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 100;
  const EPS = 3.0e-7;
  const FPMIN = 1.0e-30;

  const qab = a + b;
  const qap = a + 1.0;
  const qam = a - 1.0;
  let c = 1.0;
  let d = 1.0 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1.0 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1.0) < EPS) break;
  }
  return h;
}

function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0.0) return 0.0;
  if (x >= 1.0) return 1.0;

  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1.0 - x)
  );

  if (x < (a + 1.0) / (a + b + 2.0)) {
    return (bt * betacf(a, b, x)) / a;
  } else {
    return 1.0 - (bt * betacf(b, a, 1.0 - x)) / b;
  }
}

/**
 * Inverse regularized incomplete Beta function (quantile function) via binary search
 */
function invRegularizedBeta(p: number, a: number, b: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  let low = 0.0;
  let high = 1.0;
  let mid = 0.5;

  for (let i = 0; i < 40; i++) {
    mid = (low + high) / 2;
    const val = regularizedIncompleteBeta(mid, a, b);
    if (val < p) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return mid;
}

/**
 * Clopper-Pearson 95% Confidence Interval for binomial proportion
 * For k=0, n=50: upper limit = 1 - (alpha/2)^(1/n) = 1 - 0.025^(1/50) = 0.0711 (7.1%)
 */
export function calculateClopperPearson(k: number, n: number, confidence = 0.95): ClopperPearsonCI {
  if (n <= 0) {
    return { k: 0, n: 0, proportion: 0, lower: 0, upper: 0, percentStr: '0.0% [0.0%, 0.0%]' };
  }

  const alpha = 1 - confidence;
  let lower = 0;
  let upper = 1;

  if (k === 0) {
    lower = 0;
    upper = 1 - Math.pow(alpha / 2, 1 / n); // exact rule for zero successes
  } else if (k === n) {
    lower = Math.pow(alpha / 2, 1 / n);
    upper = 1;
  } else {
    lower = invRegularizedBeta(alpha / 2, k, n - k + 1);
    upper = invRegularizedBeta(1 - alpha / 2, k + 1, n - k);
  }

  const proportion = k / n;
  const pPct = (proportion * 100).toFixed(1);
  const lPct = (lower * 100).toFixed(1);
  const uPct = (upper * 100).toFixed(1);

  return {
    k,
    n,
    proportion,
    lower,
    upper,
    percentStr: `${pPct}% [${lPct}%, ${uPct}%]`,
  };
}

/**
 * Mann-Whitney U test for two independent samples of latencies.
 * Returns Medians, IQR, U, Z-score, and approximate p-value.
 */
export function calculateMannWhitney(latenciesA: number[], latenciesB: number[]): MannWhitneyResult {
  const getQuantiles = (arr: number[]) => {
    if (arr.length === 0) return { median: 0, q1: 0, q3: 0, iqr: 0 };
    const sorted = [...arr].sort((x, y) => x - y);
    const n = sorted.length;
    const q1 = sorted[Math.floor(n * 0.25)];
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const q3 = sorted[Math.floor(n * 0.75)];
    return { median, q1, q3, iqr: q3 - q1 };
  };

  const statsA = getQuantiles(latenciesA);
  const statsB = getQuantiles(latenciesB);

  const n1 = latenciesA.length;
  const n2 = latenciesB.length;

  if (n1 === 0 || n2 === 0) {
    return {
      medianA: statsA.median,
      iqrA: statsA.iqr,
      q1A: statsA.q1,
      q3A: statsA.q3,
      medianB: statsB.median,
      iqrB: statsB.iqr,
      q1B: statsB.q1,
      q3B: statsB.q3,
      uStatistic: 0,
      zScore: 0,
      pValue: 1.0,
      countA: n1,
      countB: n2,
    };
  }

  // Combine and rank
  interface RankedItem {
    val: number;
    group: 'A' | 'B';
    rank?: number;
  }

  const combined: RankedItem[] = [
    ...latenciesA.map((v) => ({ val: v, group: 'A' as const })),
    ...latenciesB.map((v) => ({ val: v, group: 'B' as const })),
  ].sort((x, y) => x.val - y.val);

  // Assign average ranks for ties
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length - 1 && combined[j + 1].val === combined[i].val) {
      j++;
    }
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) {
      combined[k].rank = avgRank;
    }
    i = j + 1;
  }

  const rankSumA = combined
    .filter((item) => item.group === 'A')
    .reduce((acc, curr) => acc + (curr.rank ?? 0), 0);

  const u1 = rankSumA - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const uStat = Math.min(u1, u2);

  // Normal approximation for p-value (standard when n1, n2 >= 10)
  const meanU = (n1 * n2) / 2;
  const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const zScore = stdU > 0 ? (uStat - meanU) / stdU : 0;

  // Standard normal CDF approximation
  const normalCdf = (z: number) => {
    return 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp((-2 * z * z) / Math.PI)));
  };

  const pValue = Math.min(1.0, 2 * normalCdf(-Math.abs(zScore)));

  return {
    medianA: statsA.median,
    iqrA: statsA.iqr,
    q1A: statsA.q1,
    q3A: statsA.q3,
    medianB: statsB.median,
    iqrB: statsB.iqr,
    q1B: statsB.q1,
    q3B: statsB.q3,
    uStatistic: Math.round(uStat),
    zScore: parseFloat(zScore.toFixed(3)),
    pValue: parseFloat(pValue.toFixed(4)),
    countA: n1,
    countB: n2,
  };
}

/**
 * Builds the complete statistical report from raw telemetry records
 */
export function generateStatisticsReport(records: TelemetriaRecord[]): StatisticsReport {
  const v1Records = records.filter((r) => r.vector === 1);
  const v2Records = records.filter((r) => r.vector === 2);

  const v1A = v1Records.filter((r) => r.escenario === 'A');
  const v1B = v1Records.filter((r) => r.escenario === 'B');
  const v2A = v2Records.filter((r) => r.escenario === 'A');
  const v2B = v2Records.filter((r) => r.escenario === 'B');

  const v1ExitosA = v1A.filter((r) => r.resultado_ataque === 'EXITO').length;
  const v1FallosA = v1A.length - v1ExitosA;
  const v1ExitosB = v1B.filter((r) => r.resultado_ataque === 'EXITO').length;
  const v1FallosB = v1B.length - v1ExitosB;

  const v2ExitosA = v2A.filter((r) => r.resultado_ataque === 'EXITO').length;
  const v2FallosA = v2A.length - v2ExitosA;
  const v2ExitosB = v2B.filter((r) => r.resultado_ataque === 'EXITO').length;
  const v2FallosB = v2B.length - v2ExitosB;

  const fisherV1 = calculateFisherExact(v1ExitosA, v1FallosA, v1ExitosB, v1FallosB);
  const fisherV2 = calculateFisherExact(v2ExitosA, v2FallosA, v2ExitosB, v2FallosB);

  const ciV1A = calculateClopperPearson(v1ExitosA, v1A.length);
  const ciV1B = calculateClopperPearson(v1ExitosB, v1B.length);
  const ciV2A = calculateClopperPearson(v2ExitosA, v2A.length);
  const ciV2B = calculateClopperPearson(v2ExitosB, v2B.length);

  // Group by variant for Vector 1
  const v1VariantsMap = new Map<string, { totalA: number; exitosA: number; totalB: number; exitosB: number }>();
  for (const r of v1Records) {
    if (!v1VariantsMap.has(r.variante)) {
      v1VariantsMap.set(r.variante, { totalA: 0, exitosA: 0, totalB: 0, exitosB: 0 });
    }
    const entry = v1VariantsMap.get(r.variante)!;
    if (r.escenario === 'A') {
      entry.totalA++;
      if (r.resultado_ataque === 'EXITO') entry.exitosA++;
    } else {
      entry.totalB++;
      if (r.resultado_ataque === 'EXITO') entry.exitosB++;
    }
  }

  const v1Variants: VariantSummary[] = Array.from(v1VariantsMap.entries()).map(([variante, data]) => ({
    variante,
    totalA: data.totalA,
    exitosA: data.exitosA,
    tasaA: data.totalA > 0 ? (data.exitosA / data.totalA) * 100 : 0,
    totalB: data.totalB,
    exitosB: data.exitosB,
    tasaB: data.totalB > 0 ? (data.exitosB / data.totalB) * 100 : 0,
  }));

  // Group by variant for Vector 2
  const v2VariantsMap = new Map<string, { totalA: number; exitosA: number; totalB: number; exitosB: number }>();
  for (const r of v2Records) {
    if (!v2VariantsMap.has(r.variante)) {
      v2VariantsMap.set(r.variante, { totalA: 0, exitosA: 0, totalB: 0, exitosB: 0 });
    }
    const entry = v2VariantsMap.get(r.variante)!;
    if (r.escenario === 'A') {
      entry.totalA++;
      if (r.resultado_ataque === 'EXITO') entry.exitosA++;
    } else {
      entry.totalB++;
      if (r.resultado_ataque === 'EXITO') entry.exitosB++;
    }
  }

  const v2Variants: VariantSummary[] = Array.from(v2VariantsMap.entries()).map(([variante, data]) => ({
    variante,
    totalA: data.totalA,
    exitosA: data.exitosA,
    tasaA: data.totalA > 0 ? (data.exitosA / data.totalA) * 100 : 0,
    totalB: data.totalB,
    exitosB: data.exitosB,
    tasaB: data.totalB > 0 ? (data.exitosB / data.totalB) * 100 : 0,
  }));

  // Latencies measured during legitimate authentication in vector 2
  const latenciesA = v2A.map((r) => r.latencia_ms);
  const latenciesB = v2B.map((r) => r.latencia_ms);
  const latencyAnalysis = calculateMannWhitney(latenciesA, latenciesB);

  // Formal hypothesis evaluation per section 3.3
  const totalRuns = records.length;
  let h1Status: 'EVIDENCIA_A_FAVOR' | 'EVIDENCIA_EN_CONTRA_O_PARCIAL' | 'DATOS_INSUFICIENTES' = 'DATOS_INSUFICIENTES';
  let summary = 'Aún no se cuenta con datos suficientes (se requieren iteraciones en ambos vectores y escenarios).';

  if (v1A.length > 0 && v1B.length > 0 && v2A.length > 0 && v2B.length > 0) {
    if (fisherV1.hypothesisSupported && fisherV2.hypothesisSupported) {
      h1Status = 'EVIDENCIA_A_FAVOR';
      summary = `Se evidencia soporte empírico para H1: en ambos vectores la tasa de éxito de FIDO2 (Escenario B) es al menos 50% menor que Contraseña Tradicional (Escenario A) y la diferencia es estadísticamente significativa (Fisher p < 0.05).`;
    } else {
      h1Status = 'EVIDENCIA_EN_CONTRA_O_PARCIAL';
      summary = `Evidencia parcial o no concluyente: no se cumplió el umbral estricto (reducción >= 50% con significación p < 0.05) en todos los vectores evaluados.`;
    }
  }

  return {
    totalRuns,
    runsByScenario: {
      A: records.filter((r) => r.escenario === 'A').length,
      B: records.filter((r) => r.escenario === 'B').length,
    },
    vector1: {
      fisher: fisherV1,
      ciA: ciV1A,
      ciB: ciV1B,
      variants: v1Variants,
    },
    vector2: {
      fisher: fisherV2,
      ciA: ciV2A,
      ciB: ciV2B,
      variants: v2Variants,
    },
    latency: latencyAnalysis,
    hypothesisEvaluation: {
      h1Status,
      summary,
    },
  };
}
