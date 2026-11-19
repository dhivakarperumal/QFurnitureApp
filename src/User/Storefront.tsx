import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';
import Header from './Header';
import Home from './Home/Home';
import ItemDetails from './ItemDetails';
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

export default function Storefront({
  onLogoutPress,
}: {
  onLogoutPress: () => void;
}) {
  const insets = useSafeAreaInsets();
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
      if (tab !== 'Profile') setAccountSubScreen('menu');
      setActiveTab(tab);
      if (tab === 'Cart') retryCart();
      if (tab === 'Favorites') retryFavorites();
    },
    [retryCart, retryFavorites],
  );

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

  const addToCart = async (productId: string) => {
    if (pendingCartIds.includes(productId)) return;
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
    } catch (error) {
      Alert.alert('Could not add to cart', errorMessage(error));
    } finally {
      setPendingCartIds(current => current.filter(id => id !== productId));
    }
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

  const renderTabContent = () => {
    if (detailTarget) {
      const actionId =
        detailTarget.itemType === 'combo'
          ? `combo-${detailTarget.itemId}`
          : detailTarget.itemId;
      return (
        <ItemDetails
          itemId={detailTarget.itemId}
          itemType={detailTarget.itemType}
          favorite={favoriteIds.includes(actionId)}
          onBack={() => setDetailTarget(null)}
          onFavoritePress={toggleFavorite}
          onAddToCart={addToCart}
        />
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
            setActiveTab('Explore');
          }}
          onExplorePress={() => setActiveTab('Explore')}
          onRoomPress={roomSlug => {
            setSelectedCategory('');
            setSearch(roomSlug.replace(/-/g, ' '));
            setActiveTab('Explore');
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

    if (activeTab === 'Explore') {
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
          onExplorePress={() => setActiveTab('Explore')}
          onCheckoutPress={() => setCheckoutOpen(true)}
        />
      );
    }

    return (
      // Account sub-screens (each screen manages its own scroll/layout)
      accountSubScreen === 'profile' ? (
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
      )
    );
  };

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#FCFAF7]">
      <Header
        cartCount={cartCount}
        onSearchPress={() => handleTabPress('Explore')}
        onCartPress={() => handleTabPress('Cart')}
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
      ) : activeTab === 'Profile' ? (
        // Account screens manage their own scroll — render directly without wrapper
        // paddingBottom accounts for the absolute-positioned tab bar (~65px) + home indicator
        <View
          className="flex-1"
          style={{ paddingBottom: Math.max(insets.bottom + 65, 90) }}
        >
          {renderTabContent()}
        </View>
      ) : (
        <ScrollView
          key={
            detailTarget
              ? `${detailTarget.itemType}-${detailTarget.itemId}`
              : activeTab
          }
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
