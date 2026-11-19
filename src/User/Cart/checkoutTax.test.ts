import {
  calculateCartSubtotal,
  calculateCheckoutQuote,
  parseGstSettings,
} from './checkoutTax';

describe('checkout GST calculation', () => {
  it('calculates tax-exclusive GST from cart totals', () => {
    const settings = parseGstSettings({
      gst_enabled: true,
      gst_rate: 12,
      tax_mode: 'Tax Exclusive',
    });
    const subtotal = calculateCartSubtotal([
      {
        id: 1,
        name: 'Furniture',
        quantity: 2,
        price: 41987.5,
      },
    ]);

    expect(subtotal).toBe(83975);
    if (subtotal === null) throw new Error('Expected a valid cart subtotal.');

    expect(calculateCheckoutQuote(subtotal, settings)).toEqual({
      subtotal: 83975,
      gst_rate: 12,
      gst_amount: 10077,
      total_amount: 94052,
    });
  });

  it('extracts GST from tax-inclusive cart totals', () => {
    const settings = parseGstSettings({
      gst_enabled: true,
      gst_rate: 12,
      tax_mode: 'Tax Inclusive',
    });

    expect(calculateCheckoutQuote(112, settings)).toEqual({
      subtotal: 112,
      gst_rate: 12,
      gst_amount: 12,
      total_amount: 112,
    });
  });

  it('does not add GST when disabled', () => {
    const settings = parseGstSettings({
      gst_enabled: false,
      gst_rate: 12,
      tax_mode: 'Tax Exclusive',
    });

    expect(calculateCheckoutQuote(100, settings)).toEqual({
      subtotal: 100,
      gst_rate: 0,
      gst_amount: 0,
      total_amount: 100,
    });
  });

  it('rejects invalid tax settings instead of guessing', () => {
    expect(() =>
      parseGstSettings({
        gst_enabled: true,
        gst_rate: 12,
        tax_mode: 'Unknown',
      }),
    ).toThrow('The GST settings response was invalid.');
  });
});
