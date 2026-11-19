import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Package,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../api';
import TopHeader from '../Navigation/TopHeader';

type StockVariant = {
  color?: string;
  colorName?: string;
  stock?: number | string | null;
  total_stock?: number | string | null;
  sizesStock?: Record<string, number | string> | null;
  images?: string[] | string | null;
};

type ComboItem = {
  product_id?: number | string;
  product_name?: string;
  name?: string;
  quantity?: number | string;
};

type InventoryItem = {
  id: number | string;
  name: string;
  product_code?: string;
  combo_code?: string;
  category?: string;
  status?: string;
  inventory_status?: string;
  available_stock?: number | string | null;
  total_stock?: number | string | null;
  stock?: number | string | null;
  reserved_stock?: number | string | null;
  damaged_stock?: number | string | null;
  minimum_stock?: number | string | null;
  offer_price?: number | string | null;
  selling_price?: number | string | null;
  discount_price?: number | string | null;
  mrp?: number | string | null;
  images?: string[] | string | null;
  image?: string | null;
  main_image_index?: number | string | null;
  variants?: StockVariant[] | string | null;
  combo_items?: ComboItem[];
};

type InventoryStats = {
  total: number;
  active: number;
  inactive: number;
  outOfStock: number;
  lowStock: number;
};

type InventoryResponse = {
  products?: InventoryItem[];
  combos?: InventoryItem[];
  pagination?: {
    total?: number;
    totalPages?: number;
  };
  stats?: Partial<InventoryStats>;
};

type StockDetailsProps = {
  onBackPress: () => void;
  onScrollVisibilityChange?: (visible: boolean) => void;
};

type InventoryType = 'single' | 'combos';
type StockFilter = 'All' | 'Active' | 'Inactive' | 'Low Stock' | 'Out of Stock';

const pageSize = 10;
const stockSheetStyles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    flexShrink: 1,
  },
  scroll: {
    flexShrink: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingBottom: 16,
  },
});
const emptyStats: InventoryStats = {
  total: 0,
  active: 0,
  inactive: 0,
  outOfStock: 0,
  lowStock: 0,
};

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseArray = <T,>(value: T[] | string | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const resolveImageUri = (path?: string | null) => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};

const getInventoryImage = (item: InventoryItem) => {
  const images = parseArray<string>(item.images);
  const requestedIndex = Math.floor(toNumber(item.main_image_index));
  const productImage =
    images[requestedIndex] ?? images[0] ?? item.image ?? undefined;
  if (productImage) return resolveImageUri(productImage);

  const variants = parseArray<StockVariant>(item.variants);
  for (const variant of variants) {
    const variantImages = parseArray<string>(variant.images);
    if (variantImages[0]) return resolveImageUri(variantImages[0]);
  }
  return undefined;
};

const getStock = (item: InventoryItem) =>
  toNumber(item.available_stock ?? item.total_stock ?? item.stock);

const getItemStatus = (item: InventoryItem) => {
  const stock = getStock(item);
  if (stock <= 0) return 'Out of Stock';
  if (stock <= toNumber(item.minimum_stock, 5)) return 'Low Stock';
  return item.status === 'Inactive' ? 'Inactive' : 'Active';
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== 'object' || error === null) return fallback;
  if (
    'response' in error &&
    typeof error.response === 'object' &&
    error.response
  ) {
    const response = error.response as { data?: { message?: unknown } };
    if (typeof response.data?.message === 'string')
      return response.data.message;
  }
  if ('message' in error && typeof error.message === 'string')
    return error.message;
  return fallback;
};

const formatPrice = (value: number | string | null | undefined) =>
  `₹${toNumber(value).toLocaleString('en-IN')}`;

const normalizeVariants = (value: InventoryItem['variants']) => {
  if (typeof value === 'string') {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new Error('Product variants data is invalid.');
    }
    return parsed as StockVariant[];
  }
  return Array.isArray(value) ? value : [];
};

const getVariantSizes = (variant: StockVariant) => {
  const sizes = variant.sizesStock;
  return sizes && typeof sizes === 'object' && !Array.isArray(sizes)
    ? Object.entries(sizes)
    : [];
};

const hasVariantStock = (variants: StockVariant[]) =>
  variants.some(
    variant =>
      variant.stock != null ||
      variant.total_stock != null ||
      getVariantSizes(variant).length > 0,
  );

