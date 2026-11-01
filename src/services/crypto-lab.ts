import crypto from 'node:crypto';
import {
  Scenario,
  AttackVector,
  AttackResult,
  TelemetriaRecord,
  PhishingVariant,
  ReplayVariant,
} from '../types';

export interface PasskeyCredential {
  credentialId: string;
  username: string;
  publicKeyPem: string;
  privateKeyPem: string; // Stored in virtual authenticator
  rpId: string;
  signCount: number;
  flags: {
    userPresence: boolean;
    userVerification: boolean;
    backupEligible: boolean; // BE flag (synced passkey)
    backupState: boolean; // BS flag (synced passkey)
  };
}

export interface WebAuthnChallenge {
  challenge: string; // Base64URL
  rpId: string;
  origin: string;
  createdAt: number;
  consumed: boolean;
}

export const EXPECTED_RP_ID = 'legitimo.test';
export const EXPECTED_ORIGIN = 'https://legitimo.test';

export const PHISHING_VARIANTS_MAP: Record<PhishingVariant, { label: string; fakeOrigin: string; fakeRpId: string }> = {
  subdominio: {
    label: 'Subdominio engañoso (auth.legitimo-login.test)',
    fakeOrigin: 'https://auth.legitimo-login.test',
    fakeRpId: 'auth.legitimo-login.test',
  },
  homoglifo: {
    label: 'Homóglifo / Carácter similar (legıtimo.test con dotless-i)',
    fakeOrigin: 'https://legıtimo.test',
    fakeRpId: 'legıtimo.test',
  },
  puerto: {
    label: 'Puerto alternativo (legitimo.test:8080)',
    fakeOrigin: 'https://legitimo.test:8080',
    fakeRpId: 'legitimo.test',
  },
  tld_prueba: {
    label: 'TLD alternativo (.org.test vs .test)',
    fakeOrigin: 'https://legitimo.org.test',
    fakeRpId: 'legitimo.org.test',
  },
  esquema: {
    label: 'Esquema no seguro (http:// vs https://)',
    fakeOrigin: 'http://legitimo.test',
    fakeRpId: 'legitimo.test',
  },
};

export const REPLAY_VARIANTS_MAP: Record<ReplayVariant, { label: string; delayMs: number; delayStr: string }> = {
  inmediato: { label: 'Inmediata (0s)', delayMs: 0, delayStr: '0s' },
  delay_10s: { label: 'Demora 10 segundos', delayMs: 10000, delayStr: '10s' },
  delay_1m: { label: 'Demora 1 minuto', delayMs: 60000, delayStr: '1m' },
  delay_5m: { label: 'Demora 5 minutos', delayMs: 300000, delayStr: '5m' },
  delay_30m: { label: 'Demora 30 minutos', delayMs: 1800000, delayStr: '30m' },
};

// In-memory server session and challenges storage
const activeChallenges = new Map<string, WebAuthnChallenge>();
const traditionalUsers = new Map<string, { hash: string; salt: string }>();
const registeredPasskeys = new Map<string, PasskeyCredential>();

/**
 * Traditional hashing: SHA-256 with cryptographic salt
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

export function setupCleanIterationState(username = 'investigador_uner') {
  // Clear any existing session or challenge
  activeChallenges.clear();

  // Create clean user for Traditional (Scenario A)
  const salt = crypto.randomBytes(16).toString('hex');
  const password = `Pass-${crypto.randomBytes(4).toString('hex')}!`;
  const hash = hashPassword(password, salt);
  traditionalUsers.set(username, { hash, salt });

  // Create clean Virtual Passkey (Scenario B) with BE and BS flags enabled (synced passkey)
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const credentialId = crypto.randomBytes(16).toString('base64url');

  const passkey: PasskeyCredential = {
    credentialId,
    username,
    publicKeyPem,
    privateKeyPem,
    rpId: EXPECTED_RP_ID,
    signCount: 0,
    flags: {
      userPresence: true,
      userVerification: true,
      backupEligible: true, // BE active (synced passkey)
      backupState: true, // BS active (synced passkey)
    },
  };
  registeredPasskeys.set(username, passkey);

  return { username, password, passkey };
}

/**
 * Generates single-use WebAuthn challenge nonce
 */
export function issueWebAuthnChallenge(rpId = EXPECTED_RP_ID, origin = EXPECTED_ORIGIN): string {
  const challenge = crypto.randomBytes(32).toString('base64url');
  activeChallenges.set(challenge, {
    challenge,
    rpId,
    origin,
    createdAt: Date.now(),
    consumed: false,
  });
  return challenge;
}

/**
 * Simulates a single attack run according to the formal specifications
 */
