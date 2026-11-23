import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Armchair,
  Clock,
  IndianRupee,
  Package,
  ShoppingBag,
  Tag,
  Truck,
  Users,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, {
  API_BASE_URL,
  invalidateApiResponseCache,
} from '../../api';

const DASHBOARD_BANNER_ASPECT_RATIO = 2170 / 725;

type HomeProps = {
  onActionPress?: (label: string) => void;
  onScrollVisibilityChange?: (visible: boolean) => void;
};

type DashboardProduct = {
  id?: number | string;
  name?: string;
  product_code?: string;
  selling_price?: number | string | null;
  offer_price?: number | string | null;
  mrp?: number | string | null;
  status?: string;
  inventory_status?: string;
  available_stock?: number | string | null;
  total_stock?: number | string | null;
  stock?: number | string | null;
  minimum_stock?: number | string | null;
  images?: string[] | null;
  main_image_index?: number | string | null;
  variants?: Array<{ image?: string | null }>;
};

type ProductsResponse = {
  products: DashboardProduct[];
  pagination?: {
    totalPages?: number | string;
  };
  stats?: {
    total?: number;
  };
};

type DashboardOrder = {
  id: number | string;
  order_id?: string;
  customer_name?: string;
  customer_email?: string;
  total_amount?: number | string;
  status?: string;
  created_at?: string;
  items?: DashboardOrderItem[];
};

type DashboardOrderItem = {
  product_id?: number | string | null;
  product_name?: string;
  item_type?: string;
  combo_id?: number | string | null;
  quantity?: number | string | null;
  qty?: number | string | null;
  count?: number | string | null;
  name?: string;
  product?: {
    id?: number | string | null;
    name?: string;
  };
};

type DashboardUser = {
  role?: string;
  user_type?: string;
  account_type?: string;
  status?: string;
  account_status?: string;
  is_active?: boolean | number | string;
  active?: boolean | number | string;
};

type DashboardUsersResponse = {
  users?: DashboardUser[];
  data?: DashboardUser[];
  pagination?: {
    totalPages?: number | string;
  };
};

type DashboardOffer = {
  status?: string;
  is_active?: boolean | number | string;
  active?: boolean | number | string;
  starts_at?: string;
  ends_at?: string;
  start_date?: string;
  end_date?: string;
  valid_from?: string;
  valid_until?: string;
};

type DashboardOffersResponse = {
  offers?: DashboardOffer[];
  data?: DashboardOffer[];
};

type DashboardMetricIcon =
  | 'products'
  | 'orders'
  | 'revenue'
  | 'pending'
  | 'transit'
  | 'customers'
  | 'stock'
  | 'offers';

type DashboardMetric = {
  label: string;
  description: string;
  value: number | string;
  color: string;
  borderColor: string;
  watermarkColor: string;
  icon: DashboardMetricIcon;
};

type TopSellingProduct = {
  key: string;
  name: string;
  quantity: number;
  price: number;
  imageUri: string | undefined;
};

function DashboardIcon({
  name,
  size,
  color,
}: {
  name: DashboardMetricIcon;
  size: number;
  color: string;
}) {
  const props = { size, color, strokeWidth: 2.5 };
  switch (name) {
    case 'products':
      return <ShoppingBag {...props} />;
    case 'orders':
      return <Armchair {...props} />;
    case 'revenue':
      return <IndianRupee {...props} />;
    case 'pending':
      return <Clock {...props} />;
    case 'transit':
      return <Truck {...props} />;
    case 'customers':
      return <Users {...props} />;
    case 'stock':
      return <Package {...props} />;
    case 'offers':
      return <Tag {...props} />;
  }
}

const quickActions = [
  { label: 'Add Product', icon: '＋', color: '#F59E0B' },
  { label: 'New Order', icon: '▤', color: '#3B82F6' },
  { label: 'Categories', icon: '▦', color: '#10B981' },
  { label: 'Customers', icon: '♙', color: '#8B5CF6' },
  { label: 'Stock', icon: '⚠', color: '#F59E0B' },
];

const statusOverview = [
  { label: 'Placed', statuses: ['order placed', 'new'], color: '#FBBF24' },
  { label: 'Confirmed', statuses: ['processing'], color: '#3B82F6' },
  { label: 'Packed', statuses: ['packing'], color: '#A855F7' },
  { label: 'Shipped', statuses: ['shipping', 'shipped', 'out for delivery'], color: '#F97316' },
  { label: 'Delivered', statuses: ['delivered'], color: '#10B981' },
];

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const formatDashboardRevenue = (value: number) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
};