export default function StockDetails({
  onBackPress,
  onScrollVisibilityChange,
}: StockDetailsProps) {
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const requestId = useRef(0);
  const detailRequestId = useRef(0);
  const [inventoryType, setInventoryType] = useState<InventoryType>('single');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [stats, setStats] = useState<InventoryStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [loadingSetting, setLoadingSetting] = useState(true);
  const [savingSetting, setSavingSetting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(
    null,
  );
  const [selectedCombo, setSelectedCombo] = useState<InventoryItem | null>(
    null,
  );
  const [editedVariants, setEditedVariants] = useState<StockVariant[]>([]);
  const [variantAdditions, setVariantAdditions] = useState<
    Record<string, string>
  >({});
  const [manualQuantity, setManualQuantity] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingStock, setSavingStock] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, stockFilter, inventoryType]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    const params: Record<string, string | number | boolean> = {
      page: currentPage,
      limit: pageSize,
      search,
    };
    if (inventoryType === 'single') {
      params.exclude_combo_products = true;
      if (stockFilter !== 'All') params.status = stockFilter;
    } else if (stockFilter === 'Active' || stockFilter === 'Inactive') {
      params.status = stockFilter;
    }

    const loadInventory = async () => {
      try {
        const response = await api.get<InventoryResponse>(
          inventoryType === 'single' ? '/products' : '/combos',
          { params },
        );
        if (id !== requestId.current) return;
        const data = response.data;
        const pageItems =
          inventoryType === 'single' ? data.products : data.combos;
        if (!Array.isArray(pageItems)) {
          throw new Error(
            'The inventory response did not contain a valid item list.',
          );
        }
        setItems(pageItems);
        setPagination({
          total: toNumber(data.pagination?.total, pageItems.length),
          totalPages: Math.max(1, toNumber(data.pagination?.totalPages, 1)),
        });
        setStats({
          total: toNumber(data.stats?.total),
          active: toNumber(data.stats?.active),
          inactive: toNumber(data.stats?.inactive ?? data.stats?.outOfStock),
          outOfStock: toNumber(data.stats?.outOfStock),
          lowStock: toNumber(data.stats?.lowStock),
        });
      } catch (error: unknown) {
        if (id !== requestId.current) return;
        const message = getErrorMessage(error, 'Could not load stock details.');
        setLoadError(message);
        setItems([]);
        if (__DEV__) {
          console.warn('[StockDetails] Could not load inventory:', error);
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    };
    loadInventory();
    return () => {
      if (id === requestId.current) requestId.current += 1;
    };
  }, [inventoryType, currentPage, search, stockFilter, refreshKey]);

  useEffect(() => {
    let active = true;
    api
      .get<{ allow_negative_stock?: boolean }>('/stock/settings')
      .then(response => {
        if (active) {
          setAllowNegativeStock(Boolean(response.data?.allow_negative_stock));
        }
      })
      .catch(error => {
        if (active) {
          if (__DEV__) {
            console.warn(
              '[StockDetails] Could not load stock settings:',
              error,
            );
          }
          Alert.alert(
            'Settings unavailable',
            getErrorMessage(error, 'Could not load negative stock settings.'),
          );
        }
      })
      .finally(() => {
        if (active) setLoadingSetting(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateNegativeStockSetting = async (enabled: boolean) => {
    setSavingSetting(true);
    try {
      const response = await api.put<{ allow_negative_stock?: boolean }>(
        '/stock/settings',
        { allow_negative_stock: enabled },
      );
      setAllowNegativeStock(Boolean(response.data?.allow_negative_stock));
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('[StockDetails] Could not update stock settings:', error);
      }
      Alert.alert(
        'Update failed',
        getErrorMessage(error, 'Could not update negative stock settings.'),
      );
    } finally {
      setSavingSetting(false);
    }
  };

  const openUpdateModal = async (product: InventoryItem) => {
    const id = ++detailRequestId.current;
    setSelectedProduct(product);
    setEditedVariants([]);
    setVariantAdditions({});
    setManualQuantity('');
    setLoadingDetail(true);
    try {
      const response = await api.get<InventoryItem>(`/products/${product.id}`);
      if (id !== detailRequestId.current) return;
      const variants = normalizeVariants(response.data.variants);
      setSelectedProduct(response.data);
      setEditedVariants(variants);
    } catch (error: unknown) {
      if (id !== detailRequestId.current) return;
      if (__DEV__) {
        console.warn('[StockDetails] Could not load product details:', error);
      }
      setSelectedProduct(null);
      Alert.alert(
        'Could not open stock update',
        getErrorMessage(error, 'Could not load detailed stock data.'),
      );
    } finally {
      if (id === detailRequestId.current) setLoadingDetail(false);
    }
  };

  const closeUpdateModal = () => {
    if (savingStock) return;
    detailRequestId.current += 1;
    setSelectedProduct(null);
    setEditedVariants([]);
    setVariantAdditions({});
    setManualQuantity('');
    setLoadingDetail(false);
  };

  const updateVariantAddition = (key: string, value: string) => {
    setVariantAdditions(previous => ({
      ...previous,
      [key]: value.replace(/[^\d]/g, ''),
    }));
  };

  const saveStock = async () => {
    if (!selectedProduct || loadingDetail) return;
    const variants = editedVariants.map(variant => ({
      ...variant,
      ...(variant.sizesStock ? { sizesStock: { ...variant.sizesStock } } : {}),
    }));
    let addedStock = 0;

    if (hasVariantStock(variants)) {
      variants.forEach((variant, variantIndex) => {
        const sizes = getVariantSizes(variant);
        if (sizes.length) {
          const nextSizes: Record<string, number> = {};
          sizes.forEach(([size, currentQuantity]) => {
            const key = `${variantIndex}-${size}`;
            const addition = toNumber(variantAdditions[key]);
            nextSizes[size] = toNumber(currentQuantity) + addition;
            addedStock += addition;
          });
          variant.sizesStock = nextSizes;
          return;
        }
        const key = `${variantIndex}-variant`;
        const addition = toNumber(variantAdditions[key]);
        const currentQuantity = toNumber(variant.stock ?? variant.total_stock);
        if (variant.stock != null || variant.total_stock == null) {
          variant.stock = currentQuantity + addition;
        } else {
          variant.total_stock = currentQuantity + addition;
        }
        addedStock += addition;
      });
    } else {
      addedStock = toNumber(manualQuantity);
    }

    if (!Number.isSafeInteger(addedStock) || addedStock <= 0) {
      Alert.alert(
        'Quantity required',
        'Enter a whole quantity greater than zero.',
      );
      return;
    }

    const newTotalStock =
      toNumber(
        selectedProduct.available_stock ??
          selectedProduct.total_stock ??
          selectedProduct.stock,
      ) + addedStock;
    setSavingStock(true);
    try {
      await api.put(`/products/${selectedProduct.id}`, {
        ...selectedProduct,
        total_stock: newTotalStock,
        stock: newTotalStock,
        variants,
      });
      setSelectedProduct(null);
      setRefreshKey(value => value + 1);
      Alert.alert('Stock updated', 'Product stock was updated successfully.');
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('[StockDetails] Could not save product stock:', error);
      }
      Alert.alert(
        'Stock update failed',
        getErrorMessage(error, 'Could not update product stock.'),
      );
    } finally {
      setSavingStock(false);
    }
  };

  const visibleFilters: StockFilter[] =
    inventoryType === 'single'
      ? ['All', 'Active', 'Inactive', 'Low Stock', 'Out of Stock']
      : ['All', 'Active', 'Inactive'];
  const totalPages = Math.max(1, pagination.totalPages);
  const currentStats = useMemo(
    () => [
      {
        label: inventoryType === 'single' ? 'Total products' : 'Total combos',
        value: stats.total,
        color: '#F97316',
        icon: Package,
      },
      {
        label: 'Active',
        value: stats.active,
        color: '#10B981',
        icon: CheckCircle2,
      },
      {
        label: 'Inactive',
        value: stats.inactive,
        color: '#F59E0B',
        icon: AlertCircle,
      },
      {
        label: 'Low stock',
        value: stats.lowStock,
        color: '#E11D48',
        icon: XCircle,
      },
    ],
    [inventoryType, stats],
  );

  const statusColors: Record<
    string,
    { background: string; foreground: string }
  > = {
    Active: { background: '#ECFDF5', foreground: '#047857' },
    Inactive: { background: '#F1F5F9', foreground: '#64748B' },
    'Low Stock': { background: '#FFFBEB', foreground: '#B45309' },
    'Out of Stock': { background: '#FFF1F2', foreground: '#BE123C' },
  };

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="Stock Details"
        pageSubtitle="Inventory overview and restocking"
        onBackPress={onBackPress}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
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
        style={{ paddingTop: insets.top + 72 }}
      >
        <View className="mb-3 flex-row rounded-[12px] border border-[#E2E8F0] bg-white p-1">
          {[
            { id: 'single' as const, label: 'Single products' },
            { id: 'combos' as const, label: 'Combos' },
          ].map(tab => (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              onPress={() => {
                setInventoryType(tab.id);
                setStockFilter('All');
                setCurrentPage(1);
              }}
              className={`mr-1 flex-1 items-center rounded-[9px] py-2.5 ${
                inventoryType === tab.id ? 'bg-[#C2410C]' : ''
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${
                  inventoryType === tab.id ? 'text-white' : 'text-[#64748B]'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {inventoryType === 'combos' ? (
          <View className="mb-3 flex-row rounded-[12px] border border-[#BFDBFE] bg-[#EFF6FF] p-3">
            <Boxes size={17} color="#1D4ED8" />
            <Text className="ml-2 flex-1 text-[10px] leading-[16px] text-[#1E40AF]">
              Combo availability is calculated from its component products.
              Restock those products in Single Products.
            </Text>
          </View>
        ) : null}

        <View className="mb-3 flex-row items-center justify-between rounded-[14px] border border-[#FDE68A] bg-[#FFFBEB] px-3 py-3">
          <View className="mr-3 flex-1">
            <Text className="text-[11px] font-black text-[#78350F]">
              Negative stock permission
            </Text>
            <Text className="mt-1 text-[9px] leading-[14px] text-[#78716C]">
              Allow invoices to exceed available stock.
            </Text>
          </View>
          {loadingSetting ? (
            <ActivityIndicator size="small" color="#F97316" />
          ) : (
            <View className="items-end">
              <Text className="mb-1 text-[9px] font-semibold text-[#64748B]">
                {allowNegativeStock ? 'Enabled' : 'Disabled'}
              </Text>
              <Switch
                value={allowNegativeStock}
                onValueChange={updateNegativeStockSetting}
                disabled={savingSetting}
                trackColor={{ false: '#CBD5E1', true: '#FDBA74' }}
                thumbColor={allowNegativeStock ? '#EA580C' : '#F8FAFC'}
              />
            </View>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
        >
          {currentStats.map(stat => {
            const StatIcon = stat.icon;
            return (
              <View
                key={stat.label}
                className="relative mr-3 h-[112px] w-[178px] justify-center overflow-hidden rounded-[15px] border border-[#FCE6D7] bg-white pl-3 pr-2 shadow-sm elevation-[2]"
              >
                <View
                  className="absolute left-0 top-[14px] h-[82px] w-[4px] rounded-r-full"
                  style={{ backgroundColor: stat.color }}
                />
                <View className="flex-row items-center">
                  <View
                    className="h-[42px] w-[42px] items-center justify-center rounded-[12px]"
                    style={{ backgroundColor: stat.color }}
                  >
                    <StatIcon size={20} color="#FFFFFF" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[10px] font-bold text-[#17191C]"
                    >
                      {stat.label}
                    </Text>
                    <Text className="text-[23px] font-black text-[#17191C]">
                      {loading ? '—' : stat.value}
                    </Text>
                    <Text className="text-[9px] text-[#64748B]">
                      Inventory summary
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View className="mb-3 rounded-[15px] border border-[#E2E8F0] bg-white p-3">
          <View className="mb-3 h-[44px] flex-row items-center rounded-[11px] bg-[#F8FAFC] px-3">
            <Search size={17} color="#94A3B8" />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder={
                inventoryType === 'single'
                  ? 'Search product name, SKU...'
                  : 'Search combo name, SKU...'
              }
              placeholderTextColor="#94A3B8"
              className="ml-2 flex-1 text-[11px] text-[#17191C]"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh inventory"
              onPress={() => setRefreshKey(value => value + 1)}
              className="ml-2 h-[32px] w-[32px] items-center justify-center rounded-[9px]"
            >
              <RefreshCw size={16} color="#C2410C" />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {visibleFilters.map(filter => (
              <Pressable
                key={filter}
                onPress={() => setStockFilter(filter)}
                className={`mr-2 rounded-full border px-3 py-2 ${
                  stockFilter === filter
                    ? 'border-[#F97316] bg-[#FFF7ED]'
                    : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <Text
                  className={`text-[9px] font-bold ${
                    stockFilter === filter ? 'text-[#C2410C]' : 'text-[#64748B]'
                  }`}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View className="items-center rounded-[15px] bg-white py-10">
            <ActivityIndicator size="large" color="#F97316" />
            <Text className="mt-3 text-[11px] text-[#64748B]">
              Loading stock details...
            </Text>
          </View>
        ) : loadError ? (
          <View className="items-center rounded-[15px] bg-white px-5 py-8">
            <Text className="mb-4 text-center text-[11px] text-[#B91C1C]">
              {loadError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRefreshKey(value => value + 1)}
              className="rounded-[10px] bg-[#F97316] px-4 py-2.5"
            >
              <Text className="text-[10px] font-bold text-white">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View className="items-center rounded-[15px] bg-white py-10">
            <Package size={28} color="#CBD5E1" />
            <Text className="mt-3 text-[11px] font-semibold text-[#64748B]">
              No inventory items found.
            </Text>
          </View>
        ) : (
          items.map(item => {
            const stock = getStock(item);
            const status = getItemStatus(item);
            const statusColor = statusColors[status] ?? statusColors.Active;
            const imageUri = getInventoryImage(item);
            const itemCode =
              item.product_code || item.combo_code || `SKU${item.id}`;
            const price =
              item.offer_price ??
              item.discount_price ??
              item.selling_price ??
              item.mrp;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={
                  inventoryType === 'single'
                    ? `Update stock for ${item.name}`
                    : `View combo ${item.name}`
                }
                onPress={() => {
                  if (inventoryType === 'single') {
                    openUpdateModal(item);
                  } else {
                    setSelectedCombo(item);
                  }
                }}
                className="mb-3 rounded-[15px] border border-[#E2E8F0] bg-white p-3 shadow-sm"
              >
                <View className="flex-row">
                  <View className="mr-3 h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[12px] bg-[#F8FAFC]">
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        accessibilityLabel={`${item.name} image`}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Package size={25} color="#CBD5E1" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="pr-1 text-[12px] font-black text-[#17191C]"
                    >
                      {item.name}
                    </Text>
                    <Text className="mt-1 text-[9px] text-[#94A3B8]">
                      SKU: {itemCode}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="mt-1 text-[9px] text-[#64748B]"
                    >
                      {item.category || 'Uncategorized'}
                      {inventoryType === 'combos'
                        ? ` · ${item.combo_items?.length ?? 0} items`
                        : ''}
                    </Text>
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-[12px] font-black text-[#334155]">
                        {formatPrice(price)}
                      </Text>
                      <View
                        className="rounded-full px-2 py-1"
                        style={{ backgroundColor: statusColor.background }}
                      >
                        <Text
                          className="text-[8px] font-bold"
                          style={{ color: statusColor.foreground }}
                        >
                          {status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={17} color="#94A3B8" />
                </View>
                <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-3">
                  <View>
                    <Text className="text-[8px] text-[#94A3B8]">
                      {inventoryType === 'single'
                        ? 'Available stock'
                        : 'Available combo stock'}
                    </Text>
                    <Text className="mt-0.5 text-[14px] font-black text-[#17191C]">
                      {stock}
                    </Text>
                  </View>
                  {inventoryType === 'single' ? (
                    <View className="flex-row items-center">
                      <Text className="mr-2 text-[8px] text-[#64748B]">
                        Reserved {toNumber(item.reserved_stock)} · Damaged{' '}
                        {toNumber(item.damaged_stock)}
                      </Text>
                      <View className="rounded-[9px] bg-[#FFF7ED] px-3 py-2">
                        <Text className="text-[9px] font-bold text-[#C2410C]">
                          Update stock
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text className="text-[9px] font-semibold text-[#64748B]">
                      Tap to view contents
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}

        {!loading && !loadError && pagination.total > 0 ? (
          <View className="mt-1 flex-row items-center justify-between rounded-[13px] bg-white px-3 py-3">
            <Text className="text-[9px] text-[#64748B]">
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, pagination.total)} of{' '}
              {pagination.total}
            </Text>
            <View className="flex-row items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous inventory page"
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
                className="mr-2 h-[32px] w-[34px] items-center justify-center rounded-[8px] border border-[#E2E8F0] disabled:opacity-40"
              >
                <ChevronLeft size={17} color="#475569" />
              </Pressable>
              <Text className="mr-2 text-[9px] font-bold text-[#64748B]">
                {currentPage}/{totalPages}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next inventory page"
                disabled={currentPage >= totalPages}
                onPress={() =>
                  setCurrentPage(page => Math.min(totalPages, page + 1))
                }
                className="h-[32px] w-[34px] items-center justify-center rounded-[8px] border border-[#E2E8F0] disabled:opacity-40"
              >
                <ChevronRight size={17} color="#475569" />
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={selectedProduct !== null}
        transparent
        animationType="slide"
        onRequestClose={closeUpdateModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={stockSheetStyles.keyboardAvoiding}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View
              className="rounded-t-[22px] bg-white"
              style={stockSheetStyles.sheet}
            >
              <View className="flex-row items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
                <View className="flex-1">
                  <Text className="text-[15px] font-black text-[#17191C]">
                    Quick Stock Update
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="mt-1 text-[10px] font-bold text-[#C2410C]"
                  >
                    {selectedProduct?.name}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close stock update"
                  disabled={savingStock}
                  onPress={closeUpdateModal}
                  className="ml-3 h-[36px] w-[36px] items-center justify-center rounded-full bg-[#F1F5F9]"
                >
                  <Text className="text-[18px] text-[#64748B]">×</Text>
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="always"
                keyboardDismissMode={
                  Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                }
                nestedScrollEnabled
                style={stockSheetStyles.scroll}
                contentContainerClassName="px-5 py-4"
                contentContainerStyle={stockSheetStyles.scrollContent}
              >
                {loadingDetail ? (
                  <View className="items-center py-10">
                    <ActivityIndicator size="large" color="#F97316" />
                    <Text className="mt-3 text-[10px] text-[#64748B]">
                      Loading variants...
                    </Text>
                  </View>
                ) : selectedProduct && hasVariantStock(editedVariants) ? (
                  <View>
                    {editedVariants.map((variant, variantIndex) => {
                      const sizes = getVariantSizes(variant);
                      return (
                        <View
                          key={`${
                            variant.colorName ?? 'variant'
                          }-${variantIndex}`}
                          className="mb-3 rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                        >
                          <View className="mb-3 flex-row items-center">
                            <View
                              className="mr-2 h-[18px] w-[18px] rounded-full border border-[#CBD5E1]"
                              style={{
                                backgroundColor: variant.color || '#E2E8F0',
                              }}
                            />
                            <Text className="text-[11px] font-black text-[#334155]">
                              {variant.colorName ||
                                `Variant ${variantIndex + 1}`}
                            </Text>
                          </View>
                          {sizes.length ? (
                            sizes.map(([size, quantity]) => {
                              const key = `${variantIndex}-${size}`;
                              return (
                                <View
                                  key={key}
                                  className="mb-2 flex-row items-center justify-between rounded-[10px] bg-white px-3 py-2"
                                >
                                  <View>
                                    <Text className="text-[10px] font-bold text-[#334155]">
                                      {size}
                                    </Text>
                                    <Text className="mt-1 text-[8px] text-[#94A3B8]">
                                      Current: {toNumber(quantity)}
                                    </Text>
                                  </View>
                                  <TextInput
                                    accessibilityLabel={`Add stock for ${
                                      variant.colorName || 'variant'
                                    } ${size}`}
                                    value={variantAdditions[key] ?? ''}
                                    onChangeText={value =>
                                      updateVariantAddition(key, value)
                                    }
                                    keyboardType="number-pad"
                                    placeholder="Add qty"
                                    placeholderTextColor="#94A3B8"
                                    className="h-[38px] w-[92px] rounded-[9px] border border-[#E2E8F0] px-2 text-center text-[11px] font-bold text-[#17191C]"
                                  />
                                </View>
                              );
                            })
                          ) : (
                            <View className="flex-row items-center justify-between rounded-[10px] bg-white px-3 py-2">
                              <View>
                                <Text className="text-[10px] font-bold text-[#334155]">
                                  Variant stock
                                </Text>
                                <Text className="mt-1 text-[8px] text-[#94A3B8]">
                                  Current:{' '}
                                  {toNumber(
                                    variant.stock ?? variant.total_stock,
                                  )}
                                </Text>
                              </View>
                              <TextInput
                                accessibilityLabel={`Add stock for ${
                                  variant.colorName || 'variant'
                                }`}
                                value={
                                  variantAdditions[`${variantIndex}-variant`] ??
                                  ''
                                }
                                onChangeText={value =>
                                  updateVariantAddition(
                                    `${variantIndex}-variant`,
                                    value,
                                  )
                                }
                                keyboardType="number-pad"
                                placeholder="Add qty"
                                placeholderTextColor="#94A3B8"
                                className="h-[38px] w-[92px] rounded-[9px] border border-[#E2E8F0] px-2 text-center text-[11px] font-bold text-[#17191C]"
                              />
                            </View>
                          )}
                        </View>
                      );
                    })}
                    <Text className="mb-3 rounded-[10px] bg-[#FFF7ED] px-3 py-2 text-center text-[9px] text-[#9A3412]">
                      Available stock increases by the combined quantity added
                      to variants.
                    </Text>
                  </View>
                ) : (
                  <View className="rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <View className="mb-3 flex-row items-center justify-between">
                      <Text className="text-[10px] font-black uppercase text-[#64748B]">
                        Add to current stock
                      </Text>
                      <Text className="rounded-full bg-[#E2E8F0] px-2 py-1 text-[9px] font-bold text-[#475569]">
                        Current:{' '}
                        {toNumber(
                          selectedProduct?.available_stock ??
                            selectedProduct?.total_stock,
                        )}
                      </Text>
                    </View>
                    <TextInput
                      accessibilityLabel="Quantity to add to stock"
                      value={manualQuantity}
                      onChangeText={value =>
                        setManualQuantity(value.replace(/[^\d]/g, ''))
                      }
                      keyboardType="number-pad"
                      placeholder="Enter quantity to add"
                      placeholderTextColor="#94A3B8"
                      className="h-[50px] rounded-[11px] border border-[#E2E8F0] bg-white px-4 text-[16px] font-black text-[#17191C]"
                    />
                    <Text className="mt-2 text-[9px] text-[#94A3B8]">
                      The new total will be current stock plus the quantity
                      entered.
                    </Text>
                  </View>
                )}
              </ScrollView>
              <View
                className="flex-row justify-end border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 pt-4"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
              >
                <Pressable
                  accessibilityRole="button"
                  disabled={savingStock}
                  onPress={closeUpdateModal}
                  className="mr-2 rounded-[10px] px-4 py-3"
                >
                  <Text className="text-[10px] font-bold text-[#64748B]">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={savingStock || loadingDetail}
                  onPress={saveStock}
                  className="min-w-[130px] flex-row items-center justify-center rounded-[10px] bg-[#C2410C] px-4 py-3 disabled:opacity-60"
                >
                  {savingStock ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-[10px] font-bold text-white">
                      Save stock
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={selectedCombo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCombo(null)}
      >
        <View className="flex-1 justify-center bg-black/60 px-5">
          <View className="rounded-[18px] bg-white p-5">
            <Text className="text-[15px] font-black text-[#17191C]">
              {selectedCombo?.name}
            </Text>
            <Text className="mb-4 mt-1 text-[10px] text-[#64748B]">
              Combo stock is based on its component products.
            </Text>
            {(selectedCombo?.combo_items ?? []).length ? (
              selectedCombo?.combo_items?.map((component, index) => (
                <View
                  key={`${component.product_id ?? index}-${index}`}
                  className="flex-row justify-between border-t border-[#F1F5F9] py-3"
                >
                  <Text className="flex-1 text-[10px] text-[#475569]">
                    {component.product_name || component.name || 'Product'}
                  </Text>
                  <Text className="ml-3 text-[10px] font-bold text-[#334155]">
                    Qty {toNumber(component.quantity, 1)}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="py-3 text-[10px] text-[#94A3B8]">
                No combo components are available.
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedCombo(null)}
              className="mt-3 h-[42px] items-center justify-center rounded-[10px] bg-[#C2410C]"
            >
              <Text className="text-[11px] font-bold text-white">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