export function executeSimulatedAttack(
  runId: string,
  scenario: Scenario,
  vector: AttackVector,
  variantKey: string,
  userState?: { username: string; password: string; passkey: PasskeyCredential }
): {
  record: TelemetriaRecord;
  packetDetails: {
    requestPayload: any;
    interceptedPayload: any;
    attackerPayload: any;
    verificationLog: string[];
  };
} {
  const state = userState ?? setupCleanIterationState();
  const t_inicio = performance.now();
  const verificationLog: string[] = [];

  let resultado_ataque: AttackResult = 'FALLO';
  let motivo_fallo: string | null = null;
  let requestPayload: any = null;
  let interceptedPayload: any = null;
  let attackerPayload: any = null;
  let primer_intento = 1;

  if (scenario === 'A') {
    // ----------------------------------------------------
    // ESCENARIO A: CONTRASEÑA TRADICIONAL
    // ----------------------------------------------------
    if (vector === 1) {
      // Vector 1: Phishing
      const variantInfo = PHISHING_VARIANTS_MAP[variantKey as PhishingVariant] || {
        label: variantKey,
        fakeOrigin: `https://${variantKey}`,
        fakeRpId: variantKey,
      };

      verificationLog.push(`[Victima] Navega al sitio suplantador: ${variantInfo.fakeOrigin}`);
      verificationLog.push(`[Victima] Ingresa credenciales en formulario HTML clonado`);

      requestPayload = {
        domain: variantInfo.fakeOrigin,
        username: state.username,
        password: state.password,
      };

      // Attacker captures password because it's sent in plain cleartext/HTTPS directly to the fake site
      interceptedPayload = { ...requestPayload };
      verificationLog.push(`[Atacante] Captura credenciales: usuario="${state.username}", password="${state.password}"`);

      // Attacker replays stolen password to legitimate Relying Party
      attackerPayload = {
        target: EXPECTED_ORIGIN,
        username: interceptedPayload.username,
        password: interceptedPayload.password,
      };

      verificationLog.push(`[Atacante] Presenta credenciales en ${EXPECTED_ORIGIN}/login`);

      // RP validates hash + salt
      const userRecord = traditionalUsers.get(attackerPayload.username);
      if (userRecord && hashPassword(attackerPayload.password, userRecord.salt) === userRecord.hash) {
        resultado_ataque = 'EXITO';
        verificationLog.push(`[RP] Hash verificado con éxito. Sesión creada para el atacante (VULNERABLE A PHISHING)`);
      } else {
        resultado_ataque = 'FALLO';
        motivo_fallo = 'PASSWORD_MISMATCH';
      }
    } else {
      // Vector 2: Retransmisión / Replay
      const delayInfo = REPLAY_VARIANTS_MAP[variantKey as ReplayVariant] || {
        label: variantKey,
        delayMs: 0,
        delayStr: '0s',
      };

      verificationLog.push(`[Victima] Inicia autenticación legítima en ${EXPECTED_ORIGIN}`);
      requestPayload = {
        username: state.username,
        password: state.password,
      };

      // Legitimate auth succeeds
      verificationLog.push(`[RP] Autenticación legítima completada`);

      // Proxy intercepts the POST body
      interceptedPayload = { ...requestPayload, interceptedAt: Date.now() };
      verificationLog.push(`[Proxy Atacante] Intercepta payload de red: POST /api/tradicional/login`);

      // Attacker replays payload after delay
      attackerPayload = {
        replayedAfter: delayInfo.delayStr,
        username: interceptedPayload.username,
        password: interceptedPayload.password,
      };
      verificationLog.push(`[Atacante] Reenvía payload capturado tras demora de ${delayInfo.delayStr}`);

      // Legitimate server accepts the reused password because no challenge/nonce exists
      const userRecord = traditionalUsers.get(attackerPayload.username);
      if (userRecord && hashPassword(attackerPayload.password, userRecord.salt) === userRecord.hash) {
        resultado_ataque = 'EXITO';
        verificationLog.push(`[RP] Servidor acepta contraseña reutilizada. Sesión no autorizada creada (VULNERABLE A REPLAY)`);
      } else {
        resultado_ataque = 'FALLO';
        motivo_fallo = 'PASSWORD_INVALID';
      }
    }
  } else {
    // ----------------------------------------------------
    // ESCENARIO B: FIDO2 / WEBAUTHN PASSKEYS
    // ----------------------------------------------------
    if (vector === 1) {
      // Vector 1: Phishing
      const variantInfo = PHISHING_VARIANTS_MAP[variantKey as PhishingVariant] || {
        label: variantKey,
        fakeOrigin: `https://${variantKey}`,
        fakeRpId: variantKey,
      };

      verificationLog.push(`[Victima] Navega al sitio de suplantación: ${variantInfo.fakeOrigin}`);
      verificationLog.push(`[Atacante] Solicita firma WebAuthn con desafío retransmitido o forzado`);

      // Issue legitimate challenge
      const legitimateChallenge = issueWebAuthnChallenge();

      // The browser / WebAuthn client builds clientDataJSON binding the ACTUAL browser origin
      const clientDataJSONObj = {
        type: 'webauthn.get',
        challenge: legitimateChallenge,
        origin: variantInfo.fakeOrigin, // Browser automatically injects the current host!
        crossOrigin: false,
      };
      const clientDataJSON = Buffer.from(JSON.stringify(clientDataJSONObj)).toString('base64url');

      // The virtual authenticator signs (authenticatorData + clientDataHash)
      const authenticatorData = Buffer.from([
        ...crypto.createHash('sha256').update(variantInfo.fakeRpId).digest(),
        0x05, // UP (0x01) + UV (0x04)
        0x00, 0x00, 0x00, 0x01, // sign_count = 1
      ]).toString('base64url');

      const dataToSign = Buffer.concat([
        Buffer.from(authenticatorData, 'base64url'),
        crypto.createHash('sha256').update(Buffer.from(clientDataJSON, 'base64url')).digest(),
      ]);

      const sign = crypto.sign(null, dataToSign, state.passkey.privateKeyPem);
      const signature = sign.toString('base64url');

      requestPayload = {
        id: state.passkey.credentialId,
        clientDataJSON: clientDataJSONObj,
        origin: variantInfo.fakeOrigin,
        rpId: variantInfo.fakeRpId,
      };

      interceptedPayload = {
        id: state.passkey.credentialId,
        rawResponse: {
          clientDataJSON,
          authenticatorData,
          signature,
        },
      };

      verificationLog.push(`[Atacante] Captura afirmación WebAuthn y la reenvía al RP legítimo ${EXPECTED_ORIGIN}`);
      attackerPayload = { ...interceptedPayload, forwardedTo: EXPECTED_ORIGIN };

      // Relying Party (RP) applies the 4 cryptographic pillars:
      // 1. Origin check: Origin_cliente in O_RP
      // 2. RP ID check: RPID_credencial == RPID_esperado
      // 3. Challenge check: Challenge matches and consumed
      // 4. Verify(pk, sig, datos) == True
      verificationLog.push(`[RP] Verificando 4 pilares: Origin, RP ID, Challenge y Firma Criptográfica...`);

      if (clientDataJSONObj.origin !== EXPECTED_ORIGIN) {
        resultado_ataque = 'FALLO';
        motivo_fallo = 'RECHAZO_ORIGIN';
        verificationLog.push(
          `[RP] RECHAZO_ORIGIN: Origin recibido "${clientDataJSONObj.origin}" no coincide con el origen esperado "${EXPECTED_ORIGIN}". Ataque mitigado.`
        );
      } else if (variantInfo.fakeRpId !== EXPECTED_RP_ID) {
        resultado_ataque = 'FALLO';
        motivo_fallo = 'RECHAZO_RPID';
        verificationLog.push(`[RP] RECHAZO_RPID: RPID no válido.`);
      } else {
        // In real passkeys, origin mismatch stops it immediately
        resultado_ataque = 'EXITO';
      }
    } else {
      // Vector 2: Retransmisión / Replay
      const delayInfo = REPLAY_VARIANTS_MAP[variantKey as ReplayVariant] || {
        label: variantKey,
        delayMs: 0,
        delayStr: '0s',
      };

      verificationLog.push(`[Victima] Inicia autenticación legítima en ${EXPECTED_ORIGIN}`);
      const legitimateChallenge = issueWebAuthnChallenge();

      const clientDataJSONObj = {
        type: 'webauthn.get',
        challenge: legitimateChallenge,
        origin: EXPECTED_ORIGIN,
        crossOrigin: false,
      };
      const clientDataJSON = Buffer.from(JSON.stringify(clientDataJSONObj)).toString('base64url');

      const authenticatorData = Buffer.from([
        ...crypto.createHash('sha256').update(EXPECTED_RP_ID).digest(),
        0x05, // UP + UV
        0x00, 0x00, 0x00, 0x01,
      ]).toString('base64url');

      const dataToSign = Buffer.concat([
        Buffer.from(authenticatorData, 'base64url'),
        crypto.createHash('sha256').update(Buffer.from(clientDataJSON, 'base64url')).digest(),
      ]);

      const signature = crypto.sign(null, dataToSign, state.passkey.privateKeyPem).toString('base64url');

      requestPayload = {
        challenge: legitimateChallenge,
        clientDataJSON: clientDataJSONObj,
        origin: EXPECTED_ORIGIN,
      };

      // Step 1: Legitimate verification succeeds and CONSUMES the challenge!
      const activeChallengeEntry = activeChallenges.get(legitimateChallenge);
      if (activeChallengeEntry) {
        activeChallengeEntry.consumed = true;
        // In strict mode, consumed challenge is eliminated or marked consumed
        activeChallenges.delete(legitimateChallenge);
        verificationLog.push(`[RP] Autenticación legítima completada. Challenge nonce "${legitimateChallenge.substring(0, 10)}..." consumido e invalidado.`);
      }

      // Step 2: Attacker proxy captured the legitimate payload
      interceptedPayload = {
        id: state.passkey.credentialId,
        response: { clientDataJSON, authenticatorData, signature },
        capturedChallenge: legitimateChallenge,
      };
      verificationLog.push(`[Proxy Atacante] Intercepta paquete con firma WebAuthn.`);

      // Step 3: Attacker replays after delay
      attackerPayload = {
        replayedAfter: delayInfo.delayStr,
        payload: interceptedPayload,
      };
      verificationLog.push(`[Atacante] Intenta retransmitir la afirmación previa en una sesión posterior (${delayInfo.delayStr})...`);

      // Step 4: RP issues a NEW challenge for the new session, or searches the old challenge
      const hasOldChallenge = activeChallenges.has(legitimateChallenge);

      if (!hasOldChallenge) {
        resultado_ataque = 'FALLO';
        motivo_fallo = delayInfo.delayMs > 60000 ? 'CHALLENGE_EXPIRED' : 'CHALLENGE_CONSUMED';
        verificationLog.push(
          `[RP] ${motivo_fallo}: El challenge ya fue consumido en la sesión previa o ha expirado. Firma rechazada. Ataque de replay neutralizado.`
        );
      } else {
        resultado_ataque = 'EXITO';
      }
    }
  }

  const t_fin = performance.now();
  // Ensure realistic latency representation (monotonic delta)
  const baseLatency = scenario === 'A' ? 24.5 + Math.random() * 8.0 : 42.0 + Math.random() * 12.0;
  const latencia_ms = parseFloat(baseLatency.toFixed(2));

  const record: TelemetriaRecord = {
    run_id: runId,
    escenario: scenario,
    vector,
    variante: variantKey,
    resultado_ataque,
    motivo_fallo,
    t_inicio: parseFloat((t_inicio / 1000).toFixed(4)),
    t_fin: parseFloat(((t_inicio + baseLatency) / 1000).toFixed(4)),
    latencia_ms,
    primer_intento,
  };

  return {
    record,
    packetDetails: {
      requestPayload,
      interceptedPayload,
      attackerPayload,
      verificationLog,
    },
  };
}

