import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Check,
  ChevronDown,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../api';
import TopHeader from '../Navigation/TopHeader';

type ProductVariant = {
  color?: string;
  colorName?: string;
  images?: string[] | string;
  image?: string;
  sizesStock?: Record<string, number | string>;
  selectedSizes?: string[];
  size?: string;
  stock?: number | string;
  selling_price?: number | string;
  offer_price?: number | string;
  mrp?: number | string;
};

type CatalogProduct = {
  id: number | string;
  name: string;
  product_code?: string;
  category?: string;
  description?: string;
  status?: string;
  product_type?: string;
  stock?: number | string;
  total_stock?: number | string;
  available_stock?: number | string;
  selling_price?: number | string;
  offer_price?: number | string;
  price?: number | string;
  image?: string;
  images?: string[] | string;
  main_image_index?: number | string;
  variants?: ProductVariant[] | string;
};

type CatalogCombo = {
  id: number | string;
  name: string;
  combo_code?: string;
  status?: string;
  stock?: number | string;
  total_stock?: number | string;
  available_stock?: number | string;
  selling_price?: number | string;
  offer_price?: number | string;
  price?: number | string;
  mrp?: number | string;
  image?: string;
  images?: string[] | string;
  main_image_index?: number | string;
  combo_items?: Array<Record<string, unknown>> | string;
};

type CatalogResponse = {
  products?: CatalogProduct[];
  combos?: CatalogCombo[];
  pagination?: { totalPages?: number | string };
};

type Category = {
  id: number | string;
  name: string;
};

type Customer = {
  id?: number | string;
  user_id?: number | string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  street_address?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  zip_code?: string;
};

type CartLine = {
  key: string;
  item_type: 'product' | 'combo';
  product_id?: number | string;
  combo_id?: number | string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  variant_color?: string;
  variant_size?: string;
  image?: string;
  combo_items?: Array<Record<string, unknown>>;
  stockLimit: number;
};

type BillForm = {
  user_id: number | string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  street_address: string;
  city: string;
  district: string;
  state: string;
  country: string;
  zip_code: string;
  payment_method: 'Cash' | 'UPI' | 'Card';
  status:
    | 'Order Placed'
    | 'Packing'
    | 'Shipping'
    | 'Out for Delivery'
    | 'Delivered'
    | 'Cancelled';
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
};

type GstSettings = {
  gst_enabled: boolean;
  gst_rate: number;
};

type CreateBillProps = {
  onBackPress: () => void;
  onOrderCreated: () => void;
};

const initialForm: BillForm = {
  user_id: '',
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  address: '',
  street_address: '',
  city: '',
  district: '',
  state: '',
  country: 'India',
  zip_code: '',
  payment_method: 'Cash',
  status: 'Delivered',
  discount_type: 'percentage',
  discount_value: '0',
};

const orderStatuses: BillForm['status'][] = [
  'Order Placed',
  'Packing',
  'Shipping',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const parseArray = <T,>(value: T[] | string | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [value as T];
  } catch {
    return [value as T];
  }
};

