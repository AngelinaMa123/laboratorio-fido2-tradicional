import { PhishingVariant, ReplayVariant } from './types';

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
  inmediato: { label: 'Inmediata (0 ms)', delayMs: 0, delayStr: '0 ms' },
  delay_100ms: { label: 'Demora 100 ms', delayMs: 100, delayStr: '100 ms' },
  delay_250ms: { label: 'Demora 250 ms', delayMs: 250, delayStr: '250 ms' },
  delay_500ms: { label: 'Demora 500 ms', delayMs: 500, delayStr: '500 ms' },
  delay_1000ms: { label: 'Demora 1000 ms (1 s)', delayMs: 1000, delayStr: '1000 ms' },
  // Mapeos legacy para compatibilidad
  delay_10s: { label: 'Demora 10 segundos', delayMs: 10000, delayStr: '10 s' },
  delay_1m: { label: 'Demora 1 minuto', delayMs: 60000, delayStr: '1 m' },
  delay_5m: { label: 'Demora 5 minutos', delayMs: 300000, delayStr: '5 m' },
  delay_30m: { label: 'Demora 30 minutos', delayMs: 1800000, delayStr: '30 m' },
};

