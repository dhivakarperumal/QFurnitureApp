import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopHeader from '../Navigation/TopHeader';
import api, { API_BASE_URL } from '../../api';
import type { Product } from './Products';

type ProductsDetailsProps = {
  product: Product;
  onBack: () => void;
};

type ProductDetailsResponse = {
  id?: number | string;
  name?: string;
  product_code?: string;
  category?: string;
  description?: string;
  rating?: number | string | null;
  brand?: string;
  model_number?: string;
  material_type?: string;
  material?: string;
  wood_type?: string;
  colour?: string;
  finish_type?: string;
  height?: number | string;
  width?: number | string;
  depth?: number | string;
  weight?: number | string;
  seating_capacity?: number | string;
  doors?: number | string;
  drawers?: number | string;
  mattress_size?: string;
  warranty_period?: string;
  country_of_origin?: string;
  selling_price?: number | string | null;
  offer_price?: number | string | null;
  mrp?: number | string | null;
  available_stock?: number | string | null;
  total_stock?: number | string | null;
  stock?: number | string | null;
  minimum_stock?: number | string | null;
  status?: string;
  inventory_status?: string;
  images?: string[] | null;
  main_image_index?: number | string | null;
  variants?: Array<{
    image?: string | null;
    images?: string[] | null;
    stock?: number | string | null;
    sizesStock?: Record<string, number | string> | null;
    selling_price?: number | string | null;
    offer_price?: number | string | null;
    mrp?: number | string | null;
    colour?: string;
    colorName?: string;
    size?: string;
    material?: string;
    selectedSizes?: string[];
  }>;
};

const statusStyles: Record<Product['status'], { background: string; color: string }> = {
  Active: { background: '#DCFCE7', color: '#15803D' },
  'Low Stock': { background: '#FEF3C7', color: '#B45309' },
  'Out of Stock': { background: '#FFE4E6', color: '#BE123C' },
};

