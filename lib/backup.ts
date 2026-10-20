import { budgetSchema, type Budget } from './budget';

export async function digest(data: Budget) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(budgetSchema.parse(data))));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
export async function makeBackup(data: Budget) {
  return { format: 'budget-os-backup', version: 2, exportedAt: new Date().toISOString(), sha256: await digest(data), data };
}
// A checksum detects accidental corruption, not malicious editing or authenticity.
export async function parseBackup(text: string): Promise<Budget> {
  const value = JSON.parse(text);
  if (value?.format === 'budget-os-backup') {
    if (value.version !== 2 || typeof value.sha256 !== 'string') throw Error('Okänd säkerhetskopieversion.');
    const data = budgetSchema.parse(value.data);
    if (await digest(data) !== value.sha256) throw Error('Säkerhetskopians kontrollsumma stämmer inte. Filen kan vara skadad.');
    return data;
  }
  return budgetSchema.parse(value); // Version 1 exports remain supported.
}
