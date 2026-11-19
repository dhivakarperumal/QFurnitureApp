import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../api';
import ProductsDetails from './ProductsDetails';

export type Product = {
  id: number | string;
  name: string;
  sku: string;
  category: string;
  price: number;
  mrp?: number;
  stock: number;
  status: 'Active' | 'Low Stock' | 'Out of Stock';
  imageUri?: string;
};

type ApiProduct = {
  id?: number | string;
  name?: string;
  product_code?: string;
  category?: string;
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
  variants?: Array<{ image?: string | null }>;
};

type ProductsResponse = {
  products: ApiProduct[];
  pagination?: {
    totalPages?: number | string;
  };
};

type ProductsProps = {
  onActionPress?: (label: string) => void;
  onDetailsVisibilityChange?: (visible: boolean) => void;
  onScrollVisibilityChange?: (visible: boolean) => void;
};

const formatRupees = (value: number) =>
  `₹${value.toLocaleString('en-IN')}`;

const styles = StyleSheet.create({
  productImage: {
    width: '100%',
    aspectRatio: 0.87,
  },
});

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

const mapApiProduct = (item: ApiProduct): Product => {
  const stock = toNumber(item.available_stock ?? item.total_stock ?? item.stock);
  const minimumStock = toNumber(item.minimum_stock, 10);
  const inventoryStatus = `${item.status ?? ''} ${item.inventory_status ?? ''}`.toLowerCase();
  const status: Product['status'] =
    stock <= 0 || inventoryStatus.includes('out of stock')
      ? 'Out of Stock'
      : inventoryStatus.includes('low stock') || stock <= minimumStock
        ? 'Low Stock'
        : 'Active';

  const images = item.images ?? [];
  const requestedImageIndex = toNumber(item.main_image_index);
  const mainImageIndex =
    Number.isInteger(requestedImageIndex) &&
    requestedImageIndex >= 0 &&
    requestedImageIndex < images.length
      ? requestedImageIndex
      : 0;
  const imagePath =
    images[mainImageIndex] ?? images[0] ?? item.variants?.find(variant => variant.image)?.image;
  const price = toNumber(item.selling_price ?? item.offer_price ?? item.mrp);
  const mrp = toNumber(item.mrp);

  return {
    id: item.id ?? item.product_code ?? item.name ?? 'unknown-product',
    name: item.name ?? 'Unnamed product',
    sku: item.product_code ?? '',
    category: item.category ?? 'Uncategorized',
    price,
    mrp: mrp > price ? mrp : undefined,
    stock,
    status,
    imageUri: resolveImageUri(imagePath),
  };
};