const formatRupees = (value: number) =>
  `₹${value.toLocaleString('en-IN')}`;

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveImageUri = (path?: string | null) => {
  if (!path?.trim()) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${apiOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
};

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
  const [details, setDetails] = useState<ProductDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVariant, setActiveVariant] = useState(0);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await api.get<ProductDetailsResponse>(
          `/products/${product.id}`,
        );
        if (mounted) setDetails(response.data);
      } catch (error) {
        if (__DEV__) {
          console.warn('[ProductsDetails] Could not load product details:', error);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => {
      mounted = false;
    };
  }, [product.id]);

  const name = details?.name ?? product.name;
  const sku = details?.product_code ?? product.sku;
  const category = details?.category ?? product.category;
  const price = toNumber(
    details?.selling_price ?? details?.offer_price ?? details?.mrp,
    product.price,
  );
  const mrpValue = toNumber(details?.mrp, product.mrp ?? 0);
  const stock = toNumber(
    details?.available_stock ?? details?.total_stock ?? details?.stock,
    product.stock,
  );
  const inventoryStatus =
    `${details?.status ?? ''} ${details?.inventory_status ?? ''}`.toLowerCase();
  const minimumStock = toNumber(details?.minimum_stock, 10);
  const resolvedStatus: Product['status'] =
    stock <= 0 || inventoryStatus.includes('out of stock')
      ? 'Out of Stock'
      : inventoryStatus.includes('low stock') || stock <= minimumStock
        ? 'Low Stock'
        : 'Active';
  const images = details?.images ?? [];
  const requestedImageIndex = toNumber(details?.main_image_index);
  const imageIndex =
    Number.isInteger(requestedImageIndex) &&
    requestedImageIndex >= 0 &&
    requestedImageIndex < images.length
      ? requestedImageIndex
      : 0;
  const imagePath =
    images[imageIndex] ??
    images[0] ??
    details?.variants?.find(variant => variant.image)?.image;
  const imageUri = resolveImageUri(imagePath) ?? product.imageUri;
  const status = statusStyles[resolvedStatus];
  const variants = details?.variants ?? [];
  const currentVariant = variants[activeVariant] ?? {};
  const variantImages = Array.isArray(currentVariant.images)
    ? currentVariant.images
    : currentVariant.image
      ? [currentVariant.image]
      : images;
  const displayImages = variantImages.length > 0
    ? variantImages
    : imageUri
      ? [imageUri]
      : [];
  const variantStock = variants.length
    ? toNumber(
        currentVariant.stock ??
          Object.values(currentVariant.sizesStock ?? {}).reduce(
            (sum: number, quantity) => sum + toNumber(quantity),
            0,
          ),
      )
    : stock;
  const variantPrice = variants.length
    ? toNumber(
        currentVariant.selling_price ??
          currentVariant.offer_price ??
          details?.offer_price ??
          mrpValue,
      )
    : price;
  const variantMrp = toNumber(currentVariant.mrp ?? mrpValue);
  const displayImageUri =
    resolveImageUri(displayImages[activeImage] ?? displayImages[0]) ?? imageUri;

  const specs = [
    { label: 'Brand', value: details?.brand },
    { label: 'Model', value: details?.model_number },
    { label: 'Material', value: details?.material_type || details?.material },
    { label: 'Wood type', value: details?.wood_type },
    { label: 'Colour', value: details?.colour },
    { label: 'Finish', value: details?.finish_type },
    {
      label: 'Dimensions (H x W x D)',
      value: [details?.height, details?.width, details?.depth]
        .filter(value => value !== undefined && value !== null && value !== '')
        .join(' x '),
    },
    { label: 'Weight', value: details?.weight ? `${details.weight} kg` : '' },
    { label: 'Seating capacity', value: details?.seating_capacity },
    { label: 'Doors', value: details?.doors },
    { label: 'Drawers', value: details?.drawers },
    { label: 'Mattress size', value: details?.mattress_size },
    { label: 'Warranty', value: details?.warranty_period },
    { label: 'Origin', value: details?.country_of_origin },
  ].filter(spec =>
    spec.value !== undefined &&
    spec.value !== null &&
    String(spec.value).trim() !== '',
  );

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle={name}
        pageSubtitle={category}
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
                displayImageUri
                  ? { uri: displayImageUri }
                  : require('../../Assert/images/Cozy Mustard Armchair Living Room.png')
              }
              accessibilityLabel={`${name} image`}
              resizeMode="cover"
              style={styles.productImage}
            />
            <View
              className="absolute left-4 top-4 rounded-full px-3 py-1.5"
              style={{ backgroundColor: status.background }}>
              <Text
                className="text-[11px] font-bold"
                style={{ color: status.color }}>
                {resolvedStatus}
              </Text>
            </View>
          </View>

          {displayImages.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="px-3 py-3">
              {displayImages.map((image, index) => {
                const thumbnailUri =
                  resolveImageUri(image) ?? (image.startsWith('http') ? image : undefined);
                return (
                  <Pressable
                    key={`${image}-${index}`}
                    accessibilityRole="button"
                    onPress={() => setActiveImage(index)}
                    className={`mr-2 h-[72px] w-[72px] overflow-hidden rounded-[12px] border-2 ${
                      activeImage === index
                        ? 'border-[#F97316]'
                        : 'border-transparent'
                    }`}>
                    {thumbnailUri ? (
                      <Image
                        source={{ uri: thumbnailUri }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View className="p-4">
            <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-[#F97316]">
              {category}
            </Text>
            <Text className="mt-1 text-[21px] font-black text-[#17191C]">
              {name}
            </Text>
            <Text className="mt-1 text-[12px] text-[#64748B]">
              SKU: {sku || 'Not available'}
            </Text>
            {toNumber(details?.rating) > 0 ? (
              <Text className="mt-2 text-[12px] font-bold text-[#D97706]">
                ★ {details?.rating}  Boutique Standard
              </Text>
            ) : null}
            {loading ? (
              <View className="mt-3 h-[28px] justify-center">
                <ActivityIndicator size="small" color="#F97316" />
              </View>
            ) : null}

            <Text className="mt-4 text-[13px] font-bold uppercase tracking-[1px] text-[#17191C]">
              Description
            </Text>
            <Text className="mt-2 text-[13px] leading-5 text-[#64748B]">
              {details?.description || 'No description provided.'}
            </Text>

            <View className="mt-4 flex-row">
              <View className="mr-3 flex-1 rounded-[14px] bg-[#FFF7ED] p-3">
                <Text className="text-[10px] font-semibold text-[#64748B]">
                  Selling Price
                </Text>
                <Text className="mt-1 text-[18px] font-black text-[#17191C]">
                  {formatRupees(variantPrice)}
                </Text>
                {variantMrp > variantPrice ? (
                  <Text className="mt-0.5 text-[11px] text-[#94A3B8] line-through">
                    MRP {formatRupees(variantMrp)}
                  </Text>
                ) : null}
              </View>
              <View className="flex-1 rounded-[14px] bg-[#F8FAFC] p-3">
                <Text className="text-[10px] font-semibold text-[#64748B]">
                  Available Stock
                </Text>
                <Text className="mt-1 text-[18px] font-black text-[#17191C]">
                  {variantStock}
                </Text>
                <Text className="mt-0.5 text-[11px] text-[#64748B]">
                  {variantStock === 1 ? 'unit available' : 'units available'}
                </Text>
              </View>
            </View>

            {specs.length > 0 ? (
              <View className="mt-4">
                <Text className="mb-3 text-[13px] font-bold uppercase tracking-[1px] text-[#17191C]">
                  Specifications
                </Text>
                <View className="flex-row flex-wrap">
                  {specs.map(spec => (
                    <View
                      key={spec.label}
                      className="mb-2 mr-2 min-w-[145px] flex-1 rounded-[12px] border border-[#F1F5F9] bg-[#F8FAFC] p-3">
                      <Text className="text-[9px] font-bold uppercase tracking-[0.8px] text-[#94A3B8]">
                        {spec.label}
                      </Text>
                      <Text className="mt-1 text-[12px] font-bold text-[#334155]">
                        {String(spec.value)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {variants.length > 0 ? (
          <View className="mb-4 rounded-[20px] border border-[#FCE6D7] bg-white p-4 shadow-sm elevation-[2]">
            <Text className="mb-3 text-[13px] font-bold uppercase tracking-[1px] text-[#17191C]">
              Available Variants
            </Text>
            {variants.map((variant, index) => {
              const variantName =
                variant.colour || variant.colorName || 'Variant';
              const variantQuantity = toNumber(
                variant.stock ??
                  Object.values(variant.sizesStock ?? {}).reduce(
                    (sum: number, quantity) => sum + toNumber(quantity),
                    0,
                  ),
              );
              const variantLabel = [
                variant.size,
                variant.material,
              ].filter(Boolean).join(' · ');

              return (
                <Pressable
                  key={`${variantName}-${index}`}
                  accessibilityRole="button"
                  onPress={() => {
                    setActiveVariant(index);
                    setActiveImage(0);
                  }}
                  className={`mb-2 flex-row items-center justify-between rounded-[14px] border p-3 ${
                    activeVariant === index
                      ? 'border-[#FDBA74] bg-[#FFF7ED]'
                      : 'border-[#F1F5F9] bg-[#F8FAFC]'
                  }`}>
                  <View className="mr-3 flex-1">
                    <Text className="text-[13px] font-black text-[#334155]">
                      {variantName}
                    </Text>
                    {variantLabel ? (
                      <Text className="mt-1 text-[10px] font-bold text-[#94A3B8]">
                        {variantLabel}
                      </Text>
                    ) : null}
                  </View>
                  <View className="items-end">
                    <Text className="text-[12px] font-black text-[#F97316]">
                      {variantQuantity} Units
                    </Text>
                    {variant.selling_price != null ? (
                      <Text className="mt-1 text-[10px] font-bold text-[#64748B]">
                        {formatRupees(toNumber(variant.selling_price))}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}