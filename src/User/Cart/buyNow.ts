import type { StoreBuyNowItem } from '../types';

export function buildBuyNowOrderItems(item: StoreBuyNowItem) {
  if (item.item_type === 'combo') {
    return [
      {
        combo_id: item.combo_id ?? item.id,
        quantity: item.quantity,
      },
    ];
  }

  return [
    {
      product_id: item.product_id ?? item.id,
      quantity: item.quantity,
      variant_color: item.variant_color ?? 'Default',
      variant_size: item.variant_size ?? 'Free Size',
    },
  ];
}
