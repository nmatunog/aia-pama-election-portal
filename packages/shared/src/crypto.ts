/** SHA-256 hex hash for AIA License Code (matches PostgreSQL digest(..., 'sha256')) */
export async function hashLicenseCode(licenseCode: string): Promise<string> {
  const normalized = licenseCode.trim();
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
