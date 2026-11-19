import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowRight,
  Armchair,
  Heart,
  Home,
  LogOut,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../api';

type StoreTab = 'Home' | 'Explore' | 'Favorites' | 'Cart' | 'Profile';

type StoreCategory = {
  id?: number | string;
  catId?: number | string;
  name: string;
  images?: string[] | string | null;
  image?: string | null;
};

type StoreProduct = {
  id: number | string;
  name: string;
  status?: string;
  product_type?: string;
  category?: string | { name?: string };
  category_name?: string;
  images?: string[] | string | null;
  variants?: Array<{ image?: string | null }>;
  main_image_index?: number | string | null;
  selling_price?: number | string | null;
  offer_price?: number | string | null;
  mrp?: number | string | null;
};

type StoreBanner = {
  id?: number | string;
  title?: string;
  subtitle?: string;
  description?: string;
  offer?: string;
  desktop_image?: string | null;
  mobile_image?: string | null;
};

type StoreData = {
  categories: StoreCategory[];
  products: StoreProduct[];
  heroBanners: StoreBanner[];
  offerBanners: StoreBanner[];
};

const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

function mediaUrl(path?: string | null) {
  if (!path?.trim()) return undefined;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${apiOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
}

function parseImages(images?: string[] | string | null): string[] {
  if (Array.isArray(images)) return images.filter(Boolean);
  if (!images) return [];
  try {
    const parsed: unknown = JSON.parse(images);
    if (Array.isArray(parsed)) {
      return parsed.filter((image): image is string => typeof image === 'string');
    }
  } catch {
    return [images];
  }
  return [images];
}

function productImage(product: StoreProduct) {
  const images = parseImages(product.images);
  const preferredIndex = Number(product.main_image_index);
  const path =
    (Number.isInteger(preferredIndex) && preferredIndex >= 0
      ? images[preferredIndex]
      : undefined) ??
    images[0] ??
    product.variants?.find(variant => variant.image)?.image;
  return mediaUrl(path);
}

function categoryImage(category: StoreCategory) {
  return mediaUrl(parseImages(category.images ?? category.image)[0]);
}

function productCategory(product: StoreProduct) {
  return typeof product.category === 'string'
    ? product.category
    : product.category?.name ?? product.category_name ?? '';
}

function productPrice(product: StoreProduct) {
  const price = Number(
    product.offer_price ?? product.selling_price ?? product.mrp,
  );
  return Number.isFinite(price) ? price : 0;
}

function formatPrice(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
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

const emptyStoreData: StoreData = {
  categories: [],
  products: [],
  heroBanners: [],
  offerBanners: [],
};

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
  const [heroIndex, setHeroIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [userName, setUserName] = useState('');

  const loadStore = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [categoriesResponse, productsResponse, heroResponse, offerResponse] =
        await Promise.all([
          api.get<StoreCategory[]>('/categories'),
          api.get<{ products?: StoreProduct[] }>('/products', {
            params: { page: 1, limit: 30, search: '', status: 'All' },
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

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('user')
      .then(serializedUser => {
        if (!serializedUser) return;
        const user: unknown = JSON.parse(serializedUser);
        if (
          active &&
          typeof user === 'object' &&
          user !== null &&
          'name' in user &&
          typeof user.name === 'string'
        ) {
          setUserName(user.name);
        }
      })
      .catch(error => {
        if (__DEV__) console.warn('[Storefront] Could not read the saved user:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  const heroBanner = storeData.heroBanners[heroIndex];
  const heroImage = mediaUrl(heroBanner?.mobile_image ?? heroBanner?.desktop_image);
  const offerBanner = storeData.offerBanners[0];
  const offerImage = mediaUrl(offerBanner?.mobile_image ?? offerBanner?.desktop_image);
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

  const renderProductCard = (product: StoreProduct, compact = false) => {
    const id = String(product.id);
    const price = productPrice(product);
    const mrp = Number(product.mrp);
    const discount = mrp > price && price > 0
      ? Math.round(((mrp - price) / mrp) * 100)
      : 0;
    const imageUri = productImage(product);

    return (
      <View
        key={id}
        className={`mb-3 overflow-hidden rounded-[20px] border border-[#F0E7DE] bg-white shadow-sm ${
          compact ? 'w-[48%]' : 'w-[258px]'
        }`}>
        <View className="relative h-[170px] overflow-hidden bg-[#F4E9DD]">
          {imageUri ? (
            <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full items-center justify-center">
              <Armchair size={46} color="#A78A70" strokeWidth={1.3} />
            </View>
          )}
          {discount > 0 ? (
            <View className="absolute left-3 top-3 rounded-full bg-[#187A45] px-3 py-1">
              <Text className="text-[11px] font-bold text-white">{discount}% OFF</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              favorites.includes(id) ? 'Remove from favorites' : 'Add to favorites'
            }
            onPress={() => toggleFavorite(id)}
            className="absolute right-3 top-3 h-[36px] w-[36px] items-center justify-center rounded-full bg-white">
            <Heart
              size={19}
              color={favorites.includes(id) ? '#F97316' : '#634D3B'}
              fill={favorites.includes(id) ? '#F97316' : 'transparent'}
            />
          </Pressable>
        </View>
        <View className="p-3">
          <Text numberOfLines={1} className="text-[10px] font-bold uppercase tracking-[1.4px] text-[#A06E46]">
            {productCategory(product) || 'Furniture'}
          </Text>
          <Text numberOfLines={2} className="mt-1 min-h-[40px] text-[14px] font-bold leading-5 text-[#351D0E]">
            {product.name}
          </Text>
          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-[16px] font-black text-[#351D0E]">{formatPrice(price)}</Text>
              {discount > 0 ? (
                <Text className="text-[11px] text-[#9A8B7D] line-through">{formatPrice(mrp)}</Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add ${product.name} to cart`}
              onPress={() => addToCart(id)}
              className="h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#F97316]">
              <ShoppingCart size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderProductGrid = (products: StoreProduct[]) => (
    <View className="flex-row flex-wrap justify-between">
      {products.map(product => renderProductCard(product, true))}
    </View>
  );

  const renderHome = () => (
    <>
      <View className="relative mx-4 mt-2 min-h-[310px] justify-center overflow-hidden rounded-[26px] bg-[#F2E0CC] px-5 py-6">
        {heroImage ? (
          <Image
            source={{ uri: heroImage }}
            className="absolute inset-0 h-full w-full"
            resizeMode="cover"
          />
        ) : null}
        <View pointerEvents="none" className="absolute inset-0 bg-white/25" />
        <View className="w-[70%]">
          <View className="self-start rounded-full border border-[#D9C4AA] bg-white/80 px-3 py-2">
            <Text className="text-[10px] font-bold uppercase tracking-[1.3px] text-[#351D0E]">
              Q Living Furniture
            </Text>
          </View>
          <Text numberOfLines={3} className="mt-4 text-[28px] font-black leading-[34px] text-[#263B2A]">
            {heroBanner?.title || 'Make your home feel like home.'}
          </Text>
          <Text numberOfLines={3} className="mt-2 text-[14px] leading-5 text-[#49392D]">
            {heroBanner?.subtitle ||
              heroBanner?.description ||
              'Thoughtful furniture, everyday comfort, and timeless style.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab('Explore')}
            className="mt-4 flex-row items-center self-start rounded-full bg-[#F97316] px-4 py-3">
            <Text className="mr-2 text-[13px] font-bold text-white">Explore collection</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </Pressable>
        </View>
        {storeData.heroBanners.length > 1 ? (
          <View className="absolute bottom-4 left-5 flex-row items-center">
            {storeData.heroBanners.map((banner, index) => (
              <Pressable
                key={banner.id ?? index}
                accessibilityRole="button"
                accessibilityLabel={`Show promotion ${index + 1}`}
                onPress={() => setHeroIndex(index)}
                className={`mr-2 h-[9px] rounded-full ${
                  heroIndex === index ? 'w-[22px] bg-[#F97316]' : 'w-[9px] bg-white'
                }`}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View className="mt-7">
        <View className="mb-4 flex-row items-center justify-between px-4">
          <Text className="text-[22px] font-black text-[#351D0E]">
            Shop by <Text className="text-[#E87424]">Category</Text>
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab('Explore')}
            className="flex-row items-center rounded-full bg-[#FFF0E1] px-3 py-2">
            <Text className="mr-1 text-[12px] font-semibold text-[#634D3B]">View all</Text>
            <ArrowRight size={14} color="#634D3B" />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4">
          {storeData.categories.map((category, index) => {
            const imageUri = categoryImage(category);
            return (
              <Pressable
                key={category.catId ?? category.id ?? category.name ?? index}
                accessibilityRole="button"
                onPress={() => {
                  setSelectedCategory(category.name);
                  setActiveTab('Explore');
                }}
                className="mr-3 w-[112px] items-center">
                <View className="h-[104px] w-[112px] overflow-hidden rounded-[18px] bg-[#F1E5D7]">
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <View className="h-full items-center justify-center">
                      <Armchair size={38} color="#A78A70" strokeWidth={1.3} />
                    </View>
                  )}
                </View>
                <Text numberOfLines={2} className="mt-2 text-center text-[12px] font-semibold leading-4 text-[#351D0E]">
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View className="mt-8">
        <View className="mb-4 px-4">
          <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#A06E46]">
            Made for your space
          </Text>
          <Text className="mt-1 text-[22px] font-black text-[#351D0E]">
            Featured furniture
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4">
          {storeData.products.slice(0, 10).map(product => renderProductCard(product))}
        </ScrollView>
      </View>

      <View className="mt-5 px-4">
        <View className="mb-3">
          <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#A06E46]">
            Discover more
          </Text>
          <Text className="mt-1 text-[22px] font-black text-[#351D0E]">
            Collections &amp; offers
          </Text>
        </View>
        {offerBanner ? (
          <ImageBackground
            source={offerImage ? { uri: offerImage } : undefined}
            resizeMode="cover"
            className="min-h-[170px] justify-center overflow-hidden rounded-[20px] bg-[#F5E3D0] px-5 py-4">
            <View className="absolute inset-0 bg-white/25" />
            <View className="w-[62%]">
              {offerBanner.offer ? (
                <Text className="mb-2 self-start rounded-full bg-[#176139] px-3 py-1 text-[10px] font-bold text-white">
                  {offerBanner.offer}
                </Text>
              ) : null}
              <Text numberOfLines={2} className="text-[19px] font-black leading-6 text-[#351D0E]">
                {offerBanner.title || 'Find your next favourite piece'}
              </Text>
              <Text numberOfLines={2} className="mt-1 text-[12px] leading-4 text-[#49392D]">
                {offerBanner.subtitle || offerBanner.description || 'Explore furniture for every room.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setActiveTab('Explore')}
                className="mt-3 flex-row items-center self-start rounded-full bg-[#176139] px-3 py-2">
                <Text className="mr-1 text-[11px] font-bold text-white">Shop now</Text>
                <ArrowRight size={13} color="#FFFFFF" />
              </Pressable>
            </View>
          </ImageBackground>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab('Explore')}
            className="min-h-[150px] justify-center rounded-[20px] bg-[#F5E3D0] p-5">
            <Text className="text-[19px] font-black text-[#351D0E]">Collections for every room</Text>
            <Text className="mt-1 text-[13px] text-[#634D3B]">Explore the Q Living furniture collection.</Text>
          </Pressable>
        )}
      </View>
    </>
  );

  const renderTabContent = () => {
    if (activeTab === 'Home') return renderHome();

    if (activeTab === 'Explore') {
      return (
        <View className="px-4 pt-5">
          <Text className="text-[25px] font-black text-[#351D0E]">Explore furniture</Text>
          <TextInput
            accessibilityLabel="Search furniture"
            value={search}
            onChangeText={setSearch}
            placeholder="Search furniture or category"
            placeholderTextColor="#9A8B7D"
            className="mt-4 h-[48px] rounded-[14px] border border-[#E7DCCF] bg-white px-4 text-[14px] text-[#351D0E]"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedCategory('')}
              className={`mr-2 rounded-full px-4 py-2 ${
                selectedCategory ? 'bg-[#F4E9DD]' : 'bg-[#F97316]'
              }`}>
              <Text className={`text-[12px] font-semibold ${selectedCategory ? 'text-[#634D3B]' : 'text-white'}`}>
                All
              </Text>
            </Pressable>
            {storeData.categories.map(category => (
              <Pressable
                key={category.catId ?? category.id ?? category.name}
                accessibilityRole="button"
                onPress={() => setSelectedCategory(category.name)}
                className={`mr-2 rounded-full px-4 py-2 ${
                  selectedCategory === category.name ? 'bg-[#F97316]' : 'bg-[#F4E9DD]'
                }`}>
                <Text className={`text-[12px] font-semibold ${
                  selectedCategory === category.name ? 'text-white' : 'text-[#634D3B]'
                }`}>
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View className="mt-5">{renderProductGrid(visibleProducts)}</View>
          {!visibleProducts.length ? (
            <Text className="py-8 text-center text-[14px] text-[#8B735E]">
              No furniture matches your search.
            </Text>
          ) : null}
        </View>
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
                    <Image source={{ uri: productImage(product) }} className="h-[72px] w-[72px] rounded-[12px]" resizeMode="cover" />
                  ) : (
                    <View className="h-[72px] w-[72px] items-center justify-center rounded-[12px] bg-[#F1E5D7]">
                      <Armchair size={30} color="#A78A70" />
                    </View>
                  )}
                  <View className="ml-3 flex-1">
                    <Text numberOfLines={2} className="text-[13px] font-bold text-[#351D0E]">{product.name}</Text>
                    <Text className="mt-1 text-[13px] text-[#634D3B]">
                      {formatPrice(productPrice(product))}  ·  Qty {cart[String(product.id)]}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove one ${product.name} from cart`}
                    onPress={() => setCart(current => {
                      const next = { ...current };
                      const id = String(product.id);
                      if (next[id] <= 1) delete next[id];
                      else next[id] -= 1;
                      return next;
                    })}
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
      <View className="px-4 pt-5">
        <Text className="mb-4 text-[25px] font-black text-[#351D0E]">My profile</Text>
        <View className="items-center rounded-[20px] bg-white p-6">
          <View className="h-[68px] w-[68px] items-center justify-center rounded-full bg-[#FFF0E1]">
            <UserRound size={32} color="#F97316" />
          </View>
          <Text className="mt-3 text-[16px] font-bold text-[#351D0E]">
            {userName || 'Welcome to Q Living'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onLogoutPress}
            className="mt-5 flex-row items-center rounded-full bg-[#FFF0E1] px-5 py-3">
            <LogOut size={17} color="#B94719" />
            <Text className="ml-2 text-[13px] font-bold text-[#B94719]">Sign out</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const tabs: Array<{ name: StoreTab; icon: typeof Home }> = [
    { name: 'Home', icon: Home },
    { name: 'Explore', icon: Search },
    { name: 'Favorites', icon: Heart },
    { name: 'Cart', icon: ShoppingCart },
    { name: 'Profile', icon: UserRound },
  ];

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#FCFAF7]">
      <View className="h-[58px] flex-row items-center justify-between px-4">
        <View className="flex-row items-center">
          <Image
            source={require('../Assert/images/appicon.png')}
            accessibilityLabel="Q Living Furniture"
            resizeMode="contain"
            className="h-[42px] w-[42px]"
          />
          <View className="ml-2">
            <Text className="text-[16px] font-black italic text-[#1E432C]">Q Living</Text>
            <Text className="text-[8px] font-bold uppercase tracking-[1.8px] text-[#634D3B]">Furniture</Text>
          </View>
        </View>
        <View className="flex-row">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search furniture"
            onPress={() => setActiveTab('Explore')}
            className="mr-2 h-[42px] w-[42px] items-center justify-center rounded-full bg-white">
            <Search size={21} color="#351D0E" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cart, ${cartCount} items`}
            onPress={() => setActiveTab('Cart')}
            className="h-[42px] w-[42px] items-center justify-center rounded-full bg-white">
            <ShoppingCart size={21} color="#351D0E" />
            {cartCount > 0 ? (
              <View className="absolute right-[-3px] top-[-3px] min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#F97316] px-1">
                <Text className="text-[10px] font-bold text-white">{cartCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

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
      ) : (
        <ScrollView
          key={activeTab}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="pb-[115px]">
          {renderTabContent()}
        </ScrollView>
      )}

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-around border-t border-[#F0E7DE] bg-white pt-2 shadow-lg">
        {tabs.map(({ name, icon: Icon }) => {
          const active = activeTab === name;
          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${name} tab`}
              onPress={() => setActiveTab(name)}
              className="min-w-[58px] items-center py-1">
              <View className="relative">
                <Icon size={23} color={active ? '#F97316' : '#351D0E'} fill={active && name === 'Home' ? '#F97316' : 'transparent'} />
                {name === 'Cart' && cartCount > 0 ? (
                  <View className="absolute right-[-9px] top-[-7px] min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#F97316] px-1">
                    <Text className="text-[9px] font-bold text-white">{cartCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text className={`mt-1 text-[10px] ${active ? 'font-bold text-[#F97316]' : 'text-[#351D0E]'}`}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