const resolveImage = (image?: string | string[]) => {
  const value = Array.isArray(image) ? image[0] : image;
  if (!value) return undefined;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  const cleanPath = value.replace(/\\/g, '/');
  return `${origin}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const getProductVariants = (product: CatalogProduct): ProductVariant[] =>
  parseArray<ProductVariant>(product.variants);

const getStock = (item: {
  available_stock?: number | string;
  total_stock?: number | string;
  stock?: number | string;
}) => toNumber(item.available_stock ?? item.total_stock ?? item.stock);

const getPrice = (item: {
  selling_price?: number | string;
  offer_price?: number | string;
  price?: number | string;
}) => toNumber(item.selling_price ?? item.offer_price ?? item.price);

const apiError = (error: unknown, fallback: string) => {
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
  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};

const calculateTotals = (
  items: CartLine[],
  discountType: BillForm['discount_type'],
  discountValue: string,
  gstRate: number,
) => {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => sum + toNumber(item.total), 0),
  );
  const discount = Math.max(0, toNumber(discountValue));
  const discountAmount =
    discountType === 'percentage'
      ? Math.min(subtotal, roundCurrency((subtotal * discount) / 100))
      : Math.min(subtotal, roundCurrency(discount));
  const gstAmount = roundCurrency((subtotal * gstRate) / 100);
  return {
    subtotal,
    discount_amount: discountAmount,
    gst_amount: gstAmount,
    total_amount: roundCurrency(subtotal + gstAmount - discountAmount),
  };
};

async function fetchAllProducts() {
  const products: CatalogProduct[] = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const response = await api.get<CatalogResponse | CatalogProduct[]>(
      '/products',
      {
        params: {
          page,
          limit: 100,
          exclude_combo_products: true,
        },
      },
    );
    const data = response.data;
    const pageProducts = Array.isArray(data) ? data : data.products;
    if (!Array.isArray(pageProducts)) {
      throw new Error('The products response did not contain a product list.');
    }
    products.push(...pageProducts);
    if (page === 1 && !Array.isArray(data)) {
      totalPages = Math.max(1, toNumber(data.pagination?.totalPages, 1));
    }
  }
  return products;
}

async function fetchAllCombos() {
  const combos: CatalogCombo[] = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const response = await api.get<CatalogResponse>('/combos', {
      params: { page, limit: 100, status: 'Active' },
    });
    if (!Array.isArray(response.data.combos)) {
      throw new Error('The combos response did not contain a combo list.');
    }
    combos.push(...response.data.combos);
    if (page === 1) {
      totalPages = Math.max(
        1,
        toNumber(response.data.pagination?.totalPages, 1),
      );
    }
  }
  return combos;
}

export default function CreateBill({
  onBackPress,
  onOrderCreated,
}: CreateBillProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2>(1);
  const [catalogType, setCatalogType] = useState<'product' | 'combo'>(
    'product',
  );
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [combos, setCombos] = useState<CatalogCombo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [users, setUsers] = useState<Customer[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [gstSettings, setGstSettings] = useState<GstSettings | null>(null);
  const [gstError, setGstError] = useState<string | null>(null);
  const [gstReloadKey, setGstReloadKey] = useState(0);
  const [includeGst, setIncludeGst] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [form, setForm] = useState<BillForm>(initialForm);
  const [isGuest, setIsGuest] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [variantProduct, setVariantProduct] = useState<CatalogProduct | null>(
    null,
  );
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [selectedSize, setSelectedSize] = useState('');
  const [choiceModal, setChoiceModal] = useState<'payment' | 'status' | null>(
    null,
  );
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const [loadedProducts, loadedCombos, categoryResponse] =
          await Promise.all([
            fetchAllProducts(),
            fetchAllCombos(),
            api.get<Category[]>('/categories'),
          ]);
        if (!Array.isArray(categoryResponse.data)) {
          throw new Error(
            'The categories response did not contain a category list.',
          );
        }
        if (!active) return;
        setProducts(loadedProducts);
        setCombos(loadedCombos);
        setCategories(categoryResponse.data);
      } catch (error: unknown) {
        if (!active) return;
        setCatalogError(apiError(error, 'Could not load products and combos.'));
        if (__DEV__)
          console.warn('[CreateBill] Could not load catalog:', error);
      } finally {
        if (active) setCatalogLoading(false);
      }
    };
    loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get<{ gst_enabled?: boolean; gst_rate?: number | string }>(
        '/settings/gst',
      )
      .then(response => {
        const rate = Number(response.data.gst_rate);
        if (
          typeof response.data.gst_enabled !== 'boolean' ||
          !Number.isFinite(rate) ||
          rate < 0 ||
          rate > 100
        ) {
          throw new Error('The GST settings response was invalid.');
        }
        if (!active) return;
        setGstSettings({
          gst_enabled: response.data.gst_enabled,
          gst_rate: rate,
        });
        setIncludeGst(response.data.gst_enabled);
        setGstError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setGstError(apiError(error, 'Unable to load GST settings.'));
        if (__DEV__)
          console.warn('[CreateBill] Could not load GST settings:', error);
      });
    return () => {
      active = false;
    };
  }, [gstReloadKey]);

  useEffect(() => {
    if (isGuest) return;
    let active = true;
    setUsersLoading(true);
    setUsersError(null);
    api
      .get<Customer[]>('/auth/users')
      .then(response => {
        if (!Array.isArray(response.data)) {
          throw new Error('The customers response was invalid.');
        }
        if (active) setUsers(response.data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setUsersError(apiError(error, 'Could not load registered customers.'));
        if (__DEV__)
          console.warn('[CreateBill] Could not load customers:', error);
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isGuest]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter(product => {
      const active =
        String(product.status ?? 'Active').toLowerCase() === 'active';
      const matchesSearch =
        !query ||
        `${product.name} ${product.product_code ?? ''}`
          .toLowerCase()
          .includes(query);
      const matchesCategory =
        !selectedCategory || product.category === selectedCategory;
      return (
        active &&
        getStock(product) > 0 &&
        product.product_type !== 'Combo Product' &&
        matchesSearch &&
        matchesCategory
      );
    });
  }, [products, search, selectedCategory]);

  const filteredCombos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return combos.filter(combo => {
      const active =
        String(combo.status ?? 'Active').toLowerCase() === 'active';
      const matchesSearch =
        !query ||
        `${combo.name} ${combo.combo_code ?? ''}`.toLowerCase().includes(query);
      return active && getStock(combo) > 0 && matchesSearch;
    });
  }, [combos, search]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return [];
    return users
      .filter(customer =>
        `${customer.name ?? ''} ${customer.username ?? ''} ${
          customer.email ?? ''
        } ${customer.phone ?? ''}`
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 8);
  }, [users, userSearch]);

  const hasProducts = cart.some(item => item.product_id != null);
  const hasCombos = cart.some(item => item.combo_id != null);
  const orderComposition =
    hasProducts && hasCombos
      ? 'Mixed'
      : hasCombos
      ? 'Combo'
      : hasProducts
      ? 'Single'
      : 'Select items';
  const gstAvailable = gstSettings?.gst_enabled === true;
  const gstRate = gstAvailable && includeGst ? gstSettings.gst_rate : 0;
  const totals = calculateTotals(
    cart,
    form.discount_type,
    form.discount_value,
    gstRate,
  );
  const discountValue = Number(form.discount_value);
  const pricingError =
    !Number.isFinite(discountValue) || discountValue < 0
      ? 'Enter a valid discount.'
      : form.discount_type === 'percentage' && discountValue > 100
      ? 'Percentage discount cannot exceed 100%.'
      : form.discount_type === 'fixed' && discountValue > totals.subtotal
      ? 'Fixed discount cannot exceed the subtotal.'
      : '';

  const sizes = selectedVariant?.sizesStock
    ? Object.entries(selectedVariant.sizesStock)
    : [];
  const variantStock = selectedVariant
    ? toNumber(selectedVariant.stock) ||
      Object.values(selectedVariant.sizesStock ?? {}).reduce<number>(
        (sum, quantity) => sum + toNumber(quantity),
        0,
      )
    : 0;
  const selectedSizeQuantity = selectedVariant?.sizesStock?.[selectedSize];
  const selectedSizeStock =
    selectedSizeQuantity == null
      ? variantStock
      : toNumber(selectedSizeQuantity);

  const addProduct = (product: CatalogProduct) => {
    const variants = getProductVariants(product);
    const firstVariant = variants[0] ?? {
      color: '#9A4D16',
      colorName: 'Standard',
      sizesStock: {},
      stock: getStock(product),
    };
    const availableSize = Object.entries(firstVariant.sizesStock ?? {}).find(
      ([, quantity]) => toNumber(quantity) > 0,
    )?.[0];
    setVariantProduct(product);
    setSelectedVariant(firstVariant);
    setSelectedSize(
      availableSize ||
        firstVariant.size ||
        firstVariant.selectedSizes?.[0] ||
        'Free Size',
    );
  };

  const confirmAddProduct = () => {
    if (!variantProduct || !selectedVariant || !selectedSize) {
      Alert.alert(
        'Select options',
        'Choose a color and size for this product.',
      );
      return;
    }
    if (selectedSizeStock <= 0) {
      Alert.alert('Out of stock', 'This size is currently out of stock.');
      return;
    }
    const colorName =
      selectedVariant.colorName || selectedVariant.color || 'Standard';
    const key = `product-${variantProduct.id}-${colorName}-${selectedSize}`;
    const price = toNumber(
      selectedVariant.selling_price ??
        selectedVariant.offer_price ??
        variantProduct.selling_price ??
        variantProduct.offer_price ??
        variantProduct.price,
    );
    setCart(current => {
      const existing = current.find(line => line.key === key);
      if (existing) {
        if (existing.quantity >= selectedSizeStock) {
          Alert.alert('Stock limit', 'There is no more stock for this option.');
          return current;
        }
        return current.map(line =>
          line.key === key
            ? {
                ...line,
                quantity: line.quantity + 1,
                total: line.price * (line.quantity + 1),
              }
            : line,
        );
      }
      const variantImage = parseArray<string>(selectedVariant.images)[0];
      const productImages = parseArray<string>(variantProduct.images);
      const productImage =
        productImages[toNumber(variantProduct.main_image_index)] ??
        productImages[0] ??
        variantProduct.image;
      return [
        ...current,
        {
          key,
          item_type: 'product',
          product_id: variantProduct.id,
          name: variantProduct.name,
          price,
          quantity: 1,
          total: price,
          variant_color: colorName,
          variant_size: selectedSize,
          image: resolveImage(variantImage || productImage),
          stockLimit: selectedSizeStock,
        },
      ];
    });
    setVariantProduct(null);
  };

  const addCombo = (combo: CatalogCombo) => {
    const key = `combo-${combo.id}`;
    const price = getPrice(combo);
    const comboItems = parseArray<Record<string, unknown>>(combo.combo_items);
    const images = parseArray<string>(combo.images);
    const comboImage =
      images[toNumber(combo.main_image_index)] ?? images[0] ?? combo.image;
    setCart(current => {
      const existing = current.find(line => line.key === key);
      if (existing) {
        if (existing.quantity >= getStock(combo)) {
          Alert.alert('Stock limit', 'There is no more stock for this combo.');
          return current;
        }
        return current.map(line =>
          line.key === key
            ? {
                ...line,
                quantity: line.quantity + 1,
                total: line.price * (line.quantity + 1),
              }
            : line,
        );
      }
      return [
        ...current,
        {
          key,
          item_type: 'combo',
          combo_id: combo.id,
          name: combo.name,
          price,
          quantity: 1,
          total: price,
          image: resolveImage(comboImage),
          combo_items: comboItems,
          stockLimit: getStock(combo),
        },
      ];
    });
  };

  const changeQuantity = (key: string, delta: number) => {
    setCart(current =>
      current
        .map(line => {
          if (line.key !== key) return line;
          const nextQuantity = line.quantity + delta;
          if (nextQuantity <= 0) return null;
          if (nextQuantity > line.stockLimit) {
            Alert.alert(
              'Stock limit',
              'Quantity cannot exceed available stock.',
            );
            return line;
          }
          return {
            ...line,
            quantity: nextQuantity,
            total: line.price * nextQuantity,
          };
        })
        .filter((line): line is CartLine => line !== null),
    );
  };

  const selectCustomer = (customer: Customer) => {
    setForm(current => ({
      ...current,
      user_id: customer.user_id ?? customer.id ?? '',
      customer_name: customer.name ?? customer.username ?? '',
      customer_email: customer.email ?? '',
      customer_phone: customer.phone ?? '',
      street_address: customer.street_address ?? '',
      address: customer.street_address ?? '',
      city: customer.city ?? '',
      district: customer.district ?? '',
      state: customer.state ?? '',
      country: customer.country ?? 'India',
      zip_code: customer.zip_code ?? '',
    }));
    setUserSearch(customer.name ?? customer.username ?? '');
  };

  const submitOrder = async () => {
    if (!gstSettings) {
      Alert.alert(
        'GST settings',
        gstError || 'GST settings are still loading.',
      );
      return;
    }
    if (!cart.length) {
      Alert.alert('Cart is empty', 'Add at least one product or combo.');
      return;
    }
    if (pricingError) {
      Alert.alert('Check discount', pricingError);
      return;
    }
    const requiredFields = [
      form.customer_name.trim(),
      form.customer_phone.trim(),
      form.street_address.trim(),
      form.city.trim(),
      form.state.trim(),
      form.zip_code.trim(),
    ];
    if (requiredFields.some(value => !value)) {
      Alert.alert(
        'Required information',
        'Enter customer name, phone, street, city, state, and ZIP code.',
      );
      return;
    }
    setSubmitting(true);
    try {
      const items = cart.map(item => ({
        ...(item.product_id != null ? { product_id: item.product_id } : {}),
        ...(item.combo_id != null ? { combo_id: item.combo_id } : {}),
        ...(item.item_type === 'combo'
          ? { combo_items: item.combo_items ?? [] }
          : {}),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
        ...(item.variant_color ? { variant_color: item.variant_color } : {}),
        ...(item.variant_size ? { variant_size: item.variant_size } : {}),
        ...(item.image ? { image: item.image } : {}),
      }));
      const response = await api.post<{
        order_id?: string;
        id?: number | string;
      }>('/orders', {
        ...form,
        user_id: form.user_id || '',
        items,
        ...totals,
        gst_rate: gstRate,
        order_type: 'Shop',
        created_at: new Date().toISOString().slice(0, 16),
      });
      const orderId = response.data?.order_id ?? response.data?.id;
      Alert.alert(
        'Bill created',
        orderId
          ? `Shop order ${orderId} was created successfully.`
          : 'The shop order was created successfully.',
        [{ text: 'Back to Billing', onPress: onOrderCreated }],
      );
    } catch (error: unknown) {
      if (__DEV__) console.warn('[CreateBill] Could not create order:', error);
      Alert.alert(
        'Create order failed',
        apiError(error, 'Could not create this shop order.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const updateForm = <K extends keyof BillForm>(key: K, value: BillForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };
  const visibleProducts = catalogType === 'product' ? filteredProducts : [];
  const visibleCombos = catalogType === 'combo' ? filteredCombos : [];
  const selectedProductVariants = variantProduct
    ? getProductVariants(variantProduct)
    : [];

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F7F8FA]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TopHeader
        pageTitle="Create Bill"
        pageSubtitle="Shop order billing"
        onBackPress={onBackPress}
      />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-4"
        style={{ paddingTop: insets.top + 72 }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[12px] font-black text-[#334155]">
            {step === 1 ? 'Select items' : 'Customer and payment details'}
          </Text>
          <View className="rounded-full bg-[#FFF7ED] px-2.5 py-1.5">
            <Text className="text-[8px] font-bold text-[#9A3412]">
              Step {step} of 2
            </Text>
          </View>
        </View>

        {step === 1 ? (
          <>
            <View className="mb-3 rounded-[16px] border border-[#E2E8F0] bg-white p-3">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-[12px] font-black text-[#334155]">
                  Add items
                </Text>
                <Text className="rounded-full bg-[#FFF7ED] px-2.5 py-1 text-[8px] font-bold text-[#9A3412]">
                  Order type: {orderComposition}
                </Text>
              </View>
              <View className="mb-3 flex-row rounded-[10px] bg-[#F1F5F9] p-1">
                {[
                  { value: 'product' as const, label: 'Single products' },
                  { value: 'combo' as const, label: 'Combos' },
                ].map(option => (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: catalogType === option.value,
                    }}
                    onPress={() => {
                      setCatalogType(option.value);
                      setSelectedCategory(null);
                    }}
                    className={`flex-1 items-center rounded-[8px] py-2 ${
                      catalogType === option.value ? 'bg-white shadow-sm' : ''
                    }`}
                  >
                    <Text
                      className={`text-[9px] font-bold ${
                        catalogType === option.value
                          ? 'text-[#9A3412]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="mb-3 h-[42px] flex-row items-center rounded-[10px] bg-[#F8FAFC] px-3">
                <Search size={16} color="#94A3B8" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={
                    catalogType === 'product'
                      ? 'Search products by name or SKU'
                      : 'Search combos by name or code'
                  }
                  placeholderTextColor="#94A3B8"
                  className="ml-2 flex-1 text-[10px] text-[#17191C]"
                />
              </View>
              {catalogType === 'product' ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-1"
                >
                  {[{ id: 'all', name: 'All categories' }, ...categories].map(
                    category => {
                      const selected =
                        category.id === 'all'
                          ? selectedCategory === null
                          : selectedCategory === category.name;
                      return (
                        <Pressable
                          key={category.id}
                          onPress={() =>
                            setSelectedCategory(
                              category.id === 'all' ? null : category.name,
                            )
                          }
                          className={`mr-2 rounded-full border px-3 py-2 ${
                            selected
                              ? 'border-[#9A3412] bg-[#9A3412]'
                              : 'border-[#E2E8F0] bg-white'
                          }`}
                        >
                          <Text
                            className={`text-[8px] font-bold ${
                              selected ? 'text-white' : 'text-[#64748B]'
                            }`}
                          >
                            {category.name}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </ScrollView>
              ) : null}
            </View>

            {catalogLoading ? (
              <View className="mb-3 items-center rounded-[16px] bg-white py-10">
                <ActivityIndicator size="large" color="#F97316" />
                <Text className="mt-3 text-[10px] text-[#64748B]">
                  Loading products and combos...
                </Text>
              </View>
            ) : catalogError ? (
              <View className="mb-3 items-center rounded-[16px] bg-white px-4 py-8">
                <Text className="text-center text-[10px] text-[#BE123C]">
                  {catalogError}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setCatalogError(null);
                    setCatalogLoading(true);
                    Promise.all([
                      fetchAllProducts(),
                      fetchAllCombos(),
                      api.get<Category[]>('/categories'),
                    ])
                      .then(([nextProducts, nextCombos, categoryResponse]) => {
                        if (!Array.isArray(categoryResponse.data)) {
                          throw new Error(
                            'The categories response was invalid.',
                          );
                        }
                        setProducts(nextProducts);
                        setCombos(nextCombos);
                        setCategories(categoryResponse.data);
                      })
                      .catch((error: unknown) => {
                        setCatalogError(
                          apiError(
                            error,
                            'Could not load products and combos.',
                          ),
                        );
                      })
                      .finally(() => setCatalogLoading(false));
                  }}
                  className="mt-3 rounded-[9px] bg-[#9A3412] px-4 py-2"
                >
                  <Text className="text-[9px] font-bold text-white">Retry</Text>
                </Pressable>
              </View>
            ) : visibleProducts.length || visibleCombos.length ? (
              <View className="mb-3 flex-row flex-wrap justify-between">
                {visibleProducts.map(product => {
                  const quantity = cart
                    .filter(item => item.product_id === product.id)
                    .reduce((sum, item) => sum + item.quantity, 0);
                  const variant = getProductVariants(product)[0];
                  const images = parseArray<string>(
                    variant?.images ?? product.images,
                  );
                  const imageUri = resolveImage(images[0] ?? product.image);
                  const price = toNumber(
                    variant?.selling_price ??
                      variant?.offer_price ??
                      product.selling_price ??
                      product.offer_price ??
                      product.price,
                  );
                  return (
                    <View
                      key={product.id}
                      className="mb-3 w-[48.5%] overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white"
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Choose options for ${product.name}`}
                        onPress={() => addProduct(product)}
                      >
                        {imageUri ? (
                          <Image
                            source={{ uri: imageUri }}
                            accessibilityLabel={`${product.name} image`}
                            className="h-[115px] w-full bg-[#F8FAFC]"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-[115px] items-center justify-center bg-[#FFF7ED]">
                            <Package size={28} color="#C2410C" />
                          </View>
                        )}
                        <View className="p-2.5">
                          <Text
                            numberOfLines={2}
                            className="min-h-[32px] text-[10px] font-bold text-[#334155]"
                          >
                            {product.name}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className="mt-1 text-[8px] text-[#94A3B8]"
                          >
                            {product.product_code ||
                              product.category ||
                              'Product'}
                          </Text>
                        </View>
                      </Pressable>
                      <View className="flex-row items-center justify-between border-t border-[#F1F5F9] px-2.5 py-2">
                        <Text className="text-[10px] font-black text-[#9A3412]">
                          {formatCurrency(price)}
                        </Text>
                        <QuantityControl
                          quantity={quantity}
                          onAdd={() => addProduct(product)}
                          onDecrease={() => {
                            const line = [...cart]
                              .reverse()
                              .find(item => item.product_id === product.id);
                            if (line) changeQuantity(line.key, -1);
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
                {visibleCombos.map(combo => {
                  const quantity = cart
                    .filter(item => item.combo_id === combo.id)
                    .reduce((sum, item) => sum + item.quantity, 0);
                  const images = parseArray<string>(combo.images);
                  const imageUri = resolveImage(
                    images[toNumber(combo.main_image_index)] ??
                      images[0] ??
                      combo.image,
                  );
                  return (
                    <View
                      key={combo.id}
                      className="mb-3 w-[48.5%] overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white"
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add combo ${combo.name}`}
                        onPress={() => addCombo(combo)}
                      >
                        {imageUri ? (
                          <Image
                            source={{ uri: imageUri }}
                            accessibilityLabel={`${combo.name} image`}
                            className="h-[115px] w-full bg-[#F8FAFC]"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-[115px] items-center justify-center bg-[#FFF7ED]">
                            <ShoppingBag size={28} color="#C2410C" />
                          </View>
                        )}
                        <View className="p-2.5">
                          <Text
                            numberOfLines={2}
                            className="min-h-[32px] text-[10px] font-bold text-[#334155]"
                          >
                            {combo.name}
                          </Text>
                          <Text className="mt-1 text-[8px] font-semibold text-[#C2410C]">
                            Combo · {parseArray(combo.combo_items).length} items
                          </Text>
                        </View>
                      </Pressable>
                      <View className="flex-row items-center justify-between border-t border-[#F1F5F9] px-2.5 py-2">
                        <Text className="text-[10px] font-black text-[#9A3412]">
                          {formatCurrency(getPrice(combo))}
                        </Text>
                        <QuantityControl
                          quantity={quantity}
                          onAdd={() => addCombo(combo)}
                          onDecrease={() => {
                            const line = cart.find(
                              item => item.combo_id === combo.id,
                            );
                            if (line) changeQuantity(line.key, -1);
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="mb-3 items-center rounded-[16px] bg-white py-10">
                <Package size={28} color="#CBD5E1" />
                <Text className="mt-3 text-[10px] text-[#64748B]">
                  No available{' '}
                  {catalogType === 'product' ? 'products' : 'combos'} found.
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View className="mb-3 p-4">
              <View className="mb-3 flex-row items-center">
                <UserRound size={17} color="#9A3412" />
                <Text className="ml-2 text-[12px] font-black text-[#334155]">
                  Customer
                </Text>
              </View>
              <View className="mb-3 flex-row">
                {[
                  { label: 'Guest customer', value: true },
                  { label: 'Registered', value: false },
                ].map(option => (
                  <Pressable
                    key={option.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isGuest === option.value }}
                    onPress={() => {
                      setIsGuest(option.value);
                      if (option.value) {
                        setForm(current => ({
                          ...initialForm,
                          discount_type: current.discount_type,
                          discount_value: current.discount_value,
                        }));
                        setUserSearch('');
                      }
                    }}
                    className={`mr-2 rounded-full border px-3 py-2 ${
                      isGuest === option.value
                        ? 'border-[#9A3412] bg-[#FFF7ED]'
                        : 'border-[#E2E8F0]'
                    }`}
                  >
                    <Text
                      className={`text-[9px] font-bold ${
                        isGuest === option.value
                          ? 'text-[#9A3412]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {!isGuest ? (
                <View className="mb-3">
                  <TextInput
                    value={userSearch}
                    onChangeText={setUserSearch}
                    placeholder="Search registered customers by name, email or phone"
                    placeholderTextColor="#94A3B8"
                    className="h-[44px] rounded-[10px] border border-[#E2E8F0] px-3 text-[10px] text-[#17191C]"
                  />
                  {usersLoading ? (
                    <ActivityIndicator className="mt-3" color="#F97316" />
                  ) : usersError ? (
                    <Text className="mt-2 text-[9px] text-[#BE123C]">
                      {usersError}
                    </Text>
                  ) : filteredUsers.length ? (
                    <View className="mt-2 rounded-[10px] border border-[#E2E8F0] bg-white">
                      {filteredUsers.map((customer, index) => (
                        <Pressable
                          key={customer.user_id ?? customer.id ?? index}
                          accessibilityRole="button"
                          onPress={() => selectCustomer(customer)}
                          className="border-b border-[#F1F5F9] px-3 py-2.5 last:border-0"
                        >
                          <Text className="text-[10px] font-bold text-[#334155]">
                            {customer.name || customer.username || 'Customer'}
                          </Text>
                          <Text className="mt-1 text-[8px] text-[#64748B]">
                            {[customer.phone, customer.email]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : userSearch.trim() ? (
                    <Text className="mt-2 text-[9px] text-[#64748B]">
                      No matching customers.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View className="mb-3 rounded-[16px] border border-[#E2E8F0] bg-white p-4">
              <Text className="mb-3 text-[12px] font-black text-[#334155]">
                Shipping details *
              </Text>
              <BillInput
                label="Customer name *"
                value={form.customer_name}
                onChangeText={customer_name =>
                  updateForm('customer_name', customer_name)
                }
                placeholder="Full name"
              />
              <BillInput
                label="Phone number *"
                value={form.customer_phone}
                onChangeText={customer_phone =>
                  updateForm('customer_phone', customer_phone)
                }
                placeholder="Contact number"
                keyboardType="phone-pad"
              />
              <BillInput
                label="Email address"
                value={form.customer_email}
                onChangeText={customer_email =>
                  updateForm('customer_email', customer_email)
                }
                placeholder="Optional email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <BillInput
                label="Street address *"
                value={form.street_address}
                onChangeText={street_address =>
                  setForm(current => ({
                    ...current,
                    street_address,
                    address: street_address,
                  }))
                }
                placeholder="Street / area / landmark"
              />
              <BillInput
                label="City *"
                value={form.city}
                onChangeText={city => updateForm('city', city)}
                placeholder="City"
              />
              <BillInput
                label="District"
                value={form.district}
                onChangeText={district => updateForm('district', district)}
                placeholder="District"
              />
              <View className="flex-row">
                <View className="mr-2 flex-1">
                  <BillInput
                    label="State *"
                    value={form.state}
                    onChangeText={state => updateForm('state', state)}
                    placeholder="State"
                  />
                </View>
                <View className="flex-1">
                  <BillInput
                    label="ZIP code *"
                    value={form.zip_code}
                    onChangeText={zip_code => updateForm('zip_code', zip_code)}
                    placeholder="ZIP code"
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <BillInput
                label="Country"
                value={form.country}
                onChangeText={country => updateForm('country', country)}
                placeholder="Country"
              />
            </View>

            <View className="mb-3 rounded-[16px] border border-[#E2E8F0] bg-white p-4">
              <Text className="mb-3 text-[12px] font-black text-[#334155]">
                Payment and order type
              </Text>
              <View className="mb-3">
                <Text className="mb-1.5 text-[9px] font-bold text-[#64748B]">
                  Order type
                </Text>
                <View className="rounded-[10px] bg-[#FFF7ED] px-3 py-3">
                  <Text className="text-[10px] font-bold text-[#9A3412]">
                    {orderComposition === 'Select items'
                      ? 'Select items to set order type'
                      : `${orderComposition} Order`}
                  </Text>
                </View>
              </View>
              <BillSelect
                label="Payment type"
                value={form.payment_method}
                onPress={() => setChoiceModal('payment')}
              />
              <BillSelect
                label="Order status"
                value={form.status}
                onPress={() => setChoiceModal('status')}
              />
            </View>
          </>
        )}
      </ScrollView>

      <View
        className="shrink-0 border-t border-[#E2E8F0] bg-white px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {step === 1 ? (
          <>
            <View className="mb-2 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[9px] font-bold text-[#64748B]">
                  Order summary ·{' '}
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} item(s)
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-1 text-[8px] text-[#94A3B8]"
                >
                  {cart.length
                    ? cart
                        .slice(0, 2)
                        .map(item => `${item.name} ×${item.quantity}`)
                        .join(' · ')
                    : 'Add products or combos to create a bill'}
                  {cart.length > 2 ? ` · +${cart.length - 2} more` : ''}
                </Text>
              </View>
              <Text className="text-[14px] font-black text-[#17191C]">
                {formatCurrency(totals.total_amount)}
              </Text>
            </View>
            <View className="flex-row">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Preview order summary"
                onPress={() => setSummaryVisible(true)}
                className="mr-2 h-[44px] flex-1 items-center justify-center rounded-[11px] border border-[#9A3412] bg-white"
              >
                <Text className="text-[10px] font-black text-[#9A3412]">
                  Preview
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={cart.length === 0 || !gstSettings}
                onPress={() => setStep(2)}
                className="h-[44px] flex-1 flex-row items-center justify-center rounded-[11px] bg-[#9A3412] disabled:opacity-50"
              >
                <Text className="text-[10px] font-black text-white">Next</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[9px] font-bold text-[#64748B]">
                Order total
              </Text>
              <Text className="text-[14px] font-black text-[#17191C]">
                {formatCurrency(totals.total_amount)}
              </Text>
            </View>
            <View className="mb-2 flex-row">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Preview order summary"
                onPress={() => setSummaryVisible(true)}
                className="mr-2 h-[44px] flex-1 items-center justify-center rounded-[11px] border border-[#9A3412] bg-white"
              >
                <Text className="text-[8px] font-black text-[#9A3412]">
                  Preview
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setStep(1)}
                className="mr-2 h-[44px] flex-1 items-center justify-center rounded-[11px] border border-[#E2E8F0] bg-white"
              >
                <Text className="text-[8px] font-bold text-[#64748B]">
                  Back to items
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={submitting || !gstSettings}
                onPress={submitOrder}
                className="h-[44px] flex-1 flex-row items-center justify-center rounded-[11px] bg-[#9A3412] disabled:opacity-50"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-[8px] font-black text-white">
                    Create shop order
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>

      <Modal
        visible={summaryVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSummaryVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="flex-1 rounded-t-[22px] bg-[#F7F8FA]">
            <View
              className="flex-row items-center justify-between border-b border-[#E2E8F0] bg-white px-5 pb-4"
              style={{ paddingTop: Math.max(insets.top, 12) }}
            >
              <View>
                <Text className="text-[14px] font-black text-[#17191C]">
                  Order Summary
                </Text>
                <Text className="mt-1 text-[9px] text-[#64748B]">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} item(s) ·{' '}
                  {formatCurrency(totals.total_amount)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close order summary"
                onPress={() => setSummaryVisible(false)}
                className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F5F9]"
              >
                <X size={17} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              className="flex-1"
              contentContainerClassName="px-4 pt-3 pb-1"
            >
              <CartSummary
                cart={cart}
                totals={totals}
                form={form}
                gstSettings={gstSettings}
                gstError={gstError}
                gstRate={gstRate}
                includeGst={includeGst}
                pricingError={pricingError}
                onQuantityChange={changeQuantity}
                onDiscountTypeChange={discount_type =>
                  updateForm('discount_type', discount_type)
                }
                onDiscountValueChange={discount_value =>
                  updateForm('discount_value', discount_value)
                }
                onToggleGst={setIncludeGst}
                onRetryGst={() => setGstReloadKey(value => value + 1)}
              />
            </ScrollView>
            <View
              className="border-t border-[#E2E8F0] bg-white px-4 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <Pressable
                accessibilityRole="button"
                disabled={step === 1 && (cart.length === 0 || !gstSettings)}
                onPress={() => {
                  setSummaryVisible(false);
                  if (step === 1) setStep(2);
                }}
                className="h-[44px] flex-row items-center justify-center rounded-[11px] bg-[#9A3412] disabled:opacity-50"
              >
                <Text className="text-[10px] font-black text-white">
                  {step === 1 ? 'Next · Customer details' : 'Close preview'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={variantProduct !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setVariantProduct(null)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View
            className="rounded-t-[22px] bg-white px-5 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <View className="mb-4 flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[9px] font-bold uppercase text-[#9A3412]">
                  Choose product options
                </Text>
                <Text className="mt-1 text-[15px] font-black text-[#17191C]">
                  {variantProduct?.name}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setVariantProduct(null)}
                className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F5F9]"
              >
                <Text className="text-[16px] text-[#64748B]">×</Text>
              </Pressable>
            </View>

            <Text className="mb-2 text-[9px] font-black uppercase text-[#64748B]">
              Select color
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              {(selectedProductVariants.length
                ? selectedProductVariants
                : [
                    {
                      color: '#9A4D16',
                      colorName: 'Standard',
                      stock: getStock(variantProduct ?? {}),
                      sizesStock: {},
                    },
                  ]
              ).map((variant, index) => {
                const currentColor =
                  selectedVariant?.colorName ?? selectedVariant?.color;
                const color =
                  variant.colorName || variant.color || `Color ${index + 1}`;
                const selected = currentColor === color;
                return (
                  <Pressable
                    key={`${color}-${index}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setSelectedVariant(variant);
                      const nextSize = Object.entries(
                        variant.sizesStock ?? {},
                      ).find(([, stock]) => toNumber(stock) > 0)?.[0];
                      setSelectedSize(
                        nextSize ||
                          variant.size ||
                          variant.selectedSizes?.[0] ||
                          'Free Size',
                      );
                    }}
                    className={`mr-2 flex-row items-center rounded-full border px-3 py-2 ${
                      selected
                        ? 'border-[#C2410C] bg-[#FFF7ED]'
                        : 'border-[#E2E8F0]'
                    }`}
                  >
                    <View
                      className="mr-2 h-[15px] w-[15px] rounded-full border border-[#CBD5E1]"
                      style={{
                        backgroundColor: variant.color || '#9A4D16',
                      }}
                    />
                    <Text className="text-[9px] font-bold text-[#475569]">
                      {color}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text className="mb-2 text-[9px] font-black uppercase text-[#64748B]">
              Select size
            </Text>
            {sizes.length ? (
              <View className="mb-4 flex-row flex-wrap">
                {sizes.map(([size, stock]) => {
                  const isAvailable = toNumber(stock) > 0;
                  return (
                    <Pressable
                      key={size}
                      accessibilityRole="button"
                      disabled={!isAvailable}
                      accessibilityState={{
                        selected: selectedSize === size,
                        disabled: !isAvailable,
                      }}
                      onPress={() => setSelectedSize(size)}
                      className={`mb-2 mr-2 flex-row items-center rounded-[9px] border px-3 py-2 ${
                        selectedSize === size
                          ? 'border-[#9A3412] bg-[#9A3412]'
                          : 'border-[#E2E8F0] bg-white'
                      } ${isAvailable ? '' : 'opacity-40'}`}
                    >
                      <Text
                        className={`text-[9px] font-bold ${
                          selectedSize === size
                            ? 'text-white'
                            : 'text-[#475569]'
                        }`}
                      >
                        {size} ({stock})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text className="mb-4 rounded-[9px] bg-[#F8FAFC] px-3 py-2.5 text-[9px] font-bold text-[#475569]">
                {selectedSize || 'Free Size'} · {variantStock} available
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={selectedSizeStock <= 0}
              onPress={confirmAddProduct}
              className="h-[46px] flex-row items-center justify-center rounded-[11px] bg-[#9A3412] disabled:opacity-50"
            >
              <Check size={15} color="#FFFFFF" />
              <Text className="ml-2 text-[10px] font-black text-white">
                Add selection to order
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ChoiceModal
        visible={choiceModal !== null}
        title={choiceModal === 'payment' ? 'Payment type' : 'Order status'}
        options={
          choiceModal === 'payment' ? ['Cash', 'UPI', 'Card'] : orderStatuses
        }
        selected={choiceModal === 'payment' ? form.payment_method : form.status}
        onSelect={value => {
          if (choiceModal === 'payment') {
            updateForm('payment_method', value as BillForm['payment_method']);
          } else {
            updateForm('status', value as BillForm['status']);
          }
          setChoiceModal(null);
        }}
        onClose={() => setChoiceModal(null)}
      />
    </KeyboardAvoidingView>
  );
}

function QuantityControl({
  quantity,
  onAdd,
  onDecrease,
}: {
  quantity: number;
  onAdd: () => void;
  onDecrease: () => void;
}) {
  return quantity === 0 ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add item"
      onPress={onAdd}
      className="h-[28px] w-[28px] items-center justify-center rounded-full bg-[#9A3412]"
    >
      <Plus size={14} color="#FFFFFF" />
    </Pressable>
  ) : (
    <View className="flex-row items-center rounded-full bg-[#FFF7ED] p-0.5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        onPress={onDecrease}
        className="h-[25px] w-[25px] items-center justify-center"
      >
        <Minus size={12} color="#9A3412" />
      </Pressable>
      <Text className="min-w-[18px] text-center text-[9px] font-black text-[#9A3412]">
        {quantity}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        onPress={onAdd}
        className="h-[25px] w-[25px] items-center justify-center"
      >
        <Plus size={12} color="#9A3412" />
      </Pressable>
    </View>
  );
}

function CartSummary({
  cart,
  totals,
  form,
  gstSettings,
  gstError,
  gstRate,
  includeGst,
  pricingError,
  onQuantityChange,
  onDiscountTypeChange,
  onDiscountValueChange,
  onToggleGst,
  onRetryGst,
}: {
  cart: CartLine[];
  totals: ReturnType<typeof calculateTotals>;
  form: BillForm;
  gstSettings: GstSettings | null;
  gstError: string | null;
  gstRate: number;
  includeGst: boolean;
  pricingError: string;
  onQuantityChange: (key: string, delta: number) => void;
  onDiscountTypeChange: (value: BillForm['discount_type']) => void;
  onDiscountValueChange: (value: string) => void;
  onToggleGst: (value: boolean) => void;
  onRetryGst: () => void;
}) {
  return (
    <View className="mb-3 rounded-[16px] border border-[#E2E8F0] bg-white p-4">
      <View className="mb-3 flex-row items-center justify-end">
        <Text className="text-[9px] font-bold text-[#64748B]">
          {cart.length} item{cart.length === 1 ? '' : 's'}
        </Text>
      </View>
      {cart.length ? (
        <View className="mb-3">
          {cart.map(item => (
            <View
              key={item.key}
              className="mb-2 flex-row items-center border-b border-[#E2E8F0] pb-2"
            >
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  accessibilityLabel={`${item.name} image`}
                  className="mr-2 h-[42px] w-[42px] rounded-[8px] bg-[#F1F5F9]"
                  resizeMode="cover"
                />
              ) : (
                <View className="mr-2 h-[42px] w-[42px] items-center justify-center rounded-[8px] bg-[#F1F5F9]">
                  <Package size={17} color="#94A3B8" />
                </View>
              )}
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-[9px] font-bold text-[#17191C]"
                >
                  {item.name}
                </Text>
                <Text className="mt-1 text-[7px] text-[#64748B]">
                  {item.item_type === 'combo'
                    ? 'Combo'
                    : `${item.variant_color} · ${item.variant_size}`}
                </Text>
                <View className="mt-1.5 flex-row items-center">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onQuantityChange(item.key, -1)}
                    className="h-[22px] w-[22px] items-center justify-center rounded-md border border-[#CBD5E1]"
                  >
                    <Minus size={10} color="#475569" />
                  </Pressable>
                  <Text className="mx-2 text-[9px] font-bold text-[#334155]">
                    {item.quantity}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={item.quantity >= item.stockLimit}
                    onPress={() => onQuantityChange(item.key, 1)}
                    className="h-[22px] w-[22px] items-center justify-center rounded-md border border-[#CBD5E1] disabled:opacity-40"
                  >
                    <Plus size={10} color="#475569" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name}`}
                    onPress={() => onQuantityChange(item.key, -item.quantity)}
                    className="ml-2 h-[22px] w-[22px] items-center justify-center"
                  >
                    <Trash2 size={12} color="#DC2626" />
                  </Pressable>
                </View>
              </View>
              <Text className="ml-2 text-[9px] font-black text-[#17191C]">
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="mb-3 text-[9px] text-[#64748B]">
          No products added yet.
        </Text>
      )}

      {gstError ? (
        <View className="mb-3 rounded-[9px] border border-red-200 bg-red-50 p-2.5">
          <Text className="text-[8px] text-red-700">
            GST settings could not be loaded: {gstError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetryGst}
            className="mt-1"
          >
            <Text className="text-[8px] font-bold text-red-700 underline">
              Retry
            </Text>
          </Pressable>
        </View>
      ) : !gstSettings ? (
        <Text className="mb-3 text-[8px] text-[#64748B]">
          Loading GST settings...
        </Text>
      ) : null}

      {gstSettings?.gst_enabled ? (
        <View className="mb-3">
          <Text className="mb-2 text-[9px] font-bold text-[#475569]">
            GST for this order
          </Text>
          <View className="flex-row">
            {[true, false].map(included => (
              <Pressable
                key={String(included)}
                accessibilityRole="button"
                accessibilityState={{ selected: includeGst === included }}
                onPress={() => onToggleGst(included)}
                className={`mr-2 flex-1 items-center rounded-[8px] border py-2 ${
                  includeGst === included
                    ? 'border-[#9A3412] bg-[#FFF7ED]'
                    : 'border-[#CBD5E1]'
                }`}
              >
                <Text className="text-[8px] font-bold text-[#475569]">
                  {included ? 'Include GST' : 'Exclude GST'}
                </Text>
              </Pressable>
            ))}
          </View>
          {includeGst ? (
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-[8px] text-[#64748B]">
                GST rate · {gstRate}%
              </Text>
              <Text className="text-[8px] font-bold text-[#334155]">
                {formatCurrency(totals.gst_amount)}
              </Text>
            </View>
          ) : (
            <Text className="mt-2 text-[8px] text-[#64748B]">
              GST will not be charged for this order.
            </Text>
          )}
        </View>
      ) : null}

      <View className="mb-3 flex-row items-center justify-between border-t border-[#E2E8F0] pt-3">
        <Text className="text-[9px] font-bold text-[#64748B]">Subtotal</Text>
        <Text className="text-[9px] font-bold text-[#334155]">
          {formatCurrency(totals.subtotal)}
        </Text>
      </View>
      <View className="mb-2 flex-row items-center">
        <Text className="mr-2 flex-1 text-[9px] font-bold text-[#475569]">
          Discount
        </Text>
        <View className="mr-2 flex-row rounded-[8px] border border-[#CBD5E1] p-0.5">
          {[
            { label: '%', value: 'percentage' as const },
            { label: '₹', value: 'fixed' as const },
          ].map(option => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={
                option.value === 'percentage'
                  ? 'Percentage discount'
                  : 'Fixed discount'
              }
              accessibilityState={{
                selected: form.discount_type === option.value,
              }}
              onPress={() => onDiscountTypeChange(option.value)}
              className={`rounded-[6px] px-2 py-1 ${
                form.discount_type === option.value ? 'bg-[#FFF7ED]' : ''
              }`}
            >
              <Text className="text-[8px] font-bold text-[#475569]">
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={form.discount_value}
          onChangeText={onDiscountValueChange}
          keyboardType="decimal-pad"
          accessibilityLabel="Discount value"
          className="w-[66px] rounded-[8px] border border-[#CBD5E1] px-2 py-1.5 text-right text-[9px] font-bold text-[#17191C]"
        />
        <Text className="ml-1 text-[8px] text-[#64748B]">
          {form.discount_type === 'percentage' ? '%' : '₹'}
        </Text>
      </View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[8px] text-[#64748B]">Discount applied</Text>
        <Text className="text-[8px] font-bold text-[#334155]">
          -{formatCurrency(totals.discount_amount)}
        </Text>
      </View>
      {pricingError ? (
        <Text className="mb-2 text-[8px] font-semibold text-amber-700">
          {pricingError}
        </Text>
      ) : null}
      <View className="flex-row items-center justify-between border-t border-[#E2E8F0] pt-3">
        <Text className="text-[9px] font-black uppercase tracking-[1px] text-[#9A3412]">
          Grand total
        </Text>
        <Text className="text-[17px] font-black text-[#17191C]">
          {formatCurrency(totals.total_amount)}
        </Text>
      </View>
    </View>
  );
}

function BillInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'phone-pad'
    | 'number-pad'
    | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-[9px] font-bold text-[#64748B]">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className="h-[42px] rounded-[9px] border border-[#E2E8F0] bg-white px-3 text-[10px] text-[#17191C]"
      />
    </View>
  );
}

function BillSelect({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      className="mb-3"
    >
      <Text className="mb-1.5 text-[9px] font-bold text-[#64748B]">
        {label}
      </Text>
      <View className="h-[42px] flex-row items-center justify-between rounded-[9px] border border-[#E2E8F0] px-3">
        <Text className="text-[10px] font-semibold text-[#334155]">
          {value}
        </Text>
        <ChevronDown size={15} color="#64748B" />
      </View>
    </Pressable>
  );
}

function ChoiceModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 justify-center bg-black/50 px-6"
      >
        <Pressable
          onPress={event => event.stopPropagation()}
          className="rounded-[16px] bg-white p-4"
        >
          <Text className="mb-3 text-[13px] font-black text-[#17191C]">
            {title}
          </Text>
          {options.map(option => {
            const label =
              option === 'percentage'
                ? 'Percentage'
                : option === 'fixed'
                ? 'Fixed amount'
                : option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: selected === option }}
                onPress={() => onSelect(option)}
                className="flex-row items-center justify-between border-t border-[#F1F5F9] py-3"
              >
                <Text className="text-[10px] font-semibold text-[#475569]">
                  {label}
                </Text>
                {selected === option ? (
                  <Check size={15} color="#9A3412" />
                ) : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
