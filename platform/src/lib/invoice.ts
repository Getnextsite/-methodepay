/**
 * Seller details printed on invoices and receipts, from
 * NotificationSettings.invoice. Everything is optional: blank fields fall back
 * to the store name and support email.
 */
export type InvoiceSettings = {
  businessName: string;
  address: string;
  taxId: string;
  footer: string;
};

export function parseInvoice(raw: unknown): InvoiceSettings {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  return {
    businessName: s(o.businessName, 150),
    address: s(o.address, 500),
    taxId: s(o.taxId, 80),
    footer: s(o.footer, 500),
  };
}
