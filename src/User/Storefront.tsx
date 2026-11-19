import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  Armchair,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';
import Header from './Header';
import Home from './Home/Home';
import ProductCard from './ProductCard';
import Shop from './Shop/Shop';
import Tabs from './Tabs';
import type {
  StoreBanner,
  StoreCartItem,
  StoreCategory,
  StoreFavorite,
  StoreProduct,
  StoreTab,
} from './types';
import {
  formatPrice,
  mediaUrl,
  productCategory,
  productImage,
} from './utils';
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
  const [accountSubScreen, setAccountSubScreen] = useState<AccountSubScreen>('menu');

  // Reset account sub-screen when switching away from Profile tab
  const handleTabPress = useCallback((tab: StoreTab) => {
    if (tab !== 'Profile') setAccountSubScreen('menu');
    setActiveTab(tab);
  }, []);

  const loadStore = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [categoriesResponse, productsResponse, heroResponse, offerResponse] =
        await Promise.all([
          api.get<StoreCategory[]>('/categories'),
          api.get<{ products?: StoreProduct[] }>('/products', {
            params: { page: 1, limit: 100, search: '', status: 'All' },
          }),
          api.get<{ banners?: StoreBanner[] }>('/banners/hero'),
          api.get<{ banners?: StoreBanner[] }>('/banners/offers'),
        ]);

      if (!Array.isArray(categoriesResponse.data)) {
        throw new Error('The categories response did not contain a category list.');
      }
      if (!Array.isArray(productsResponse.data?.products)) {
        throw new Error('The products response did not contain a product list.');
      }
      if (!Array.isArray(heroResponse.data?.banners)) {
        throw new Error('The hero banner response did not contain a banner list.');
      }
      if (!Array.isArray(offerResponse.data?.banners)) {
        throw new Error('The offer banner response did not contain a banner list.');
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
        throw new Error('The favorites response did not contain a favorites list.');
      }
      setFavoriteItems(data);
    } catch (error) {
      setFavoritesError(errorMessage(error));
      throw error;
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart().catch(error => {
      if (__DEV__) console.warn('[Storefront] Could not load the cart:', error);
    });
    loadFavorites().catch(error => {
      if (__DEV__) console.warn('[Storefront] Could not load favorites:', error);
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
        ? `combo-${item.combo_id ?? String(item.id).replace(/^combo-/, '')}` === productId
        : String(item.product_id ?? item.id) === productId,
    );
    const isCombo = savedFavorite?.item_type === 'combo' || productId.startsWith('combo-');
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
          isCombo ? `/favorites/combos/${numericId}` : `/favorites/${numericId}`,
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
      setPendingFavoriteIds(current =>
        current.filter(id => id !== productId),
      );
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
        const product = storeData.products.find(
          item => String(item.id) === productId,
        ) ?? favoriteItems.find(item => String(item.id) === productId);
        const numericProductId = Number(product?.product_id ?? product?.id);
        if (!product || !Number.isSafeInteger(numericProductId) || numericProductId < 1) {
          throw new Error('This product is no longer available.');
        }
        const variants = product.variants ?? [];
        const variant = variants[0];
        const variantColor =
          variant?.colorName ?? variant?.color ?? variant?.colour ?? 'Default';
        const variantSize =
          variant?.size ?? variant?.selectedSizes?.[0] ?? (variants.length ? 'Free Size' : '');

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

  const renderProductGrid = (products: StoreProduct[]) => (
    <View className="flex-row flex-wrap justify-between">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          favorite={favoriteIds.includes(String(product.id))}
          compact
          onFavoritePress={toggleFavorite}
          onAddToCart={addToCart}
        />
      ))}
    </View>
  );

  const renderTabContent = () => {
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
        />
      );
    }

    if (activeTab === 'Favorites') {
      return (
        <View className="px-4 pt-5">
          <Text className="mb-4 text-[25px] font-black text-[#351D0E]">Your favorites</Text>
          {favoritesLoading ? (
            <ActivityIndicator color="#F97316" />
          ) : favoritesError ? (
            <View className="items-center rounded-[20px] bg-white px-6 py-8">
              <Text className="text-center text-[13px] text-[#8B2D20]">{favoritesError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => loadFavorites().catch(error => {
                  if (__DEV__) console.warn('[Storefront] Could not reload favorites:', error);
                })}
                className="mt-4 rounded-full bg-[#F97316] px-4 py-2">
                <Text className="text-[12px] font-bold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : favoriteProducts.length ? renderProductGrid(favoriteProducts) : (
            <View className="items-center rounded-[20px] bg-white px-6 py-10">
              <Heart size={34} color="#F97316" />
              <Text className="mt-3 text-[15px] font-bold text-[#351D0E]">No favorites yet</Text>
              <Text className="mt-1 text-center text-[13px] text-[#8B735E]">
                Tap the heart on furniture you love.
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (activeTab === 'Cart') {
      return (
        <View className="px-4 pt-5">
          <Text className="mb-4 text-[25px] font-black text-[#351D0E]">Your cart</Text>
          {cartLoading ? (
            <ActivityIndicator color="#F97316" />
          ) : cartError ? (
            <View className="items-center rounded-[20px] bg-white px-6 py-8">
              <Text className="text-center text-[13px] text-[#8B2D20]">{cartError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => loadCart().catch(error => {
                  if (__DEV__) console.warn('[Storefront] Could not reload cart:', error);
                })}
                className="mt-4 rounded-full bg-[#F97316] px-4 py-2">
                <Text className="text-[12px] font-bold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : cartItems.length ? (
            <>
              {cartItems.map(item => {
                const imageUri = mediaUrl(item.image) ?? productImage(item);
                const itemQuantity = Number(item.quantity);
                const busy = pendingCartIds.includes(String(item.id));
                return (
                <View key={item.id} className="mb-3 flex-row items-center rounded-[16px] bg-white p-3">
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      className="h-[72px] w-[72px] rounded-[12px]"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-[72px] w-[72px] items-center justify-center rounded-[12px] bg-[#F1E5D7]">
                      <Armchair size={30} color="#A78A70" />
                    </View>
                  )}
                  <View className="ml-3 flex-1">
                    <Text numberOfLines={2} className="text-[13px] font-bold text-[#351D0E]">
                      {item.name}
                    </Text>
                    <Text className="mt-1 text-[13px] text-[#634D3B]">
                      {formatPrice(Number(item.price))} · Qty {itemQuantity}
                    </Text>
                    {item.variant_color || item.variant_size ? (
                      <Text numberOfLines={1} className="mt-1 text-[10px] text-[#8B735E]">
                        {[item.variant_color, item.variant_size].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    <Text className="mt-1 text-[12px] font-bold text-[#351D0E]">
                      {formatPrice(Number(item.total_price ?? Number(item.price) * itemQuantity))}
                    </Text>
                  </View>
                  <View className="items-center">
                    <View className="mb-2 flex-row items-center">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Decrease ${item.name} quantity`}
                        disabled={busy || itemQuantity <= 1}
                        onPress={() => updateCartQuantity(item, itemQuantity - 1)}
                        className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#FFF0E1] disabled:opacity-40">
                        <Minus size={15} color="#B94719" />
                      </Pressable>
                      <Text className="mx-2 min-w-[16px] text-center text-[12px] font-bold text-[#351D0E]">
                        {itemQuantity}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Increase ${item.name} quantity`}
                        disabled={busy}
                        onPress={() => updateCartQuantity(item, itemQuantity + 1)}
                        className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#FFF0E1] disabled:opacity-40">
                        <Plus size={15} color="#B94719" />
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.name} from cart`}
                      disabled={busy}
                      onPress={() => removeFromCart(item)}
                      className="h-[30px] w-[30px] items-center justify-center rounded-full disabled:opacity-40">
                      <Trash2 size={16} color="#8B735E" />
                    </Pressable>
                  </View>
                </View>
                );
              })}
              <View className="mt-2 flex-row items-center justify-between rounded-[16px] bg-white p-4">
                <Text className="text-[14px] font-bold text-[#351D0E]">Subtotal</Text>
                <Text className="text-[17px] font-black text-[#351D0E]">{formatPrice(cartTotal)}</Text>
              </View>
            </>
          ) : (
            <View className="items-center rounded-[20px] bg-white px-6 py-10">
              <ShoppingCart size={36} color="#F97316" />
              <Text className="mt-3 text-[15px] font-bold text-[#351D0E]">Your cart is empty</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setActiveTab('Explore')}
                className="mt-4 rounded-full bg-[#F97316] px-5 py-3">
                <Text className="text-[13px] font-bold text-white">Explore furniture</Text>
              </Pressable>
            </View>
          )}
        </View>
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
        onSearchPress={() => setActiveTab('Explore')}
        onCartPress={() => setActiveTab('Cart')}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : loadError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[14px] text-[#8B2D20]">{loadError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={loadStore}
            className="mt-4 rounded-full bg-[#F97316] px-5 py-3">
            <Text className="text-[13px] font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : activeTab === 'Profile' ? (
        // Account screens manage their own scroll — render directly without wrapper
        // paddingBottom accounts for the absolute-positioned tab bar (~65px) + home indicator
        <View className="flex-1" style={{ paddingBottom: Math.max(insets.bottom + 65, 90) }}>
          {renderTabContent()}
        </View>
      ) : (
        <ScrollView
          key={activeTab}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="pb-[115px]">
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