export default function Products({
  onActionPress,
  onDetailsVisibilityChange,
  onScrollVisibilityChange,
}: ProductsProps) {
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<'All' | Product['status']>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockValue, setStockValue] = useState('');

  const showProductDetails = (product: Product) => {
    setSelectedProduct(product);
    onDetailsVisibilityChange?.(true);
  };

  const hideProductDetails = () => {
    setSelectedProduct(null);
    onDetailsVisibilityChange?.(false);
  };

  useEffect(
    () => () => onDetailsVisibilityChange?.(false),
    [onDetailsVisibilityChange],
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const params = {
        limit: 10,
        search: '',
        status: 'All',
        exclude_combo_products: true,
      };
      const firstResponse = await api.get<ProductsResponse>('/products', {
        params: { ...params, page: 1 },
      });

      if (!Array.isArray(firstResponse.data?.products)) {
        throw new Error('The products response did not contain a product list.');
      }

      const allProducts = [...firstResponse.data.products];
      const totalPages = Math.max(
        1,
        toNumber(firstResponse.data.pagination?.totalPages, 1),
      );

      for (let page = 2; page <= totalPages; page += 1) {
        const pageResponse = await api.get<ProductsResponse>('/products', {
          params: { ...params, page },
        });
        if (!Array.isArray(pageResponse.data?.products)) {
          throw new Error(`The products response for page ${page} was invalid.`);
        }
        allProducts.push(...pageResponse.data.products);
      }

      setProducts(allProducts.map(mapApiProduct));
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Unable to load products. Please try again.';
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return products.filter(product => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search);
      const matchesStatus = status === 'All' || product.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, status]);

  const stats = [
    {
      label: 'Total Products',
      value: products.length,
      sub: 'All furniture',
      icon: '▣',
      color: '#F97316',
      borderColor: '#FCE6D7',
      watermarkColor: '#FFF0E3',
    },
    {
      label: 'Active',
      value: products.filter(item => item.status === 'Active').length,
      sub: 'Active products',
      icon: '✓',
      color: '#10B981',
      borderColor: '#D5F5E9',
      watermarkColor: '#DDF8ED',
    },
    {
      label: 'Out of Stock',
      value: products.filter(item => item.status === 'Out of Stock').length,
      sub: 'Inactive products',
      icon: '!',
      color: '#F59E0B',
      borderColor: '#FDECC8',
      watermarkColor: '#FFF4D8',
    },
    {
      label: 'Low Stock',
      value: products.filter(item => item.status === 'Low Stock').length,
      sub: 'Need restocking',
      icon: '⚠',
      color: '#F43F5E',
      borderColor: '#FFE0E7',
      watermarkColor: '#FFE9EE',
    },
  ];

  const statusStyles: Record<Product['status'], { background: string; color: string }> = {
    Active: { background: '#DCFCE7', color: '#15803D' },
    'Low Stock': { background: '#FEF3C7', color: '#B45309' },
    'Out of Stock': { background: '#FFE4E6', color: '#BE123C' },
  };

  const openStockEditor = (product: Product) => {
    setStockProduct(product);
    setStockValue(String(product.stock));
  };

  const saveStock = () => {
    if (!stockProduct) return;
    const stock = Math.max(0, Number.parseInt(stockValue, 10) || 0);
    setProducts(items =>
      items.map(item =>
        item.id === stockProduct.id
          ? {
              ...item,
              stock,
              status: stock === 0 ? 'Out of Stock' : stock < 10 ? 'Low Stock' : 'Active',
            }
          : item,
      ),
    );
    setStockProduct(null);
  };

  const statuses: Array<'All' | Product['status']> = ['All', 'Active', 'Low Stock', 'Out of Stock'];

  if (selectedProduct) {
    return (
      <ProductsDetails
        product={selectedProduct}
        onBack={hideProductDetails}
      />
    );
  }

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={event => {
          const currentScrollY = event.nativeEvent.contentOffset.y;
          if (currentScrollY < 20 || currentScrollY < lastScrollY.current - 8) {
            onScrollVisibilityChange?.(true);
          } else if (currentScrollY > lastScrollY.current + 8) {
            onScrollVisibilityChange?.(false);
          }
          lastScrollY.current = currentScrollY;
        }}
        contentContainerClassName="px-4 pb-[255px]"
        style={{ paddingTop: insets.top + 84 }}>
       

        <View className="mb-4 flex-row flex-wrap justify-between">
          {stats.map(stat => (
            <View
              key={stat.label}
              className="relative mb-3 h-[118px] w-[49%] justify-center overflow-hidden rounded-[16px] border bg-white pl-3 pr-2 shadow-sm elevation-[3]"
              style={{ borderColor: stat.borderColor }}>
              <View
                className="absolute left-0 top-[16px] h-[86px] w-[4px] rounded-r-full"
                style={{ backgroundColor: stat.color }}
              />
              <Text
                className="absolute bottom-1 right-1 text-[42px] font-black"
                style={{ color: stat.watermarkColor }}>
                {stat.icon}
              </Text>
              <View className="flex-row items-center">
                <View
                  className="h-[48px] w-[48px] items-center justify-center rounded-[12px] shadow-sm elevation-[3]"
                  style={{ backgroundColor: stat.color }}>
                  <Text className="text-[19px] font-black text-white">{stat.icon}</Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text numberOfLines={2} className="text-[13px] font-bold text-[#17191C]">
                    {stat.label}
                  </Text>
                  <Text className="text-[24px] font-black leading-[29px] text-[#17191C]">
                    {stat.value}
                  </Text>
                  <Text numberOfLines={2} className="text-[10px] text-[#64748B]">
                    {stat.sub}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-3">
          <View className="mb-3 h-[46px] flex-row items-center rounded-[14px] bg-[#F5F7F8] px-3">
            <Text className="mr-2 text-[18px] text-[#94A3B8]">⌕</Text>
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search products by name or SKU..."
              placeholderTextColor="#94A3B8"
              className="flex-1 text-[13px] text-[#17191C]"
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-2">
            {statuses.map(item => (
              <Pressable
                key={item}
                onPress={() => setStatus(item)}
                className={[
                  'mr-2 h-[38px] justify-center rounded-full border px-4',
                  status === item
                    ? 'border-[#17191C] bg-[#17191C]'
                    : 'border-[#E2E8F0] bg-white',
                ].join(' ')}>
                <Text
                  className={[
                    'text-[11px] font-bold',
                    status === item ? 'text-white' : 'text-[#64748B]',
                  ].join(' ')}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] font-semibold text-[#94A3B8]">
              {loading ? 'Loading products...' : `${filteredProducts.length} products`}
            </Text>
            <View className="flex-row rounded-[12px] bg-[#EDF1F3] p-1">
              <Pressable
                accessibilityLabel="Grid view"
                onPress={() => setViewMode('grid')}
                className={[
                  'h-[38px] w-[42px] items-center justify-center rounded-[9px]',
                  viewMode === 'grid' ? 'bg-white' : '',
                ].join(' ')}>
                <Text className="text-[17px] text-[#17191C]">▦</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="List view"
                onPress={() => setViewMode('list')}
                className={[
                  'h-[38px] w-[42px] items-center justify-center rounded-[9px]',
                  viewMode === 'list' ? 'bg-white' : '',
                ].join(' ')}>
                <Text className="text-[20px] text-[#17191C]">☷</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {loading ? (
          <View className="items-center rounded-[18px] border border-[#ECE8DF] bg-white py-12">
            <ActivityIndicator size="large" color="#F97316" />
            <Text className="mt-3 text-[12px] text-[#64748B]">Loading products...</Text>
          </View>
        ) : loadError ? (
          <View className="items-center rounded-[18px] border border-[#ECE8DF] bg-white px-5 py-12">
            <Text className="text-center text-[13px] text-[#64748B]">{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={fetchProducts}
              className="mt-4 rounded-[12px] bg-[#F97316] px-5 py-3">
              <Text className="text-[12px] font-bold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View className="items-center rounded-[18px] border border-[#ECE8DF] bg-white py-16">
            <Text className="text-[38px]">▣</Text>
            <Text className="mt-3 text-[14px] font-bold text-[#64748B]">
              No products found
            </Text>
            <Text className="mt-1 text-[11px] text-[#94A3B8]">
              Try adjusting your search or filters
            </Text>
          </View>
        ) : viewMode === 'grid' ? (
          <View className="flex-row flex-wrap justify-between">
            {filteredProducts.map(product => (
              <View
                key={product.id}
                className="mb-4 w-[48%] overflow-hidden rounded-[18px] border border-[#ECE8DF] bg-white shadow-sm elevation-[2]">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${product.name} details`}
                  onPress={() => showProductDetails(product)}>
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
                      className="absolute left-3 top-3 rounded-full px-2.5 py-1"
                      style={{ backgroundColor: statusStyles[product.status].background }}>
                      <Text
                        className="text-[9px] font-bold"
                        style={{ color: statusStyles[product.status].color }}>
                        {product.status}
                      </Text>
                    </View>
                  </View>
                  <View className="px-3 pb-2 pt-3">
                    <Text className="text-[9px] font-bold uppercase tracking-[1px] text-[#F59E0B]">
                      {product.category}
                    </Text>
                    <Text numberOfLines={1} className="mt-1 text-[13px] font-black text-[#17191C]">
                      {product.name}
                    </Text>
                    <Text className="mt-1 text-[9px] text-[#94A3B8]">SKU: {product.sku}</Text>
                  </View>
                </Pressable>
                <View className="px-3 pb-3">
                  <View className="flex-row items-center justify-between border-t border-[#F1F5F9] pt-3">
                    <View>
                      <Text className="text-[14px] font-black text-[#17191C]">
                        {formatRupees(product.price)}
                      </Text>
                      {product.mrp ? (
                        <Text className="text-[9px] text-[#94A3B8] line-through">
                          {formatRupees(product.mrp)}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit stock for ${product.name}`}
                      onPress={() => openStockEditor(product)}
                      className="h-[34px] min-w-[34px] items-center justify-center rounded-full bg-[#FFF3D6] px-2">
                      <Text className="text-[11px] font-black text-[#B45309]">{product.stock}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View>
            {filteredProducts.map(product => (
              <View
                key={product.id}
                className="mb-3 flex-row items-center rounded-[16px] border border-[#ECE8DF] bg-white p-3 shadow-sm elevation-[1]">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${product.name} details`}
                  onPress={() => {
                    onActionPress?.(product.name);
                    showProductDetails(product);
                  }}
                  className="flex-1 flex-row items-center">
                  <Image
                    source={
                      product.imageUri
                        ? { uri: product.imageUri }
                        : require('../../Assert/images/Cozy Mustard Armchair Living Room.png')
                    }
                    accessibilityLabel={`${product.name} image`}
                    resizeMode="cover"
                    className="mr-3 h-[68px] w-[68px] rounded-[13px]"
                  />
                  <View className="flex-1 pr-2">
                    <Text className="text-[9px] font-bold uppercase text-[#F59E0B]">
                      {product.category}
                    </Text>
                    <Text numberOfLines={1} className="mt-0.5 text-[13px] font-black text-[#17191C]">
                      {product.name}
                    </Text>
                    <Text className="mt-1 text-[10px] text-[#94A3B8]">SKU: {product.sku}</Text>
                    <View className="mt-2 flex-row items-center">
                      <Text className="mr-2 text-[12px] font-black text-[#17191C]">
                        {formatRupees(product.price)}
                      </Text>
                      <View
                        className="rounded-full px-2 py-0.5"
                        style={{ backgroundColor: statusStyles[product.status].background }}>
                        <Text
                          className="text-[8px] font-bold"
                          style={{ color: statusStyles[product.status].color }}>
                          {product.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Edit stock for ${product.name}`}
                  onPress={() => openStockEditor(product)}
                  className="ml-2 h-[40px] w-[40px] items-center justify-center rounded-full bg-[#FFF3D6]">
                  <Text className="text-[12px] font-black text-[#B45309]">{product.stock}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={stockProduct !== null}
        onRequestClose={() => setStockProduct(null)}>
        <View className="flex-1 items-center justify-center bg-[#17191C]/70 px-5">
          <View className="w-full rounded-[24px] bg-white p-5">
            <Text className="text-[18px] font-black text-[#17191C]">
              Update Stock
            </Text>
            <Text className="mt-1 text-[12px] text-[#94A3B8]">
              {stockProduct?.name}
            </Text>
            <TextInput
              value={stockValue}
              onChangeText={setStockValue}
              keyboardType="number-pad"
              placeholder="0"
              className="my-5 h-[64px] rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] text-center text-[24px] font-black text-[#17191C]"
            />
            <View className="flex-row">
              <Pressable
                onPress={() => setStockProduct(null)}
                className="mr-2 h-[48px] flex-1 items-center justify-center rounded-[14px] border border-[#E2E8F0]">
                <Text className="text-[12px] font-bold text-[#64748B]">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveStock}
                className="h-[48px] flex-1 items-center justify-center rounded-[14px] bg-[#17191C]">
                <Text className="text-[12px] font-bold text-white">Update Stock</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}