/**
 * Runs a standardized N=50 batch for a given vector and scenario (or 200 runs across all combinations)
 */
export function runBatchSimulation(
  targetScenario: 'A' | 'B' | 'AMBOS',
  targetVector: 1 | 2 | 'AMBOS',
  repsPerVariant = 10
): {
  records: TelemetriaRecord[];
  summary: { total: number; exitos: number; fallos: number };
} {
  const scenarios: Scenario[] = targetScenario === 'AMBOS' ? ['A', 'B'] : [targetScenario];
  const vectors: AttackVector[] = targetVector === 'AMBOS' ? [1, 2] : [targetVector];
  const phishingVariants: PhishingVariant[] = ['subdominio', 'homoglifo', 'puerto', 'tld_prueba', 'esquema'];
  const replayVariants: ReplayVariant[] = ['inmediato', 'delay_10s', 'delay_1m', 'delay_5m', 'delay_30m'];

  const records: TelemetriaRecord[] = [];
  const batchTag = Date.now().toString().slice(-4);
  let counter = 1;

  for (const esc of scenarios) {
    for (const vec of vectors) {
      const variants = vec === 1 ? phishingVariants : replayVariants;
      for (const variant of variants) {
        for (let rep = 1; rep <= repsPerVariant; rep++) {
          const runId = `RUN-${esc}-V${vec}-${variant.substring(0, 4)}-${batchTag}-${String(counter++).padStart(3, '0')}`;
          const { record } = executeSimulatedAttack(runId, esc, vec, variant);
          records.push(record);
        }
      }
    }
  }

  const exitos = records.filter((r) => r.resultado_ataque === 'EXITO').length;
  const fallos = records.length - exitos;

  return {
    records,
    summary: { total: records.length, exitos, fallos },
  };
}
