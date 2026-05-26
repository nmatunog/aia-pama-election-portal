import { ZONES, type Zone } from './constants';

/** Default dev/test roster shape — ELECOM may import via admin API. */
export function buildDefaultDevRoster(perZone = 15): Array<{
  licenseCode: string;
  fullName: string;
  zone: Zone;
  goodStanding: boolean;
  active: boolean;
}> {
  const PINNED = [{ licenseCode: '007264013', fullName: 'Nilo Matunog', zone: 'Visayas' as Zone }];
  const FIRST = [
    'Maria', 'Juan', 'Ana', 'Jose', 'Rosa', 'Pedro', 'Carmen', 'Antonio',
  ];
  const LAST = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Torres', 'Flores'];
  const byLicense = new Map<string, (typeof PINNED)[0] & { goodStanding: boolean; active: boolean }>();

  for (const m of PINNED) {
    byLicense.set(m.licenseCode, { ...m, goodStanding: true, active: true });
  }

  let seq = 7264001;
  for (const zone of ZONES) {
    for (let i = 0; i < perZone; i++) {
      const licenseCode = String(seq++).padStart(9, '0');
      if (byLicense.has(licenseCode)) continue;
      const fullName = `${FIRST[i % FIRST.length]} ${LAST[(seq + i) % LAST.length]}`;
      byLicense.set(licenseCode, {
        licenseCode,
        fullName,
        zone,
        goodStanding: true,
        active: true,
      });
    }
  }

  return [...byLicense.values()].sort((a, b) => a.licenseCode.localeCompare(b.licenseCode));
}
