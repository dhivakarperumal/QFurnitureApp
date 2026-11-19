import React from 'react';
import ItemDetails, { type ItemDetailsProps } from './ItemDetails';

type ComboDetailsProps = Omit<ItemDetailsProps, 'itemType'>;

export default function ComboDetails(props: ComboDetailsProps) {
  return <ItemDetails {...props} itemType="combo" />;
}
