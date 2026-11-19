import React from 'react';
import ItemDetails, { type ItemDetailsProps } from './ItemDetails';

type ProductDetailsProps = Omit<ItemDetailsProps, 'itemType'>;

export default function ProductDetails(props: ProductDetailsProps) {
  return <ItemDetails {...props} itemType="product" />;
}
