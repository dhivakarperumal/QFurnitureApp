import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import api from '../api';
import Header from './Header';
import Home from './Home/Home';
import ComboDetails from './ComboDetails';
import ComboOffers from './ComboOffers';
import ProductDetails from './ProductDetails';
import Shop from './Shop/Shop';
import Tabs from './Tabs';
import Cart from './Cart/Cart';
import Checkout from './Cart/Checkout';
import Favorites from './Favorites/Favorites';
import type {
  StoreAddToCartOptions,
  StoreBanner,
  StoreBuyNowItem,
  StoreCartItem,
  StoreCategory,
  StoreFavorite,
  StoreProduct,
  StoreTab,
} from './types';
import { productCategory } from './utils';
import AccountScreen, { type AccountSubScreen } from './Account/AccountScreen';
import ProfileScreen from './Account/ProfileScreen';
import AddressesScreen from './Account/AddressesScreen';
import OrdersScreen from './Account/OrdersScreen';
import SetPasswordScreen from './Account/SetPasswordScreen';
import { MoreMenu, MorePlaceholder, type MoreDestination } from './More';
import AboutUs from './AboutUs';
import ContactUs from './ContactUs';
import { setUserNavigationBarAppearance } from '../services/navigationBar';
import { useUserAlert, useUserToast } from './UserAlert';
import { SkeletonList } from './Skeletons';
import {
  fetchCachedApiData,
  getCachedApiData,
  hasCachedApiData,
  invalidateCachedApiData,
} from '../apiCache';