const formatOrderId = (order: DashboardOrder) =>
  order.order_id || `ORD${String(order.id).padStart(4, '0')}`;

const getProductKey = (id?: number | string | null, name?: string) => {
  if (id != null) return `id:${id}`;
  const normalizedName = name?.trim().toLowerCase();
  return normalizedName ? `name:${normalizedName}` : null;
};

const resolveProductImage = (product: DashboardProduct) => {
  const images = product.images ?? [];
  const requestedIndex = toNumber(product.main_image_index);
  const index =
    Number.isInteger(requestedIndex) &&
    requestedIndex >= 0 &&
    requestedIndex < images.length
      ? requestedIndex
      : 0;
  const path =
    images[index] ??
    images[0] ??
    product.variants?.find(variant => variant.image)?.image;
  if (!path?.trim()) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${apiOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
};

const normalizeStatus = (status?: string) => (status ?? '').trim().toLowerCase();

const getListData = <T,>(
  response: T[] | { users?: T[]; offers?: T[]; data?: T[] } | undefined,
  key: 'users' | 'offers',
): T[] => {
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response[key])) return response[key];
  if (response && Array.isArray(response.data)) return response.data;
  throw new Error(`The ${key} response did not contain a list.`);
};

const isActiveCustomer = (user: DashboardUser) => {
  const role = (user.role ?? user.user_type ?? user.account_type ?? '')
    .trim()
    .toLowerCase();
  const status = (user.account_status ?? user.status ?? '').trim().toLowerCase();
  const customerRole = !role || ['customer', 'user', 'client'].includes(role);
  const activeFlag = user.is_active ?? user.active;
  const active = activeFlag === undefined
    ? !['inactive', 'disabled'].includes(status)
    : activeFlag === true ||
      activeFlag === 1 ||
      ['1', 'true'].includes(String(activeFlag).trim().toLowerCase());
  return customerRole && active && (!status || ['active', 'enabled'].includes(status));
};

const isActiveOffer = (offer: DashboardOffer, now: number) => {
  const activeFlag = offer.is_active ?? offer.active;
  const normalizedFlag =
    typeof activeFlag === 'string' ? activeFlag.trim().toLowerCase() : activeFlag;
  if (normalizedFlag === false || normalizedFlag === 0 || normalizedFlag === '0' || normalizedFlag === 'false') {
    return false;
  }
  const flagMarksActive =
    normalizedFlag === true ||
    normalizedFlag === 1 ||
    normalizedFlag === '1' ||
    normalizedFlag === 'true';
  if (!flagMarksActive && normalizeStatus(offer.status) !== 'active') {
    return false;
  }

  const start = offer.starts_at ?? offer.start_date ?? offer.valid_from;
  const end = offer.ends_at ?? offer.end_date ?? offer.valid_until;
  const startsAt = start ? new Date(start).getTime() : Number.NEGATIVE_INFINITY;
  const endDate = end ? new Date(end) : null;
  if (end && /^\d{4}-\d{2}-\d{2}$/.test(end) && endDate) {
    endDate.setHours(23, 59, 59, 999);
  }
  const endsAt = endDate ? endDate.getTime() : Number.POSITIVE_INFINITY;
  return (
    (!start || (!Number.isNaN(startsAt) && startsAt <= now)) &&
    (!end || (!Number.isNaN(endsAt) && endsAt >= now))
  );
};

