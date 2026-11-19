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
import { Armchair, Heart, ShoppingCart, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';
import Header from './Header';
import Home from './Home/Home';
import ProductCard from './ProductCard';
import Shop from './Shop/Shop';
import Tabs from './Tabs';
import type { StoreBanner, StoreCategory, StoreProduct, StoreTab } from './types';
import { formatPrice, productCategory, productImage, productPrice } from './utils';
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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
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

  const cartCount = Object.values(cart).reduce((total, count) => total + count, 0);

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

  const favoriteProducts = storeData.products.filter(product =>
    favorites.includes(String(product.id)),
  );
  const cartProducts = storeData.products.filter(
    product => (cart[String(product.id)] ?? 0) > 0,
  );
  const cartTotal = cartProducts.reduce(
    (total, product) =>
      total + productPrice(product) * (cart[String(product.id)] ?? 0),
    0,
  );

  const toggleFavorite = (productId: string) => {
    setFavorites(current =>
      current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId],
    );
  };

  const addToCart = (productId: string) => {
    setCart(current => ({
      ...current,
      [productId]: (current[productId] ?? 0) + 1,
    }));
  };

  const renderProductGrid = (products: StoreProduct[]) => (
    <View className="flex-row flex-wrap justify-between">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          favorite={favorites.includes(String(product.id))}
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
          favorites={favorites}
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
          favorites={favorites}
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
          {favoriteProducts.length ? renderProductGrid(favoriteProducts) : (
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
          {cartProducts.length ? (
            <>
              {cartProducts.map(product => (
                <View key={product.id} className="mb-3 flex-row items-center rounded-[16px] bg-white p-3">
                  {productImage(product) ? (
                    <Image
                      source={{ uri: productImage(product) }}
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
                      {product.name}
                    </Text>
                    <Text className="mt-1 text-[13px] text-[#634D3B]">
                      {formatPrice(productPrice(product))} · Qty {cart[String(product.id)]}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove one ${product.name} from cart`}
                    onPress={() =>
                      setCart(current => {
                        const next = { ...current };
                        const id = String(product.id);
                        if (next[id] <= 1) delete next[id];
                        else next[id] -= 1;
                        return next;
                      })
                    }
                    className="h-[36px] w-[36px] items-center justify-center rounded-full bg-[#FFF0E1]">
                    <X size={18} color="#634D3B" />
                  </Pressable>
                </View>
              ))}
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
        <View className="flex-1 pb-[65px]">
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
