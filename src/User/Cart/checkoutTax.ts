import type { StoreCartItem } from '../types';

export type GstSettings = {
  gst_enabled: boolean;
  gst_rate: number;
  tax_mode: 'Tax Exclusive' | 'Tax Inclusive';
};

export type CheckoutQuote = {
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
};

function amount(value: number | string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseGstSettings(data: unknown): GstSettings {
  if (!isRecord(data)) {
    throw new Error('The GST settings response was invalid.');
  }

  const settings = isRecord(data.settings) ? data.settings : data;
  const enabledValue = settings.gst_enabled;
  const gstEnabled =
    enabledValue === true ||
    enabledValue === 1 ||
    enabledValue === 'true';
  const gstDisabled =
    enabledValue === false ||
    enabledValue === 0 ||
    enabledValue === 'false';
  const rateValue = settings.gst_rate;
  const rate =
    typeof rateValue === 'number' || typeof rateValue === 'string'
      ? amount(rateValue)
      : null;
  const rawTaxMode = (
    typeof settings.tax_mode === 'string' ? settings.tax_mode : ''
  )
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  const taxMode =
    rawTaxMode === 'taxexclusive'
      ? 'Tax Exclusive'
      : rawTaxMode === 'taxinclusive'
      ? 'Tax Inclusive'
      : null;

  if (
    (!gstEnabled && !gstDisabled) ||
    rate === null ||
    rate < 0 ||
    rate > 100 ||
    !taxMode
  ) {
    throw new Error('The GST settings response was invalid.');
  }

  return {
    gst_enabled: gstEnabled,
    gst_rate: rate,
    tax_mode: taxMode,
  };
}

export function calculateCartSubtotal(items: StoreCartItem[]) {
  let subtotal = 0;

  for (const item of items) {
    const price = amount(item.price);
    const quantity = amount(item.quantity);
    const lineTotal =
      item.total_price != null
        ? amount(item.total_price)
        : price !== null && quantity !== null
        ? price * quantity
        : null;

    if (lineTotal === null || lineTotal < 0) return null;
    subtotal += lineTotal;
  }

  return roundCurrency(subtotal);
}

export function calculateCheckoutQuote(
  subtotal: number,
  settings: GstSettings,
): CheckoutQuote {
  const gstRate = settings.gst_enabled ? settings.gst_rate : 0;
  const taxInclusive = settings.tax_mode === 'Tax Inclusive';
  const gstAmount = settings.gst_enabled
    ? roundCurrency(
        taxInclusive
          ? (subtotal * gstRate) / (100 + gstRate)
          : (subtotal * gstRate) / 100,
      )
    : 0;

  return {
    subtotal,
    gst_rate: gstRate,
    gst_amount: gstAmount,
    total_amount: roundCurrency(
      taxInclusive ? subtotal : subtotal + gstAmount,
    ),
  };
}
