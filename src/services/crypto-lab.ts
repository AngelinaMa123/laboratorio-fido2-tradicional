import crypto from 'node:crypto';
import {
  Scenario,
  AttackVector,
  AttackResult,
  TelemetriaRecord,
  PhishingVariant,
  ReplayVariant,
  CorridaTipo,
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

import {
  EXPECTED_RP_ID,
  EXPECTED_ORIGIN,
  PHISHING_VARIANTS_MAP,
  REPLAY_VARIANTS_MAP,
} from '../constants';

export {
  EXPECTED_RP_ID,
  EXPECTED_ORIGIN,
  PHISHING_VARIANTS_MAP,
  REPLAY_VARIANTS_MAP,
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
 * Executes a simulated attack measuring effective cryptographic latency and real delays
 */
export async function executeSimulatedAttack(
  runId: string,
  scenario: Scenario,
  vector: AttackVector,
  variantKey: string,
  userState?: { username: string; password: string; passkey: PasskeyCredential },
  tipoCorrida: CorridaTipo = 'FORMAL'
): Promise<{
  record: TelemetriaRecord;
  packetDetails: {
    requestPayload: any;
    interceptedPayload: any;
    attackerPayload: any;
    verificationLog: string[];
  };
}> {
  const state = userState ?? setupCleanIterationState();
  const verificationLog: string[] = [];

  let resultado_ataque: AttackResult = 'FALLO';
  let motivo_fallo: string | null = null;
  let requestPayload: any = null;
  let interceptedPayload: any = null;
  let attackerPayload: any = null;

  let t_proc_start = performance.now();
  let t_proc_end = performance.now();
  let latencia_ms = 0;

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

      interceptedPayload = { ...requestPayload };
      verificationLog.push(`[Atacante] Captura credenciales: usuario="${state.username}", password="${state.password}"`);

      attackerPayload = {
        target: EXPECTED_ORIGIN,
        username: interceptedPayload.username,
        password: interceptedPayload.password,
      };
      verificationLog.push(`[Atacante] Presenta credenciales en ${EXPECTED_ORIGIN}/login`);

      // RP validates hash + salt - Medición efectiva con performance.now()
      t_proc_start = performance.now();
      const userRecord = traditionalUsers.get(attackerPayload.username);
      const isPasswordValid = userRecord && hashPassword(attackerPayload.password, userRecord.salt) === userRecord.hash;
      t_proc_end = performance.now();
      latencia_ms = parseFloat(Math.max(0.001, t_proc_end - t_proc_start).toFixed(4));

      if (isPasswordValid) {
        resultado_ataque = 'EXITO';
        verificationLog.push(`[RP] Hash SHA-256 verificado en ${latencia_ms} ms. Sesión autorizada creada para el atacante (VULNERABLE A PHISHING).`);
      } else {
        resultado_ataque = 'FALLO';
        motivo_fallo = 'PASSWORD_MISMATCH';
        verificationLog.push(`[RP] Contraseña incorrecta.`);
      }
    } else {
      // Vector 2: Retransmisión / Replay
      const delayInfo = REPLAY_VARIANTS_MAP[variantKey as ReplayVariant] || {
        label: variantKey,
        delayMs: 0,
        delayStr: '0 ms',
      };

      verificationLog.push(`[Victima] Inicia autenticación legítima en ${EXPECTED_ORIGIN}`);
      requestPayload = {
        username: state.username,
        password: state.password,
      };

      interceptedPayload = { ...requestPayload, interceptedAt: Date.now() };
      verificationLog.push(`[Proxy Atacante] Intercepta payload de red: POST /api/tradicional/login`);

      // Demora real efectivamente ejecutada
      if (delayInfo.delayMs > 0) {
        verificationLog.push(`[Proxy Atacante] Reteniendo paquete durante ${delayInfo.delayStr} (espera física real)...`);
        await new Promise((resolve) => setTimeout(resolve, delayInfo.delayMs));
        verificationLog.push(`[Proxy Atacante] Espera efectiva de ${delayInfo.delayStr} completada.`);
      }

      attackerPayload = {
        replayedAfter: delayInfo.delayStr,
        username: interceptedPayload.username,
        password: interceptedPayload.password,
      };
      verificationLog.push(`[Atacante] Reenvía payload capturado al servidor legítimo`);

      // RP validates reused credentials - Medición efectiva con performance.now()
      t_proc_start = performance.now();
      const userRecord = traditionalUsers.get(attackerPayload.username);
      const isPasswordValid = userRecord && hashPassword(attackerPayload.password, userRecord.salt) === userRecord.hash;
      t_proc_end = performance.now();
      latencia_ms = parseFloat(Math.max(0.001, t_proc_end - t_proc_start).toFixed(4));

      if (isPasswordValid) {
        resultado_ataque = 'EXITO';
        verificationLog.push(`[RP] Servidor acepta contraseña reutilizada en ${latencia_ms} ms. No existe nonce de un solo uso (VULNERABLE A REPLAY).`);
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
      verificationLog.push(`[Atacante] Inicia desafío WebAuthn hacia la víctima`);

      // Challenge emitido por RP
      const legitimateChallenge = issueWebAuthnChallenge();

      // Cliente / Navegador WebAuthn genera clientDataJSON vinculando criptográficamente el origen real
      const clientDataJSONObj = {
        type: 'webauthn.get',
        challenge: legitimateChallenge,
        origin: variantInfo.fakeOrigin, // El navegador inyecta el host actual
        crossOrigin: false,
      };
      const clientDataJSON = Buffer.from(JSON.stringify(clientDataJSONObj)).toString('base64url');

      // Autenticador virtual genera authenticatorData con SHA-256 del rpId visitado
      const fakeRpIdHash = crypto.createHash('sha256').update(variantInfo.fakeRpId).digest();
      const authenticatorData = Buffer.concat([
        fakeRpIdHash,
        Buffer.from([0x05]), // Flags: UP (0x01) + UV (0x04)
        Buffer.from([0x00, 0x00, 0x00, 0x01]), // sign_count = 1
      ]).toString('base64url');

      // Firma digital generada por el autenticador con clave privada Ed25519
      const clientDataHash = crypto.createHash('sha256').update(Buffer.from(clientDataJSON, 'base64url')).digest();
      const dataToSign = Buffer.concat([
        Buffer.from(authenticatorData, 'base64url'),
        clientDataHash,
      ]);
      const signature = crypto.sign(null, dataToSign, state.passkey.privateKeyPem).toString('base64url');

      requestPayload = {
        id: state.passkey.credentialId,
        clientDataJSON: clientDataJSONObj,
        origin: variantInfo.fakeOrigin,
        rpId: variantInfo.fakeRpId,
      };

      interceptedPayload = {
        id: state.passkey.credentialId,
        rawResponse: { clientDataJSON, authenticatorData, signature },
      };

      verificationLog.push(`[Atacante] Captura afirmación WebAuthn firmada y la reenvía al RP legítimo ${EXPECTED_ORIGIN}`);
      attackerPayload = { ...interceptedPayload, forwardedTo: EXPECTED_ORIGIN };

      // Relying Party (RP): Verificación Criptográfica Real de los 4 Pilares
      verificationLog.push(`[RP] Iniciando verificación criptográfica formal en Relying Party...`);

      t_proc_start = performance.now();

      // 1. Reconstrucción y verificación formal de firma digital (Ed25519 / W3C WebAuthn)
      const serverClientDataHash = crypto.createHash('sha256').update(Buffer.from(clientDataJSON, 'base64url')).digest();
      const serverDataToVerify = Buffer.concat([
        Buffer.from(authenticatorData, 'base64url'),
        serverClientDataHash,
      ]);
      const signatureValid = crypto.verify(
        null,
        serverDataToVerify,
        state.passkey.publicKeyPem,
        Buffer.from(signature, 'base64url')
      );

      // 2. Comprobación de RP ID (primeros 32 bytes de authenticatorData == SHA-256(EXPECTED_RP_ID))
      const expectedRpIdHash = crypto.createHash('sha256').update(EXPECTED_RP_ID).digest();
      const receivedRpIdHash = Buffer.from(authenticatorData, 'base64url').subarray(0, 32);
      const rpIdMatch = expectedRpIdHash.equals(receivedRpIdHash);

      // 3. Comprobación de Origin binding
      const originMatch = clientDataJSONObj.origin === EXPECTED_ORIGIN;

      // 4. Comprobación de Challenge
      const challengeEntry = activeChallenges.get(clientDataJSONObj.challenge);
      const challengeValid = !!challengeEntry && !challengeEntry.consumed;

      t_proc_end = performance.now();
      latencia_ms = parseFloat(Math.max(0.001, t_proc_end - t_proc_start).toFixed(4));

      if (!signatureValid) {
        resultado_ataque = 'FALLO';
        motivo_fallo = 'RECHAZO_FIRMA_INVALIDA';
        verificationLog.push(`[RP] Pilar 4 (Firma Criptográfica): FALLO. La firma no pudo verificarse con la clave pública registrada.`);
      } else {
        verificationLog.push(`[RP] Pilar 4 (Firma Criptográfica): OK. Firma Ed25519 matemáticamente verificada con la clave pública registrada (${latencia_ms} ms).`);
      }

      if (!originMatch) {
        resultado_ataque = 'FALLO';
        motivo_fallo = 'RECHAZO_ORIGIN';
        verificationLog.push(
          `[RP] Pilar 1 (Origin Binding): RECHAZO_ORIGIN. Origin del token "${clientDataJSONObj.origin}" no coincide con el origen esperado "${EXPECTED_ORIGIN}". Phishing neutralizado por el protocolo.`
        );
      } else if (!rpIdMatch) {
        resultado_ataque = 'FALLO';
        motivo_fallo = 'RECHAZO_RPID';
        verificationLog.push(`[RP] Pilar 2 (RP ID Scope): RECHAZO_RPID. Hash de RP ID incompatible.`);
      } else if (!challengeValid) {
        resultado_ataque = 'FALLO';
        motivo_fallo = 'RECHAZO_CHALLENGE';
        verificationLog.push(`[RP] Pilar 3 (Challenge Nonce): RECHAZO_CHALLENGE.`);
      } else {
        resultado_ataque = 'EXITO';
      }
    } else {
      // Vector 2: Retransmisión / Replay
      const delayInfo = REPLAY_VARIANTS_MAP[variantKey as ReplayVariant] || {
        label: variantKey,
        delayMs: 0,
        delayStr: '0 ms',
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

      const legitRpIdHash = crypto.createHash('sha256').update(EXPECTED_RP_ID).digest();
      const authenticatorData = Buffer.concat([
        legitRpIdHash,
        Buffer.from([0x05]), // UP + UV
        Buffer.from([0x00, 0x00, 0x00, 0x01]),
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

      // Paso 1: Autenticación legítima previa completada con éxito y CONSUME el challenge
      const activeChallengeEntry = activeChallenges.get(legitimateChallenge);
      if (activeChallengeEntry) {
        activeChallengeEntry.consumed = true;
        activeChallenges.delete(legitimateChallenge);
        verificationLog.push(`[RP] Autenticación legítima completada. Challenge nonce "${legitimateChallenge.substring(0, 10)}..." consumido e invalidado en el RP.`);
      }

      // Paso 2: Proxy del atacante captura el paquete legítimo
      interceptedPayload = {
        id: state.passkey.credentialId,
        response: { clientDataJSON, authenticatorData, signature },
        capturedChallenge: legitimateChallenge,
      };
      verificationLog.push(`[Proxy Atacante] Intercepta afirmación WebAuthn válida previa.`);

      // Paso 3: Demora de retransmisión físicamente ejecutada
      if (delayInfo.delayMs > 0) {
        verificationLog.push(`[Proxy Atacante] Reteniendo paquete durante ${delayInfo.delayStr} (espera física real)...`);
        await new Promise((resolve) => setTimeout(resolve, delayInfo.delayMs));
        verificationLog.push(`[Proxy Atacante] Demora efectiva de ${delayInfo.delayStr} completada.`);
      }

      attackerPayload = {
        replayedAfter: delayInfo.delayStr,
        payload: interceptedPayload,
      };
      verificationLog.push(`[Atacante] Reenvía la afirmación WebAuthn capturada al RP en una sesión posterior`);

      // Paso 4: RP verifica la afirmación retransmitida con performance.now()
      t_proc_start = performance.now();

      // Comprobación de challenge de 1 solo uso
      const challengeEntry = activeChallenges.get(legitimateChallenge);
      const isChallengeActive = !!challengeEntry && !challengeEntry.consumed;

      // Verificación formal de la firma sobre el paquete retransmitido
      const serverClientDataHash = crypto.createHash('sha256').update(Buffer.from(clientDataJSON, 'base64url')).digest();
      const serverDataToVerify = Buffer.concat([
        Buffer.from(authenticatorData, 'base64url'),
        serverClientDataHash,
      ]);
      const signatureValid = crypto.verify(
        null,
        serverDataToVerify,
        state.passkey.publicKeyPem,
        Buffer.from(signature, 'base64url')
      );

      t_proc_end = performance.now();
      latencia_ms = parseFloat(Math.max(0.001, t_proc_end - t_proc_start).toFixed(4));

      if (signatureValid) {
        verificationLog.push(`[RP] Pilar 4 (Firma Criptográfica): OK. La firma fue válida para los datos originales (${latencia_ms} ms).`);
      }

      if (!isChallengeActive) {
        resultado_ataque = 'FALLO';
        motivo_fallo = delayInfo.delayMs >= 1000 ? 'CHALLENGE_EXPIRED' : 'CHALLENGE_CONSUMED';
        verificationLog.push(
          `[RP] Pilar 3 (Nonce de 1 Solo Uso): ${motivo_fallo}. El desafío ya fue consumido en la sesión legítima anterior. Retransmisión rechazada.`
        );
      } else {
        resultado_ataque = 'EXITO';
      }
    }
  }

  const record: TelemetriaRecord = {
    run_id: runId,
    escenario: scenario,
    vector,
    variante: variantKey,
    resultado_ataque,
    motivo_fallo,
    t_inicio: parseFloat((t_proc_start / 1000).toFixed(4)),
    t_fin: parseFloat((t_proc_end / 1000).toFixed(4)),
    latencia_ms,
    tipo_corrida: tipoCorrida,
    primer_intento: 1,
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
 * Runs a standardized batch simulation with real waits and real cryptographic measurements
 */
export async function runBatchSimulation(
  targetScenario: 'A' | 'B' | 'AMBOS',
  targetVector: 1 | 2 | 'AMBOS',
  repsPerVariant = 10,
  tipoCorrida: CorridaTipo = 'FORMAL'
): Promise<{
  records: TelemetriaRecord[];
  summary: { total: number; exitos: number; fallos: number };
}> {
  const scenarios: Scenario[] = targetScenario === 'AMBOS' ? ['A', 'B'] : [targetScenario];
  const vectors: AttackVector[] = targetVector === 'AMBOS' ? [1, 2] : [targetVector];
  const phishingVariants: PhishingVariant[] = ['subdominio', 'homoglifo', 'puerto', 'tld_prueba', 'esquema'];
  const replayVariants: ReplayVariant[] = ['inmediato', 'delay_100ms', 'delay_250ms', 'delay_500ms', 'delay_1000ms'];

  const records: TelemetriaRecord[] = [];
  const batchTag = Date.now().toString().slice(-4);
  let counter = 1;

  for (const esc of scenarios) {
    for (const vec of vectors) {
      const variants = vec === 1 ? phishingVariants : replayVariants;
      for (const variant of variants) {
        for (let rep = 1; rep <= repsPerVariant; rep++) {
          const runId = `RUN-${esc}-V${vec}-${variant.substring(0, 5)}-${batchTag}-${String(counter++).padStart(3, '0')}`;
          const { record } = await executeSimulatedAttack(runId, esc, vec, variant, undefined, tipoCorrida);
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
