import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopHeader from '../Navigation/TopHeader';
import type { Product } from './Products';

type ProductsDetailsProps = {
  product: Product;
  onBack: () => void;
};

const statusStyles: Record<Product['status'], { background: string; color: string }> = {
  Active: { background: '#DCFCE7', color: '#15803D' },
  'Low Stock': { background: '#FEF3C7', color: '#B45309' },
  'Out of Stock': { background: '#FFE4E6', color: '#BE123C' },
};

const formatRupees = (value: number) =>
  `₹${value.toLocaleString('en-IN')}`;

const styles = StyleSheet.create({
  productImage: {
    width: '100%',
    aspectRatio: 0.87,
  },
});

export default function ProductsDetails({
  product,
  onBack,
}: ProductsDetailsProps) {
  const insets = useSafeAreaInsets();
  const status = statusStyles[product.status];

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle={product.name}
        pageSubtitle={product.category}
        onBackPress={onBack}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-[255px]"
        style={{ paddingTop: insets.top + 72 }}>
        <View className="mb-4 overflow-hidden rounded-[20px] border border-[#FCE6D7] bg-white shadow-sm elevation-[3]">
          <View className="w-full overflow-hidden bg-[#FFF6E8]">
            <Image
              source={
                product.imageUri
                  ? { uri: product.imageUri }
                  : require('../../Assert/images/Cozy Mustard Armchair Living Room.png')
              }
              accessibilityLabel={`${product.name} image`}
              resizeMode="cover"
              style={styles.productImage}
            />
            <View
              className="absolute left-4 top-4 rounded-full px-3 py-1.5"
              style={{ backgroundColor: status.background }}>
              <Text
                className="text-[11px] font-bold"
                style={{ color: status.color }}>
                {product.status}
              </Text>
            </View>
          </View>

          <View className="p-4">
            <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-[#F97316]">
              {product.category}
            </Text>
            <Text className="mt-1 text-[21px] font-black text-[#17191C]">
              {product.name}
            </Text>
            <Text className="mt-1 text-[12px] text-[#64748B]">
              SKU: {product.sku || 'Not available'}
            </Text>

            <View className="mt-4 flex-row">
              <View className="mr-3 flex-1 rounded-[14px] bg-[#FFF7ED] p-3">
                <Text className="text-[10px] font-semibold text-[#64748B]">
                  Selling Price
                </Text>
                <Text className="mt-1 text-[18px] font-black text-[#17191C]">
                  {formatRupees(product.price)}
                </Text>
                {product.mrp ? (
                  <Text className="mt-0.5 text-[11px] text-[#94A3B8] line-through">
                    MRP {formatRupees(product.mrp)}
                  </Text>
                ) : null}
              </View>
              <View className="flex-1 rounded-[14px] bg-[#F8FAFC] p-3">
                <Text className="text-[10px] font-semibold text-[#64748B]">
                  Available Stock
                </Text>
                <Text className="mt-1 text-[18px] font-black text-[#17191C]">
                  {product.stock}
                </Text>
                <Text className="mt-0.5 text-[11px] text-[#64748B]">
                  {product.stock === 1 ? 'unit available' : 'units available'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}