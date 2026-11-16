import { methodDefinition } from './gateway/registry';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** "MA" -> "Morocco". Unknown codes come back as they were. */
export function countryName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** A rail key as merchants know it: "op_cashapp" -> "Cash App (OnRamPay)". */
export function methodName(key: string): string {
  if (key.startsWith('manual_')) return `Manual method ${key.slice(7)}`;
  return (
    methodDefinition(key)?.defaultLabel ??
    key
      .replace(/^op_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
