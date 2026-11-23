import { buildBuyNowOrderItems } from './buyNow';
import type { StoreBuyNowItem } from '../types';

describe('buy-now order items', () => {
  it('includes the product variant selected for checkout', () => {
    const item: StoreBuyNowItem = {
      id: 'buy-now-17',
      product_id: 17,
      item_type: 'product',
      name: 'Chair',
      quantity: 2,
      price: 250,
      variant_color: 'Walnut',
      variant_size: 'Large',
    };

    expect(buildBuyNowOrderItems(item)).toEqual([
      {
        product_id: 17,
        quantity: 2,
        variant_color: 'Walnut',
        variant_size: 'Large',
      },
    ]);
  });

  it('sends combos as combo IDs without product variants', () => {
    const item: StoreBuyNowItem = {
      id: 'buy-now-combo-8',
      combo_id: 8,
      item_type: 'combo',
      name: 'Living room set',
      quantity: 1,
      price: 1200,
    };

    expect(buildBuyNowOrderItems(item)).toEqual([
      {
        combo_id: 8,
        quantity: 1,
      },
    ]);
  });
});