export default function Home({
  onActionPress,
  onScrollVisibilityChange,
}: HomeProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const dashboardBannerWidth = screenWidth - 24;
  const dashboardBannerHeight =
    dashboardBannerWidth / DASHBOARD_BANNER_ASPECT_RATIO;
  const lastScrollY = useRef(0);
  const hasLoadedDashboard = useRef(false);
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [customers, setCustomers] = useState<DashboardUser[]>([]);
  const [offers, setOffers] = useState<DashboardOffer[]>([]);
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const loadDashboard = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      invalidateApiResponseCache();
    } else if (!hasLoadedDashboard.current) {
      setLoading(true);
    }
    setLoadError(null);

    try {
      const productParams = {
        limit: 10,
        search: '',
        status: 'All',
        exclude_combo_products: true,
        page: 1,
      };
      const [productsResponse, ordersResponse, customersResponse, offersResponse] =
        await Promise.all([
        api.get<ProductsResponse>('/products', { params: productParams }),
        api.get<DashboardOrder[]>('/orders', { params: { status: 'All' } }),
        api.get<DashboardUsersResponse | DashboardUser[]>('/users', {
          params: { page: 1, limit: 100 },
        }),
        api.get<DashboardOffersResponse | DashboardOffer[]>('/offers'),
      ]);

      if (!Array.isArray(productsResponse.data?.products)) {
        throw new Error('The products response did not contain a product list.');
      }
      if (!Array.isArray(ordersResponse.data)) {
        throw new Error('The orders response did not contain an order list.');
      }
      const allCustomers = getListData(customersResponse.data, 'users');
      const offerList = getListData(offersResponse.data, 'offers');
      const customerPagination = Array.isArray(customersResponse.data)
        ? undefined
        : customersResponse.data.pagination;
      const customerTotalPages = Math.max(
        1,
        toNumber(customerPagination?.totalPages, 1),
      );
      for (let page = 2; page <= customerTotalPages; page += 1) {
        const pageResponse = await api.get<
          DashboardUsersResponse | DashboardUser[]
        >('/users', { params: { page, limit: 100 } });
        allCustomers.push(...getListData(pageResponse.data, 'users'));
      }

      const allProducts = [...productsResponse.data.products];
      const totalPages = Math.max(
        1,
        toNumber(productsResponse.data.pagination?.totalPages, 1),
      );
      for (let page = 2; page <= totalPages; page += 1) {
        const pageResponse = await api.get<ProductsResponse>('/products', {
          params: { ...productParams, page },
        });
        if (!Array.isArray(pageResponse.data?.products)) {
          throw new Error(`The products response for page ${page} was invalid.`);
        }
        allProducts.push(...pageResponse.data.products);
      }

      setProducts(allProducts);
      setTotalProductCount(
        toNumber(productsResponse.data.stats?.total, allProducts.length),
      );
      setOrders(ordersResponse.data);
      setCustomers(allCustomers);
      setOffers(offerList);
      hasLoadedDashboard.current = true;
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Unable to load dashboard data. Please try again.';
      setLoadError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const lowStockProducts = useMemo(
    () =>
      products.filter(product => {
        const stock = toNumber(
          product.available_stock ?? product.total_stock ?? product.stock,
        );
        const minimumStock = toNumber(product.minimum_stock, 10);
        const status = `${product.status ?? ''} ${product.inventory_status ?? ''}`.toLowerCase();
        return (
          status.includes('out of stock') ||
          status.includes('low stock') ||
          stock <= minimumStock
        );
      }),
    [products],
  );

  const topSellingProducts = useMemo<TopSellingProduct[]>(() => {
    const soldByProduct = new Map<string, number>();

    orders.forEach(order => {
      if (normalizeStatus(order.status) === 'cancelled') return;
      (order.items ?? []).forEach(item => {
        if (
          normalizeStatus(item.item_type) === 'combo' ||
          item.combo_id != null
        ) {
          return;
        }
        const key = getProductKey(
          item.product_id ?? item.product?.id,
          item.product_name ?? item.product?.name ?? item.name,
        );
        if (!key) return;
        const quantity = Math.max(
          1,
          toNumber(item.quantity ?? item.qty ?? item.count, 1),
        );
        soldByProduct.set(key, (soldByProduct.get(key) ?? 0) + quantity);
      });
    });

    return products
      .map(product => {
        const idKey = getProductKey(product.id ?? product.product_code);
        const nameKey = getProductKey(undefined, product.name);
        const quantity =
          (idKey ? soldByProduct.get(idKey) : undefined) ??
          (nameKey ? soldByProduct.get(nameKey) : undefined) ??
          0;
        if (quantity === 0) return null;

        return {
          key: idKey ?? nameKey ?? product.name ?? 'product',
          name: product.name ?? 'Unnamed product',
          quantity,
          price: toNumber(
            product.selling_price ?? product.offer_price ?? product.mrp,
          ),
          imageUri: resolveProductImage(product),
        };
      })
      .filter((product): product is TopSellingProduct => product !== null)
      .sort((first, second) => second.quantity - first.quantity)
      .slice(0, 5);
  }, [orders, products]);

  const dashboardStats = useMemo<DashboardMetric[]>(() => {
    const activeOrders = orders.filter(
      order => normalizeStatus(order.status) !== 'cancelled',
    );
    const revenue = activeOrders.reduce(
      (total, order) => total + toNumber(order.total_amount),
      0,
    );
    const pendingOrders = orders.filter(order =>
      ['order placed', 'new', 'processing', 'packing'].includes(
        normalizeStatus(order.status),
      ),
    ).length;
    const ordersInTransit = orders.filter(order =>
      ['shipping', 'shipped', 'out for delivery'].includes(
        normalizeStatus(order.status),
      ),
    ).length;
    const activeCustomerCount = customers.filter(isActiveCustomer).length;
    const activeOfferCount = offers.filter(offer =>
      isActiveOffer(offer, Date.now()),
    ).length;
    const style = [
      { color: '#F97316', borderColor: '#FCE6D7', watermarkColor: '#FFF0E3' },
      { color: '#10B981', borderColor: '#D5F5E9', watermarkColor: '#DDF8ED' },
      { color: '#F59E0B', borderColor: '#FDECC8', watermarkColor: '#FFF4D8' },
      { color: '#F43F5E', borderColor: '#FFE0E7', watermarkColor: '#FFE9EE' },
      { color: '#3B82F6', borderColor: '#DBEAFE', watermarkColor: '#E8F1FF' },
      { color: '#06B6D4', borderColor: '#CFFAFE', watermarkColor: '#E0FBFE' },
      { color: '#A855F7', borderColor: '#F0DFFF', watermarkColor: '#F6ECFF' },
      { color: '#8B5CF6', borderColor: '#E9DDFF', watermarkColor: '#F1EAFF' },
    ];

    return [
      { label: 'Products', description: 'Items in your catalog', value: totalProductCount, icon: 'products', ...style[0] },
      { label: 'Orders', description: 'All recorded orders', value: orders.length, icon: 'orders', ...style[1] },
      { label: 'Revenue', description: 'Excluding cancelled orders', value: formatDashboardRevenue(revenue), icon: 'revenue', ...style[2] },
      { label: 'Pending Orders', description: 'Awaiting fulfillment', value: pendingOrders, icon: 'pending', ...style[3] },
      { label: 'Orders in Transit', description: 'Shipping or out for delivery', value: ordersInTransit, icon: 'transit', ...style[4] },
      { label: 'Customers', description: 'Active customer accounts', value: activeCustomerCount, icon: 'customers', ...style[5] },
      { label: 'Low Stock', description: 'At or below reorder level', value: lowStockProducts.length, icon: 'stock', ...style[6] },
      { label: 'Active Offers', description: 'Currently active promotions', value: activeOfferCount, icon: 'offers', ...style[7] },
    ];
  }, [customers, lowStockProducts.length, offers, orders, totalProductCount]);

  const orderStatusSummary = useMemo(
    () =>
      statusOverview.map(item => ({
        ...item,
        count: orders.filter(order =>
          item.statuses.includes((order.status ?? '').toLowerCase()),
        ).length,
      })),
    [orders],
  );
  const maxOrderStatusCount = Math.max(
    1,
    ...orderStatusSummary.map(item => item.count),
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (first, second) =>
            new Date(second.created_at ?? 0).getTime() -
            new Date(first.created_at ?? 0).getTime(),
        )
        .slice(0, 3),
    [orders],
  );

  const salesByDay = useMemo(() => {
    const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const total = orders
        .filter(order => {
          const createdAt = order.created_at ? new Date(order.created_at) : null;
          return (
            createdAt !== null &&
            !Number.isNaN(createdAt.getTime()) &&
            createdAt.toDateString() === date.toDateString()
          );
        })
        .reduce((sum, order) => sum + toNumber(order.total_amount), 0);
      return {
        key: date.toISOString(),
        label: date.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1),
        total,
      };
    });
    const maxTotal = Math.max(1, ...lastSevenDays.map(day => day.total));

    return lastSevenDays.map(day => ({
      ...day,
      height: day.total === 0 ? 8 : (day.total / maxTotal) * 94,
    }));
  }, [orders]);

  return (
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadDashboard(true)}
          tintColor="#F97316"
          colors={['#F97316']}
        />
      }
      contentContainerClassName="px-3 pb-[255px]"
      style={{ paddingTop: insets.top + 84 }}>
      <View
        style={{
          width: dashboardBannerWidth,
          height: dashboardBannerHeight,
        }}
        className="mb-4 justify-center overflow-hidden rounded-[22px] px-5 py-3">
        <Image
          source={require('../../Assert/images/welcome.png')}
          resizeMode="contain"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        />
        <Text className="text-[12px] font-bold uppercase tracking-[2px] text-[#FFD45A]">
          Admin dashboard
        </Text>
        <Text className="mt-1 text-[24px] font-black text-white">
          {greeting}!
        </Text>
        <Text className="mt-1 text-[13px] text-white/75">
          Here’s what’s happening with your store today.
        </Text>
      </View>

      {loadError ? (
        <View className="mb-4 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-4">
          <Text className="mb-2 text-[13px] font-semibold text-[#B91C1C]">
            {loadError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => loadDashboard()}
            className="self-start rounded-[8px] bg-[#DC2626] px-3 py-2">
            <Text className="text-[12px] font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <View className="mb-4 flex-row flex-wrap justify-between">
        {dashboardStats.map(stat => (
          <View
            key={stat.label}
            className="relative mb-3 h-[118px] w-[49%] justify-center overflow-hidden rounded-[16px] border bg-white pl-3 pr-2 shadow-sm elevation-[3]"
            style={{ borderColor: stat.borderColor }}>
            <View
              className="absolute left-0 top-[16px] h-[86px] w-[4px] rounded-r-full"
              style={{ backgroundColor: stat.color }}
            />
            <View className="absolute bottom-1 right-1">
              <DashboardIcon
                name={stat.icon}
                size={48}
                color={stat.watermarkColor}
              />
            </View>
            <View className="flex-row items-center">
              <View
                className="h-[48px] w-[48px] items-center justify-center rounded-[12px] shadow-sm elevation-[3]"
                style={{ backgroundColor: stat.color }}>
                <DashboardIcon name={stat.icon} size={23} color="#FFFFFF" />
              </View>
              <View className="ml-3 flex-1">
                <Text numberOfLines={2} className="text-[13px] font-bold text-[#17191C]">
                  {stat.label}
                </Text>
                <Text className="text-[24px] font-black leading-[29px] text-[#17191C]">
                  {loading ? '—' : stat.value}
                </Text>
                <Text numberOfLines={2} className="text-[10px] text-[#64748B]">
                  {stat.description}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {lowStockProducts.length > 0 ? (
        <View className="mb-4 rounded-[18px] border border-[#F4D89A] bg-[#F8F9FA] px-4 py-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => onActionPress?.('Low Stock')}
            className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="mr-3 text-[18px] text-[#D97706]">⚠</Text>
              <Text className="text-[13px] font-bold text-[#92400E]">
                {lowStockProducts.length} {lowStockProducts.length === 1 ? 'product needs' : 'products need'} restocking
              </Text>
            </View>
            <Text className="text-[13px] font-black text-[#B45309]">Review →</Text>
          </Pressable>
        </View>
      ) : null}

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Sales Overview
          </Text>
          <View className="rounded-full bg-[#F8F9FA] px-3 py-1.5">
            <Text className="text-[11px] font-bold text-[#A16207]">
              This Week
            </Text>
          </View>
        </View>
        <View className="h-[150px] flex-row items-end justify-between px-1">
          {salesByDay.map(day => (
            <View key={day.key} className="items-center">
              <View
                className="w-[26px] rounded-t-[8px] bg-[#F59E0B]"
                style={{ height: day.height }}
              />
              <Text className="mt-2 text-[10px] font-bold text-[#94A3B8]">
                {day.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <Text className="mb-4 text-[17px] font-black text-[#17191C]">
          Orders Overview
        </Text>
        {orderStatusSummary.map(item => (
          <View key={item.label} className="mb-3">
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-[12px] font-semibold text-[#64748B]">
                {item.label}
              </Text>
              <Text className="text-[12px] font-black text-[#17191C]">
                {item.count}
              </Text>
            </View>
            <View className="h-[7px] overflow-hidden rounded-full bg-[#EDF2F4]">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${item.count === 0 ? 0 : Math.max(6, (item.count / maxOrderStatusCount) * 100)}%`,
                  backgroundColor: item.color,
                }}
              />
            </View>
          </View>
        ))}
      </View>

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Quick Actions
          </Text>
          <Text className="text-[11px] font-bold text-[#A16207]">
            5 shortcuts
          </Text>
        </View>
        <View className="flex-row flex-wrap justify-between">
          {quickActions.map(action => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              onPress={() => onActionPress?.(action.label)}
              className="mb-3 h-[88px] w-[31%] items-center justify-center rounded-[16px] border border-[#ECE8DF] bg-[#FFFCF7]"
              style={({ pressed }) => (pressed ? { opacity: 0.65 } : null)}>
              <View
                className="mb-2 h-[38px] w-[38px] items-center justify-center rounded-[12px]"
                style={{ backgroundColor: action.color }}>
                <Text className="text-[18px] font-black text-white">
                  {action.icon}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                className="px-1 text-[10px] font-bold text-[#17191C]">
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Top Selling Products
          </Text>
          <Text className="text-[11px] font-bold text-[#A16207]">Top 5</Text>
        </View>
        {loading ? (
          <ActivityIndicator color="#F97316" />
        ) : topSellingProducts.length > 0 ? (
          topSellingProducts.map((product, index) => (
            <View
              key={product.key}
              className={`flex-row items-center py-3 ${
                index < topSellingProducts.length - 1
                  ? 'border-b border-[#F1F5F9]'
                  : ''
              }`}>
              <Image
                source={
                  product.imageUri
                    ? { uri: product.imageUri }
                    : require('../../Assert/images/Cozy Mustard Armchair Living Room.png')
                }
                accessibilityLabel={`${product.name} image`}
                resizeMode="cover"
                className="mr-3 h-[56px] w-[56px] rounded-[12px] bg-[#FFF7ED]"
              />
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-[13px] font-bold text-[#17191C]">
                  {product.name}
                </Text>
                <Text className="mt-1 text-[11px] text-[#64748B]">
                  Sold {product.quantity}{' '}
                  {product.quantity === 1 ? 'unit' : 'units'}
                </Text>
              </View>
              <Text className="ml-2 text-[12px] font-black text-[#17191C]">
                {formatCurrency(product.price)}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-[12px] text-[#64748B]">
            No product sales found yet.
          </Text>
        )}
      </View>

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Low Stock Alert
          </Text>
          <Pressable onPress={() => onActionPress?.('View Stock')}>
            <Text className="text-[12px] font-bold text-[#7C3AED]">
              View All
            </Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color="#F97316" />
        ) : lowStockProducts.length > 0 ? (
          lowStockProducts.slice(0, 3).map(item => (
            <View
              key={item.id ?? item.name}
              className="mb-3 flex-row items-center rounded-[12px] bg-[#FFFBF5] p-3">
              <View className="mr-3 h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#FFE8C2]">
                <Text className="text-[18px]">▣</Text>
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="text-[13px] font-bold text-[#17191C]">
                  {item.name || 'Unnamed product'}
                </Text>
                <Text className="mt-1 text-[11px] text-[#94A3B8]">
                  Stock:{' '}
                  <Text className="font-black text-[#EF4444]">
                    {toNumber(item.available_stock ?? item.total_stock ?? item.stock)}
                  </Text>
                </Text>
              </View>
              <View className="rounded-full bg-[#FEE2E2] px-2 py-1">
                <Text className="text-[9px] font-bold text-[#EF4444]">
                  Low Stock
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-[12px] text-[#64748B]">
            No low-stock products found.
          </Text>
        )}
      </View>

      <View className="rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Recent Orders
          </Text>
          <Pressable onPress={() => onActionPress?.('View Orders')}>
            <Text className="text-[12px] font-bold text-[#F59E0B]">
              View All →
            </Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color="#F97316" />
        ) : recentOrders.length > 0 ? (
          recentOrders.map(order => {
            const customer = order.customer_name || order.customer_email || 'Customer';
            const status = order.status || 'Unknown';
            const createdAt = order.created_at ? new Date(order.created_at) : null;
            const date =
              createdAt && !Number.isNaN(createdAt.getTime())
                ? createdAt.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Date unavailable';
            const statusColor =
              statusOverview.find(item =>
                item.statuses.includes(status.toLowerCase()),
              )?.color ?? '#64748B';

            return (
              <Pressable
                key={order.id}
                onPress={() => onActionPress?.(formatOrderId(order))}
                className="mb-3 flex-row items-center border-b border-[#F1F5F9] pb-3">
                <View className="mr-3 h-[38px] w-[38px] items-center justify-center rounded-full bg-[#FFF1D6]">
                  <Text className="text-[13px] font-black text-[#B45309]">
                    {customer.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-black text-[#17191C]">
                    {formatOrderId(order)}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-[#94A3B8]">
                    {customer} • {date}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[12px] font-black text-[#17191C]">
                    {formatCurrency(toNumber(order.total_amount))}
                  </Text>
                  <Text
                    className="mt-1 text-[10px] font-bold"
                    style={{ color: statusColor }}>
                    {status}
                  </Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text className="text-[12px] text-[#64748B]">
            No orders found.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}