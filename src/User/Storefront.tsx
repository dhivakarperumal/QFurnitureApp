import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
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
  StoreBanner,
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
import { setUserNavigationBarAppearance } from '../services/navigationBar';

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
      className="bg-white border-b border-[#F0E7DE]"
    >
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          className="mr-3 h-[40px] w-[40px] items-center justify-center rounded-full bg-[#F4EDE6]"
        >
          <ArrowLeft size={20} color="#351D0E" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[17px] font-black text-[#351D0E]">{title}</Text>
          {subtitle ? (
            <Text className="text-[12px] text-[#8B735E]">{subtitle}</Text>
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
  onLogoutPress,
}: {
  onLogoutPress: () => void;
}) {
  const insets = useSafeAreaInsets();
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
  const [storeData, setStoreData] = useState(emptyStoreData);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [favoriteItems, setFavoriteItems] = useState<StoreFavorite[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<StoreCartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);
  const [pendingCartIds, setPendingCartIds] = useState<string[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [accountSubScreen, setAccountSubScreen] =
    useState<AccountSubScreen>('menu');
  const [moreDestination, setMoreDestination] =
    useState<MoreDestination | 'menu'>('menu');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const loadStore = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [
        categoriesResponse,
        productsResponse,
        heroResponse,
        offerResponse,
      ] = await Promise.all([
        api.get<StoreCategory[]>('/categories'),
        api.get<{ products?: StoreProduct[] }>('/products', {
          params: { page: 1, limit: 100, search: '', status: 'All' },
        }),
        api.get<{ banners?: StoreBanner[] }>('/banners/hero'),
        api.get<{ banners?: StoreBanner[] }>('/banners/offers'),
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

      setStoreData({
        categories: categoriesResponse.data,
        products: productsResponse.data.products.filter(
          product =>
            product.status === 'Active' &&
            product.product_type !== 'Combo Product',
        ),
        heroBanners: heroResponse.data.banners,
        offerBanners: offerResponse.data.banners,
      });
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  const loadCart = useCallback(async () => {
    setCartLoading(true);
    setCartError(null);
    try {
      const { data } = await api.get<StoreCartItem[]>('/cart');
      if (!Array.isArray(data)) {
        throw new Error('The cart response did not contain a cart list.');
      }
      setCartItems(data);
    } catch (error) {
      setCartError(errorMessage(error));
      throw error;
    } finally {
      setCartLoading(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    setFavoritesLoading(true);
    setFavoritesError(null);
    try {
      const { data } = await api.get<StoreFavorite[]>('/favorites');
      if (!Array.isArray(data)) {
        throw new Error(
          'The favorites response did not contain a favorites list.',
        );
      }
      setFavoriteItems(data);
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
    loadFavorites().catch(error => {
      if (__DEV__)
        console.warn('[Storefront] Could not reload favorites:', error);
    });
  }, [loadFavorites]);

  const handleTabPress = useCallback(
    (tab: StoreTab) => {
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
      if (tab === 'Cart') retryCart();
      if (tab === 'Favorites') retryFavorites();
    },
    [activeTab, moreDestination, retryCart, retryFavorites],
  );

  const deleteAccount = () => {
    if (deletingAccount) return;
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            setDeletingAccount(true);
            api
              .delete('/users/me')
              .then(() => {
                Alert.alert(
                  'Account deleted',
                  'Your account has been deleted.',
                  [{ text: 'OK', onPress: onLogoutPress }],
                );
              })
              .catch(error => {
                Alert.alert(
                  'Delete failed',
                  accountDeletionErrorMessage(error),
                );
              })
              .finally(() => setDeletingAccount(false));
          },
        },
      ],
    );
  };

  useEffect(() => {
    loadCart().catch(error => {
      if (__DEV__) console.warn('[Storefront] Could not load the cart:', error);
    });
    loadFavorites().catch(error => {
      if (__DEV__)
        console.warn('[Storefront] Could not load favorites:', error);
    });
  }, [loadCart, loadFavorites]);

  const favoriteIds = useMemo(
    () =>
      favoriteItems.map(item =>
        item.item_type === 'combo'
          ? `combo-${item.combo_id ?? String(item.id).replace(/^combo-/, '')}`
          : String(item.product_id ?? item.id),
      ),
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

  const toggleFavorite = async (productId: string) => {
    if (pendingFavoriteIds.includes(productId)) return;
    const savedFavorite = favoriteItems.find(item =>
      item.item_type === 'combo'
        ? `combo-${item.combo_id ?? String(item.id).replace(/^combo-/, '')}` ===
          productId
        : String(item.product_id ?? item.id) === productId,
    );
    const isCombo =
      savedFavorite?.item_type === 'combo' || productId.startsWith('combo-');
    const numericId = Number(
      isCombo ? productId.replace(/^combo-/, '') : productId,
    );
    if (!Number.isSafeInteger(numericId) || numericId < 1) {
      Alert.alert('Favorites unavailable', 'This item has an invalid ID.');
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
      } else if (isCombo) {
        await api.post(`/favorites/combos/${numericId}`);
      } else {
        await api.post('/favorites', { product_id: numericId });
      }
      await loadFavorites();
    } catch (error) {
      Alert.alert('Favorites could not be updated', errorMessage(error));
    } finally {
      setPendingFavoriteIds(current => current.filter(id => id !== productId));
    }
  };

  const addToCart = async (productId: string): Promise<boolean> => {
    if (pendingCartIds.includes(productId)) return false;
    setPendingCartIds(current => [...current, productId]);
    try {
      if (productId.startsWith('combo-')) {
        const comboId = Number(productId.replace(/^combo-/, ''));
        if (!Number.isSafeInteger(comboId) || comboId < 1) {
          throw new Error('This item has an invalid ID.');
        }
        await api.post('/cart', { combo_id: comboId, quantity: 1 });
      } else {
        const product =
          storeData.products.find(item => String(item.id) === productId) ??
          favoriteItems.find(item => String(item.id) === productId);
        const numericProductId = Number(product?.product_id ?? product?.id);
        if (
          !product ||
          !Number.isSafeInteger(numericProductId) ||
          numericProductId < 1
        ) {
          throw new Error('This product is no longer available.');
        }
        const variants = product.variants ?? [];
        const variant = variants[0];
        const variantColor =
          variant?.colorName ?? variant?.color ?? variant?.colour ?? 'Default';
        const variantSize =
          variant?.size ??
          variant?.selectedSizes?.[0] ??
          (variants.length ? 'Free Size' : '');

        await api.post('/cart', {
          product_id: numericProductId,
          variant_color: variantColor,
          variant_size: variantSize,
          quantity: 1,
        });
      }
      await loadCart();
      return true;
    } catch (error) {
      Alert.alert('Could not add to cart', errorMessage(error));
      return false;
    } finally {
      setPendingCartIds(current => current.filter(id => id !== productId));
    }
  };

  const buyNow = async (productId: string) => {
    if (!(await addToCart(productId))) return;
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
      Alert.alert('Cart could not be updated', errorMessage(error));
    } finally {
      setPendingCartIds(current => current.filter(id => id !== itemId));
    }
  };

  const removeFromCart = async (item: StoreCartItem) => {
    const itemId = String(item.id);
    if (pendingCartIds.includes(itemId)) return;
    setPendingCartIds(current => [...current, itemId]);
    try {
      await api.delete(`/cart/${item.id}`);
      await loadCart();
    } catch (error) {
      Alert.alert('Cart item could not be removed', errorMessage(error));
    } finally {
      setPendingCartIds(current => current.filter(id => id !== itemId));
    }
  };

  const openItemDetails = (productId: string) => {
    const itemType = productId.startsWith('combo-') ? 'combo' : 'product';
    const rawId =
      itemType === 'combo' ? productId.slice('combo-'.length) : productId;
    const numericId = Number(rawId);
    if (!Number.isSafeInteger(numericId) || numericId < 1) {
      Alert.alert('Details unavailable', 'This item has an invalid ID.');
      return;
    }

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
    if (isDetailPage) return detailTarget!.itemType === 'combo' ? 'Combo Details' : 'Product Details';
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
    } else if (moreDestination === 'about' || moreDestination === 'contact') {
      setMoreDestination('menu');
    } else {
      setAccountSubScreen('menu');
    }
  };

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
      };
      return detailTarget.itemType === 'combo' ? (
        <ComboDetails {...detailProps} />
      ) : (
        <ProductDetails {...detailProps} />
      );
    }

    if (activeTab === 'Home') {
      return (
        <Home
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
            Alert.alert(
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
        />
      );
    }

    if (activeTab === 'Combos') {
      return (
        <ComboOffers
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
          favoriteIds={favoriteIds}
          loading={favoritesLoading}
          error={favoritesError}
          onRetry={retryFavorites}
          onFavoritePress={toggleFavorite}
          onAddToCart={addToCart}
          onProductPress={openItemDetails}
        />
      );
    }

    if (activeTab === 'Cart') {
      if (checkoutOpen) {
        return (
          <Checkout
            items={cartItems}
            onBack={() => setCheckoutOpen(false)}
            onOrderPlaced={() => {
              setCheckoutOpen(false);
              loadCart().catch(error => {
                if (__DEV__)
                  console.warn(
                    '[Storefront] Could not reload cart after checkout:',
                    error,
                  );
              });
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
          onRetry={retryCart}
          onQuantityChange={updateCartQuantity}
          onRemove={removeFromCart}
          onExplorePress={() => setActiveTab('Shop')}
          onCheckoutPress={() => setCheckoutOpen(true)}
        />
      );
    }

    if (moreDestination === 'menu') {
      return (
        <MoreMenu
          onSelect={setMoreDestination}
          onDeleteAccount={deleteAccount}
          deletingAccount={deletingAccount}
        />
      );
    }

    if (moreDestination === 'about') {
      return <MorePlaceholder message="About Us content will be added here." />;
    }

    if (moreDestination === 'contact') {
      return <MorePlaceholder message="Contact Us details will be added here." />;
    }

    // My Account destination in the More tab
    return accountSubScreen === 'profile' ? (
      <ProfileScreen onBack={() => setAccountSubScreen('menu')} />
    ) : accountSubScreen === 'addresses' ? (
      <AddressesScreen onBack={() => setAccountSubScreen('menu')} />
    ) : accountSubScreen === 'orders' ? (
      <OrdersScreen onBack={() => setAccountSubScreen('menu')} />
    ) : accountSubScreen === 'password' ? (
      <SetPasswordScreen onBack={() => setAccountSubScreen('menu')} />
    ) : (
      <AccountScreen
        onLogoutPress={onLogoutPress}
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
        topInset={insets.top}
        onFavoritesPress={() => handleTabPress('Favorites')}
        onProfilePress={() => {
          setDetailTarget(null);
          setCheckoutOpen(false);
          setAccountSubScreen('menu');
          setMoreDestination('account');
          setActiveTab('Profile');
        }}
        onLogoutPress={onLogoutPress}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : loadError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[14px] text-[#8B2D20]">
            {loadError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={loadStore}
            className="mt-4 rounded-full bg-[#F97316] px-5 py-3"
          >
            <Text className="text-[13px] font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : activeTab === 'Profile' || activeTab === 'Shop' ? (
        // Profile (menu) and Shop manage their own scroll/layout.
        // paddingBottom accounts for the absolute-positioned tab bar (~65px) + home indicator
        <View
          className="flex-1"
          style={{ paddingBottom: Math.max(insets.bottom + 65, 90) }}
        >
          {renderTabContent()}
        </View>
      ) : (
        <ScrollView
          key={activeTab}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="pb-[115px]"
        >
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