// ─── Inner page header (fixed, no main header / no bottom tabs) ───────────────
function InnerPageHeader({
  title,
  subtitle,
  onBack,
  topInset,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  topInset: number;
}) {
  return (
    <View
      style={{ paddingTop: topInset }}
      className="relative overflow-hidden border-b border-[#FFB46B]">
      <View pointerEvents="none" className="absolute inset-0">
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 400 80"
          preserveAspectRatio="none">
          <Defs>
            <LinearGradient
              id="innerHeaderOrangeGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%">
              <Stop offset="0%" stopColor="#E9570D" />
              <Stop offset="55%" stopColor="#F97316" />
              <Stop offset="100%" stopColor="#E9570D" />
            </LinearGradient>
          </Defs>
          <Rect
            width="100%"
            height="100%"
            fill="url(#innerHeaderOrangeGradient)"
          />
        </Svg>
      </View>
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          className="mr-3 h-[40px] w-[40px] items-center justify-center rounded-full bg-white/20">
          <ArrowLeft size={20} color="white" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[17px] font-black text-white">{title}</Text>
          {subtitle ? (
            <Text className="text-[12px] text-[#FFF0E1]">{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

type StoreData = {
  categories: StoreCategory[];
  products: StoreProduct[];
  heroBanners: StoreBanner[];
  offerBanners: StoreBanner[];
};

const emptyStoreData: StoreData = {
  categories: [],
  products: [],
  heroBanners: [],
  offerBanners: [],
};
const STORE_CACHE_KEY = 'user.storefront';
const FAVORITES_CACHE_KEY = 'user.favorites';
const COMBOS_CACHE_KEY = 'user.combos';

function favoriteKey(item: StoreFavorite) {
  return item.item_type === 'combo'
    ? `combo-${String(item.combo_id ?? item.id).replace(/^combo-/, '')}`
    : String(item.product_id ?? item.id);
}

function errorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Could not load the shop. Please try again.';
}

function accountDeletionErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    if (
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'data' in error.response &&
      typeof error.response.data === 'object' &&
      error.response.data !== null &&
      'message' in error.response.data &&
      typeof error.response.data.message === 'string'
    ) {
      return error.response.data.message;
    }
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }
  return 'Could not delete your account. Please try again.';
}

export default function Storefront({
  isGuest,
  onLoginPress,
  onLogoutPress,
}: {
  isGuest: boolean;
  onLoginPress: () => void;
  onLogoutPress: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const showUserAlert = useUserAlert();
  const showUserToast = useUserToast();
  const requestLogin = useCallback(
    (feature: string) => {
      if (!isGuest) return false;
      showUserAlert('Login required', `Please log in to ${feature}.`, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Log in', onPress: onLoginPress },
      ]);
      return true;
    },
    [isGuest, onLoginPress, showUserAlert],
  );
  useEffect(() => {
    setUserNavigationBarAppearance(true).catch(error => {
      console.warn('[Storefront] Could not set user navigation bar style:', error);
    });

    return () => {
      setUserNavigationBarAppearance(false).catch(error => {
        console.warn('[Storefront] Could not restore navigation bar style:', error);
      });
    };
  }, []);

  const [activeTab, setActiveTab] = useState<StoreTab>('Home');
  const [detailTarget, setDetailTarget] = useState<{
    itemId: string;
    itemType: 'product' | 'combo';
  } | null>(null);
  const [detailItemName, setDetailItemName] = useState('');
  const [storeData, setStoreData] = useState(
    () => getCachedApiData<StoreData>(STORE_CACHE_KEY) ?? emptyStoreData,
  );
  const [storeAvailable, setStoreAvailable] = useState(() =>
    hasCachedApiData(STORE_CACHE_KEY),
  );
  const [loading, setLoading] = useState(
    () => !hasCachedApiData(STORE_CACHE_KEY),
  );
  const hasAttemptedStoreLoad = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const [comboRefreshKey, setComboRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [favoriteItems, setFavoriteItems] = useState(
    () => getCachedApiData<StoreFavorite[]>(FAVORITES_CACHE_KEY) ?? [],
  );
  const [favoritesLoading, setFavoritesLoading] = useState(
    () => !isGuest && !hasCachedApiData(FAVORITES_CACHE_KEY),
  );
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<string[]>([]);
  const [clearingFavorites, setClearingFavorites] = useState(false);
  const [addingFavoritesToCart, setAddingFavoritesToCart] = useState(false);
  const [cartItems, setCartItems] = useState<StoreCartItem[]>([]);
  const [buyNowItem, setBuyNowItem] = useState<StoreBuyNowItem | null>(null);
  const [cartLoading, setCartLoading] = useState(!isGuest);
  const [cartError, setCartError] = useState<string | null>(null);
  const [pendingCartIds, setPendingCartIds] = useState<string[]>([]);
  const [clearingCart, setClearingCart] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [accountSubScreen, setAccountSubScreen] =
    useState<AccountSubScreen>('menu');
  const [moreDestination, setMoreDestination] =
    useState<MoreDestination | 'menu'>('menu');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const loadStore = useCallback(async (forceRefresh = false) => {
    const hasCachedStore = hasCachedApiData(STORE_CACHE_KEY);
    if (!hasCachedStore && !hasAttemptedStoreLoad.current) setLoading(true);
    if (hasCachedStore) setLoadError(null);
    try {
      const nextStoreData = await fetchCachedApiData(
        STORE_CACHE_KEY,
        async force => {
          const requestConfig = force
            ? { headers: { 'Cache-Control': 'no-store' } }
            : undefined;
          const [
            categoriesResponse,
            productsResponse,
            heroResponse,
            offerResponse,
          ] = await Promise.all([
            api.get<StoreCategory[]>('/categories', requestConfig),
            api.get<{ products?: StoreProduct[] }>('/products', {
              params: { page: 1, limit: 100, search: '', status: 'All' },
              ...requestConfig,
            }),
            api.get<{ banners?: StoreBanner[] }>('/banners/hero', requestConfig),
            api.get<{ banners?: StoreBanner[] }>('/banners/offers', requestConfig),
          ]);

          if (!Array.isArray(categoriesResponse.data)) {
            throw new Error(
              'The categories response did not contain a category list.',
            );
          }
          if (!Array.isArray(productsResponse.data?.products)) {
            throw new Error(
              'The products response did not contain a product list.',
            );
          }
          if (!Array.isArray(heroResponse.data?.banners)) {
            throw new Error(
              'The hero banner response did not contain a banner list.',
            );
          }
          if (!Array.isArray(offerResponse.data?.banners)) {
            throw new Error(
              'The offer banner response did not contain a banner list.',
            );
          }

          return {
            categories: categoriesResponse.data,
            products: productsResponse.data.products.filter(
              product =>
                product.status === 'Active' &&
                product.product_type !== 'Combo Product',
            ),
            heroBanners: heroResponse.data.banners,
            offerBanners: offerResponse.data.banners,
          };
        },
        forceRefresh,
      );
      setStoreData(nextStoreData);
      setStoreAvailable(true);
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
      hasAttemptedStoreLoad.current = true;
    }
  }, []);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  const loadCart = useCallback(async () => {
    setCartLoading(true);
    setCartError(null);
    try {
      const { data: items } = await api.get<StoreCartItem[]>('/cart', {
        headers: { 'Cache-Control': 'no-store' },
      });
      if (!Array.isArray(items)) {
        throw new Error('The cart response did not contain a cart list.');
      }
      setCartItems(items);
    } catch (error) {
      setCartError(errorMessage(error));
      throw error;
    } finally {
      setCartLoading(false);
    }
  }, []);

  const loadFavorites = useCallback(async (forceRefresh = false) => {
    if (!hasCachedApiData(FAVORITES_CACHE_KEY)) setFavoritesLoading(true);
    setFavoritesError(null);
    try {
      const items = await fetchCachedApiData(
        FAVORITES_CACHE_KEY,
        async force => {
          const { data } = await api.get<StoreFavorite[]>('/favorites', {
            headers: force ? { 'Cache-Control': 'no-store' } : undefined,
          });
          if (!Array.isArray(data)) {
            throw new Error(
              'The favorites response did not contain a favorites list.',
            );
          }
          return data;
        },
        forceRefresh,
      );
      setFavoriteItems(items);
    } catch (error) {
      setFavoritesError(errorMessage(error));
      throw error;
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  const retryCart = useCallback(() => {
    loadCart().catch(error => {
      if (__DEV__) console.warn('[Storefront] Could not reload cart:', error);
    });
  }, [loadCart]);

  const retryFavorites = useCallback(() => {
    loadFavorites(true).catch(error => {
      if (__DEV__)
        console.warn('[Storefront] Could not reload favorites:', error);
    });
  }, [loadFavorites]);

  const clearCartItems = async () => {
    await api.delete('/cart/clear');
    await loadCart();
  };

  const refreshActiveTab = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'Cart') {
        await loadCart();
      } else if (activeTab === 'Favorites') {
        await loadFavorites(true);
      } else if (activeTab === 'Combos') {
        await fetchCachedApiData(
          COMBOS_CACHE_KEY,
          async force => {
            const { data } = await api.get<{ combos?: StoreProduct[] }>(
              '/combos',
              {
                params: { page: 1, limit: 100, status: 'Active' },
                headers: force ? { 'Cache-Control': 'no-store' } : undefined,
              },
            );
            if (!Array.isArray(data?.combos)) {
              throw new Error(
                'The combos response did not contain a combo list.',
              );
            }
            return data.combos;
          },
          true,
        );
        setComboRefreshKey(key => key + 1);
      } else {
        await loadStore(true);
        setHomeRefreshKey(key => key + 1);
      }
    } catch (error) {
      if (__DEV__) console.warn('[Storefront] Could not refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, loadCart, loadFavorites, loadStore]);

  const retryStore = useCallback(async () => {
    setRefreshing(true);
    await loadStore(true);
    setRefreshing(false);
  }, [loadStore]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'Home' || activeTab === 'Shop') {
        await loadStore();
      } else if (activeTab === 'Cart') {
        await loadCart();
      } else if (activeTab === 'Favorites') {
        await loadFavorites();
      } else if (activeTab === 'Combos') {
        setComboRefreshKey(k => k + 1);
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, loadStore, loadCart, loadFavorites]);

  const handleTabPress = useCallback(
    (tab: StoreTab) => {
      if (
        (tab === 'Cart' && requestLogin('view your cart')) ||
        (tab === 'Favorites' && requestLogin('view your favorites'))
      ) {
        return;
      }
      setDetailTarget(null);
      setCheckoutOpen(false);
      if (tab !== 'Profile' || activeTab !== 'Profile') {
        setAccountSubScreen('menu');
        setMoreDestination('menu');
      } else if (moreDestination === 'account') {
        setAccountSubScreen('menu');
        setMoreDestination('menu');
      }
      setActiveTab(tab);
    },
    [activeTab, moreDestination, requestLogin],
  );

  const deleteAccount = () => {
    if (deletingAccount) return;
    showUserAlert(
      'Confirm account deletion',
      'Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await api.delete('/users/me');
              showUserAlert(
                'Account deleted',
                'Your account has been deleted.',
                [{ text: 'OK', onPress: onLogoutPress }],
              );
            } catch (error) {
              showUserAlert(
                'Delete failed',
                accountDeletionErrorMessage(error),
              );
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (isGuest) return;
    loadCart().catch(error => {
      if (__DEV__) console.warn('[Storefront] Could not load the cart:', error);
    });
    loadFavorites().catch(error => {
      if (__DEV__)
        console.warn('[Storefront] Could not load favorites:', error);
    });
  }, [isGuest, loadCart, loadFavorites]);

  const favoriteIds = useMemo(
    () => favoriteItems.map(favoriteKey),
    [favoriteItems],
  );
  const cartCount = cartItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return storeData.products.filter(product => {
      const matchesCategory =
        !selectedCategory || productCategory(product) === selectedCategory;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        productCategory(product).toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory, storeData.products]);

  const favoriteProducts = favoriteItems;
  const cartTotal = cartItems.reduce(
    (total, item) =>
      total +
      Number(item.total_price ?? Number(item.price) * Number(item.quantity)),
    0,
  );

  const toggleFavorite = async (productId: string, productName?: string) => {
    if (requestLogin('save favorites')) return;
    if (
      pendingFavoriteIds.includes(productId) ||
      clearingFavorites ||
      addingFavoritesToCart
    ) {
      return;
    }
    const savedFavorite = favoriteItems.find(
      item => favoriteKey(item) === productId,
    );
    const isCombo =
      savedFavorite?.item_type === 'combo' || productId.startsWith('combo-');
    const name =
      productName?.trim() ||
      savedFavorite?.name ||
      storeData.products.find(
        product => String(product.product_id ?? product.id) === productId,
      )?.name ||
      (isCombo ? 'Combo' : 'Product');
    const numericId = Number(
      isCombo ? productId.replace(/^combo-/, '') : productId,
    );
    if (!Number.isSafeInteger(numericId) || numericId < 1) {
      showUserAlert('Favorites unavailable', 'This item has an invalid ID.');
      return;
    }

    setPendingFavoriteIds(current => [...current, productId]);
    try {
      if (savedFavorite) {
        await api.delete(
          isCombo
            ? `/favorites/combos/${numericId}`
            : `/favorites/${numericId}`,
        );
        setFavoriteItems(current =>
          current.filter(item => favoriteKey(item) !== productId),
        );
      } else if (isCombo) {
        await api.post(`/favorites/combos/${numericId}`);
        await loadFavorites();
      } else {
        await api.post('/favorites', { product_id: numericId });
        await loadFavorites(true);
      showUserToast(
        `${name} ${savedFavorite ? 'removed from wishlist' : 'added to wishlist'}`,
      );
      }
    } catch (error) {
      showUserAlert('Favorites could not be updated', errorMessage(error));
    } finally {
      setPendingFavoriteIds(current => current.filter(id => id !== productId));
    }
  };

  const confirmRemoveFavorite = (productId: string) => {
    const favorite = favoriteItems.find(
      item => favoriteKey(item) === productId,
    );
    if (
      !favorite ||
      pendingFavoriteIds.includes(productId) ||
      clearingFavorites ||
      addingFavoritesToCart
    ) {
      return;
    }

    showUserAlert(
      'Remove favorite?',
      `Remove ${favorite.name} from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => toggleFavorite(productId),
        },
      ],
    );
  };

  const clearFavorites = () => {
    if (
      !favoriteItems.length ||
      clearingFavorites ||
      addingFavoritesToCart ||
      pendingFavoriteIds.length > 0
    ) {
      return;
    }

    showUserAlert(
      'Clear favorites?',
      `Remove all ${favoriteItems.length} saved items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setClearingFavorites(true);
            try {
              for (const favorite of favoriteItems) {
                const key = favoriteKey(favorite);
                const isCombo = favorite.item_type === 'combo';
                const numericId = Number(key.replace(/^combo-/, ''));
                if (!Number.isSafeInteger(numericId) || numericId < 1) {
                  throw new Error('A favorite item has an invalid ID.');
                }

                await api.delete(
                  isCombo
                    ? `/favorites/combos/${numericId}`
                    : `/favorites/${numericId}`,
                );
                setFavoriteItems(current =>
                  current.filter(item => favoriteKey(item) !== key),
                );
              }
              setFavoritesError(null);
            } catch (error) {
              showUserAlert(
                'Favorites could not be cleared',
                errorMessage(error),
              );
            } finally {
              setClearingFavorites(false);
            }
          },
        },
      ],
    );
  };

  const addToCart = async (
    productId: string,
    options: string | StoreAddToCartOptions = {},
  ): Promise<boolean> => {
    if (requestLogin('add items to your cart')) return false;
    if (pendingCartIds.includes(productId)) return false;
    setPendingCartIds(current => [...current, productId]);
    let name =
      typeof options === 'string'
        ? options.trim()
        : options.name?.trim() ?? '';
    const cartOptions =
      typeof options === 'object' && options !== null ? options : {};
    const quantity = cartOptions.quantity ?? 1;
    try {
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error('Choose a valid quantity.');
      }

      if (productId.startsWith('combo-')) {
        const comboId = Number(productId.replace(/^combo-/, ''));
        if (!Number.isSafeInteger(comboId) || comboId < 1) {
          throw new Error('This item has an invalid ID.');
        }
        name =
          name ||
          favoriteItems.find(
            item =>
              item.item_type === 'combo' &&
              `combo-${item.combo_id ?? String(item.id).replace(/^combo-/, '')}` ===
                productId,
          )?.name ||
          'Combo';
        await api.post('/cart', { combo_id: comboId, quantity });
      } else {
        const product =
          storeData.products.find(
            item => String(item.product_id ?? item.id) === productId,
          ) ?? favoriteItems.find(item => favoriteKey(item) === productId);
        const numericProductId = Number(product?.product_id ?? product?.id);
        if (
          !product ||
          !Number.isSafeInteger(numericProductId) ||
          numericProductId < 1
        ) {
          throw new Error('This product is no longer available.');
        }
        name = name || product.name;
        const variants = Array.isArray(product.variants) ? product.variants : [];
        const variant = variants[0];
        const variantColor =
          cartOptions.variantColor ||
          variant?.colorName ||
          variant?.color ||
          variant?.colour ||
          'Default';
        const variantSize =
          cartOptions.variantSize ??
          variant?.size ??
          variant?.selectedSizes?.[0] ??
          (variants.length ? 'Free Size' : '');

        await api.post('/cart', {
          product_id: numericProductId,
          variant_color: variantColor,
          variant_size: variantSize,
          quantity,
        });
      }
      if (cartOptions.refreshCart !== false) await loadCart();
      showUserToast(`${name || 'Product'} added to cart`);
      return true;
    } catch (error) {
      if (cartOptions.showError === false) {
        if (__DEV__) console.warn('[Storefront] Could not add favorite to cart:', error);
      } else {
        showUserAlert('Could not add to cart', errorMessage(error));
      }
      return false;
    } finally {
      setPendingCartIds(current => current.filter(id => id !== productId));
    }
  };

  const addAllFavoritesToCart = async () => {
    if (
      !favoriteItems.length ||
      addingFavoritesToCart ||
      clearingFavorites ||
      pendingCartIds.length > 0
    ) {
      return;
    }

    setAddingFavoritesToCart(true);
    let addedCount = 0;
    let failedCount = 0;
    try {
      for (const favorite of favoriteItems) {
        const added = await addToCart(favoriteKey(favorite), {
          refreshCart: false,
          showError: false,
        });
        if (added) addedCount += 1;
        else failedCount += 1;
      }

      if (addedCount > 0) {
        try {
          await loadCart();
        } catch (error) {
          showUserAlert('Cart could not be refreshed', errorMessage(error));
          return;
        }
      }

      if (failedCount > 0) {
        showUserAlert(
          'Some favorites could not be added',
          `${addedCount} added, ${failedCount} could not be added. Check availability and try again.`,
        );
      } else {
        showUserAlert(
          'Added to cart',
          `${addedCount} favorite ${addedCount === 1 ? 'item was' : 'items were'} added to your cart.`,
        );
      }
    } finally {
      setAddingFavoritesToCart(false);
    }
  };

  const buyNow = (item: StoreBuyNowItem) => {
    if (requestLogin('place an order')) return;
    setBuyNowItem(item);
    setDetailTarget(null);
    setCheckoutOpen(true);
    setActiveTab('Cart');
  };

  const updateCartQuantity = async (item: StoreCartItem, quantity: number) => {
    const itemId = String(item.id);
    if (pendingCartIds.includes(itemId)) return;
    setPendingCartIds(current => [...current, itemId]);
    try {
      await api.put(`/cart/${item.id}`, { quantity });
      await loadCart();
    } catch (error) {
      showUserAlert('Cart could not be updated', errorMessage(error));
    } finally {
      setPendingCartIds(current => current.filter(id => id !== itemId));
    }
  };

  const removeFromCart = (item: StoreCartItem) => {
    const itemId = String(item.id);
    if (pendingCartIds.includes(itemId)) return;
    showUserAlert(
      'Remove item?',
      `Remove ${item.name} from your cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (pendingCartIds.includes(itemId)) return;
            setPendingCartIds(current => [...current, itemId]);
            try {
              await api.delete(`/cart/${item.id}`);
              await loadCart();
            } catch (error) {
              showUserAlert(
                'Cart item could not be removed',
                errorMessage(error),
              );
            } finally {
              setPendingCartIds(current =>
                current.filter(id => id !== itemId),
              );
            }
          },
        },
      ],
    );
  };

  const clearCart = () => {
    if (!cartItems.length || clearingCart || pendingCartIds.length > 0) return;
    showUserAlert('Clear cart?', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          setClearingCart(true);
          try {
            await clearCartItems();
          } catch (error) {
            showUserAlert('Could not clear cart', errorMessage(error));
          } finally {
            setClearingCart(false);
          }
        },
      },
    ]);
  };

  const openItemDetails = (productId: string) => {
    const itemType = productId.startsWith('combo-') ? 'combo' : 'product';
    const rawId =
      itemType === 'combo' ? productId.slice('combo-'.length) : productId;
    const numericId = Number(rawId);
    if (!Number.isSafeInteger(numericId) || numericId < 1) {
      showUserAlert('Details unavailable', 'This item has an invalid ID.');
      return;
    }

    setDetailItemName('');
    setDetailTarget({ itemId: String(numericId), itemType });
  };

  // ── Determine whether we're on an "inner page" ──────────────────────────────
  // Inner pages: product/combo detail view, or any account sub-screen
  const isDetailPage = Boolean(detailTarget);
  const isMoreContentPage =
    activeTab === 'Profile' &&
    (moreDestination === 'about' || moreDestination === 'contact');
  const isAccountSubPage =
    activeTab === 'Profile' &&
    moreDestination === 'account' &&
    accountSubScreen !== 'menu';
  const isInnerPage = isDetailPage || isMoreContentPage || isAccountSubPage;

  // Title / subtitle shown in the inner header
  const innerPageTitle = (() => {
    if (isDetailPage) {
      return detailItemName ||
        (detailTarget!.itemType === 'combo' ? 'Combo Details' : 'Product Details');
    }
    if (moreDestination === 'about') return 'About Us';
    if (moreDestination === 'contact') return 'Contact Us';
    if (accountSubScreen === 'profile') return 'Profile';
    if (accountSubScreen === 'addresses') return 'Addresses';
    if (accountSubScreen === 'orders') return 'Your Orders';
    if (accountSubScreen === 'password') return 'Set Password';
    return '';
  })();

  const innerPageSubtitle = (() => {
    if (accountSubScreen === 'profile') return 'Update your personal information';
    if (accountSubScreen === 'addresses') return 'Manage your delivery addresses';
    if (accountSubScreen === 'orders') return 'Track and manage your orders';
    if (accountSubScreen === 'password') return 'Change or set your account password';
    return undefined;
  })();

  const handleInnerBack = () => {
    if (isDetailPage) {
      setDetailTarget(null);
      setDetailItemName('');
    } else if (moreDestination === 'about' || moreDestination === 'contact') {
      setMoreDestination('menu');
    } else {
      setAccountSubScreen('menu');
    }
  };

  // ── Android hardware back button ──────────────────────────────────────────
  useEffect(() => {
    const onBackPress = () => {
      // Step 1: Close checkout → go back to Cart
      if (checkoutOpen) {
        setCheckoutOpen(false);
        setBuyNowItem(null);
        return true;
      }

      // Step 2: Close any detail / inner page (product, combo, account sub-screen)
      if (isDetailPage) {
        setDetailTarget(null);
        return true;
      }
      if (isMoreContentPage) {
        setMoreDestination('menu');
        return true;
      }
      if (isAccountSubPage) {
        setAccountSubScreen('menu');
        return true;
      }

      // Step 3: Non-home tabs → navigate to Home
      if (activeTab !== 'Home') {
        handleTabPress('Home');
        return true;
      }

      // Step 4: Already on Home → show exit confirmation
      showUserAlert(
        'Exit App',
        'Are you sure you want to exit?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: () => BackHandler.exitApp(),
          },
        ],
      );
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    return () => subscription.remove();
  }, [
    checkoutOpen,
    isDetailPage,
    isMoreContentPage,
    isAccountSubPage,
    activeTab,
    handleTabPress,
    showUserAlert,
  ]);

  const renderTabContent = () => {
    if (detailTarget) {
      const actionId =
        detailTarget.itemType === 'combo'
          ? `combo-${detailTarget.itemId}`
          : detailTarget.itemId;
      const detailProps = {
        itemId: detailTarget.itemId,
        favorite: favoriteIds.includes(actionId),
        onFavoritePress: toggleFavorite,
        onAddToCart: addToCart,
        onBuyNow: buyNow,
        onNameLoaded: setDetailItemName,
      };
      return detailTarget.itemType === 'combo' ? (
        <ComboDetails
          key={`combo-${detailTarget.itemId}`}
          {...detailProps}
          relatedProducts={storeData.products}
          favoriteIds={favoriteIds}
          onProductPress={openItemDetails}
        />
      ) : (
        <ProductDetails
          key={`product-${detailTarget.itemId}`}
          {...detailProps}
          relatedProducts={storeData.products}
          favoriteIds={favoriteIds}
          onProductPress={openItemDetails}
        />
      );
    }

    if (activeTab === 'Home') {
      return (
        <Home
          refreshKey={homeRefreshKey}
          categories={storeData.categories}
          products={storeData.products}
          heroBanners={storeData.heroBanners}
          offerBanners={storeData.offerBanners}
          favorites={favoriteIds}
          onCategoryPress={category => {
            setSelectedCategory(category);
            setActiveTab('Shop');
          }}
          onExplorePress={() => setActiveTab('Shop')}
          onRoomPress={roomSlug => {
            setSelectedCategory('');
            setSearch(roomSlug.replace(/-/g, ' '));
            setActiveTab('Shop');
          }}
          onCustomFurniturePress={() =>
            showUserAlert(
              'Custom furniture',
              'Contact Q Living to discuss your design and request a quote.',
            )
          }
          onFavoritePress={toggleFavorite}
          onAddToCart={addToCart}
          onProductPress={openItemDetails}
        />
      );
    }

    if (activeTab === 'Shop') {
      return (
        <Shop
          categories={storeData.categories}
          products={visibleProducts}
          favorites={favoriteIds}
          search={search}
          selectedCategory={selectedCategory}
          onSearchChange={setSearch}
          onCategoryChange={setSelectedCategory}
          onFavoritePress={toggleFavorite}
          onAddToCart={addToCart}
          onProductPress={openItemDetails}
          refreshing={refreshing}
          onRefresh={retryStore}
        />
      );
    }

    if (activeTab === 'Combos') {
      return (
        <ComboOffers
          refreshKey={comboRefreshKey}
          key={comboRefreshKey}
          favorites={favoriteIds}
          onFavoritePress={toggleFavorite}
          onAddToCart={addToCart}
          onProductPress={openItemDetails}
        />
      );
    }

    if (activeTab === 'Favorites') {
      return (
        <Favorites
          favorites={favoriteProducts}
          pendingFavoriteIds={pendingFavoriteIds}
          loading={favoritesLoading}
          error={favoritesError}
          clearing={clearingFavorites}
          addingAllToCart={addingFavoritesToCart}
          onRetry={retryFavorites}
          onRefresh={loadFavorites}
          onRemoveFavorite={confirmRemoveFavorite}
          onProductPress={openItemDetails}
          onClearAll={clearFavorites}
          onAddAllToCart={addAllFavoritesToCart}
          onExplorePress={() => setActiveTab('Shop')}
        />
      );
    }

    if (activeTab === 'Cart') {
      if (checkoutOpen) {
        return (
          <Checkout
            items={buyNowItem ? [buyNowItem] : cartItems}
            buyNowItem={buyNowItem}
            onBack={() => {
              setCheckoutOpen(false);
              setBuyNowItem(null);
            }}
            onOrderPlaced={async () => {
              invalidateCachedApiData('user.orders');
              try {
                await clearCartItems();
              } catch (error) {
                showUserAlert(
                  'Order placed, but cart could not be cleared',
                  errorMessage(error),
                );
                loadCart().catch(refreshError => {
                  if (__DEV__)
                    console.warn(
                      '[Storefront] Could not reload cart after checkout:',
                      refreshError,
                    );
                });
              }
              setCheckoutOpen(false);
              setBuyNowItem(null);
            }}
          />
        );
      }
      return (
        <Cart
          items={cartItems}
          total={cartTotal}
          loading={cartLoading}
          error={cartError}
          pendingItemIds={pendingCartIds}
          clearing={clearingCart}
          onRetry={retryCart}
          onRefresh={loadCart}
          onQuantityChange={updateCartQuantity}
          onRemove={removeFromCart}
          onClear={clearCart}
          onExplorePress={() => setActiveTab('Shop')}
          onCheckoutPress={() => {
            setBuyNowItem(null);
            setCheckoutOpen(true);
          }}
        />
      );
    }

    if (moreDestination === 'menu') {
      return (
        <MoreMenu
          onSelect={destination => {
            if (
              destination === 'account' &&
              requestLogin('open your account')
            ) {
              return;
            }
            setMoreDestination(destination);
          }}
        />
      );
    }

    if (moreDestination === 'about') {
      return (
        <AboutUs
          onExplorePress={() => {
            setMoreDestination('menu');
            handleTabPress('Shop');
          }}
        />
      );
    }

    if (moreDestination === 'contact') {
      return <ContactUs />;
    }

    // My Account destination in the More tab
    return accountSubScreen === 'profile' ? (
      <ProfileScreen
        onBack={() => setAccountSubScreen('menu')}
        onDeleteAccount={deleteAccount}
        deletingAccount={deletingAccount}
      />
    ) : accountSubScreen === 'addresses' ? (
      <AddressesScreen onBack={() => setAccountSubScreen('menu')} />
    ) : accountSubScreen === 'orders' ? (
      <OrdersScreen onBack={() => setAccountSubScreen('menu')} />
    ) : accountSubScreen === 'password' ? (
      <SetPasswordScreen onBack={() => setAccountSubScreen('menu')} />
    ) : (
      <AccountScreen
        onLogoutPress={onLogoutPress}
        onDeleteAccount={deleteAccount}
        deletingAccount={deletingAccount}
        onSubScreenChange={screen => setAccountSubScreen(screen)}
      />
    );
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  if (isInnerPage) {
    // Inner page: fixed header at top (with safe-area inset baked in), no bottom tab bar
    return (
      <View className="flex-1 bg-[#FCFAF7]">
        <InnerPageHeader
          title={innerPageTitle}
          subtitle={innerPageSubtitle}
          onBack={handleInnerBack}
          topInset={insets.top}
        />
        {isDetailPage ? (
          // Detail pages use a ScrollView; the inner content already has padding
          <ScrollView
            key={`${detailTarget!.itemType}-${detailTarget!.itemId}`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 32) }}
          >
            {renderTabContent()}
          </ScrollView>
        ) : (
          // Account sub-screens manage their own scroll
          <View
            className="flex-1"
            style={{ paddingBottom: insets.bottom }}
          >
            {renderTabContent()}
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FCFAF7]">
      <StatusBar barStyle="light-content" />
      <Header
        activeTab={activeTab}
        isGuest={isGuest}
        favoriteCount={favoriteItems.length}
        topInset={insets.top}
        onFavoritesPress={() => handleTabPress('Favorites')}
        onProfilePress={() => {
          if (requestLogin('open your account')) return;
          setDetailTarget(null);
          setCheckoutOpen(false);
          setBuyNowItem(null);
          setAccountSubScreen('menu');
          setMoreDestination('account');
          setActiveTab('Profile');
        }}
        onLogoutPress={onLogoutPress}
      />
      {loading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={retryStore}
              tintColor="#F97316"
            />
          }
          contentContainerClassName="pb-[115px]">
          <SkeletonList
            count={5}
            horizontal
            cardWidth={(screenWidth - 36) / 2}
          />
        </ScrollView>
      ) : !storeAvailable && loadError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[14px] text-[#8B2D20]">
            {loadError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={retryStore}
            className="mt-4 rounded-full bg-[#F97316] px-5 py-3"
          >
            <Text className="text-[13px] font-bold text-white">
              {refreshing ? 'Retrying...' : 'Try again'}
            </Text>
          </Pressable>
        </View>
      ) : activeTab === 'Profile' ||
        activeTab === 'Shop' ||
        activeTab === 'Favorites' ||
        (activeTab === 'Cart' && !checkoutOpen) ? (
        // Profile, Shop, Cart, and Favorites manage their own scroll/layout.
        // paddingBottom accounts for the absolute-positioned tab bar (~65px) + home indicator
        <View
          className="flex-1"
          style={{
            paddingBottom: Math.max(
              insets.bottom + 65,
              activeTab === 'Cart' || activeTab === 'Favorites' ? 115 : 90,
            ),
          }}
        >
          {storeAvailable && loadError ? (
            <View className="mx-4 mt-3 rounded-[14px] bg-[#FFF0E1] p-3">
              <Text className="text-[12px] text-[#8B2D20]">{loadError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={retryStore}
                className="mt-2 self-start"
              >
                <Text className="text-[12px] font-bold text-[#9B4E17]">
                  {refreshing ? 'Retrying...' : 'Try again'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {renderTabContent()}
        </View>
      ) : (
        <ScrollView
          key={activeTab}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName={
            activeTab === 'Home' ? 'pb-[160px]' : 'pb-[115px]'
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshActiveTab}
              tintColor="#F97316"
            />
          }
        >
          {storeAvailable && loadError ? (
            <View className="mx-4 mt-3 rounded-[14px] bg-[#FFF0E1] p-3">
              <Text className="text-[12px] text-[#8B2D20]">{loadError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={retryStore}
                className="mt-2 self-start"
              >
                <Text className="text-[12px] font-bold text-[#9B4E17]">
                  {refreshing ? 'Retrying...' : 'Try again'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {renderTabContent()}
        </ScrollView>
      )}
      <Tabs
        activeTab={activeTab}
        cartCount={cartCount}
        bottomInset={insets.bottom}
        onTabPress={handleTabPress}
      />
    </View>
  );
}
