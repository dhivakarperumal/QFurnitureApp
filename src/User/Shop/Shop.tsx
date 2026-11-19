import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Armchair,
  Check,
  LayoutGrid,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import ProductCard from '../ProductCard';
import type { StoreCategory, StoreProduct } from '../types';
import { formatPrice, productDiscountPercent, productPrice } from '../utils';

type SortOrder = 'featured' | 'price-low' | 'price-high' | 'rating';

type RoomFilter = {
  name: string;
  slug: string;
};

const roomFilters: RoomFilter[] = [
  { name: 'Living Room', slug: 'living-room' },
  { name: 'Bedroom', slug: 'bedroom' },
  { name: 'Dining Room', slug: 'dining-room' },
  { name: 'Outdoor', slug: 'outdoor' },
];

type ShopProps = {
  categories: StoreCategory[];
  products: StoreProduct[];
  favorites: string[];
  search: string;
  selectedCategory: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: string) => void;
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onProductPress: (productId: string) => void;
};

export default function Shop({
  categories,
  products,
  favorites,
  search,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
  onFavoritePress,
  onAddToCart,
  onProductPress,
}: ShopProps) {
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [onSale, setOnSale] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('featured');

  const filteredProducts = useMemo(() => {
    const priceLimit = Number(maxPrice);
    const matchingProducts = products.filter(product => {
      const rating = Number(product.rating) || 0;
      const stock = Number(
        product.available_stock ?? product.total_stock ?? product.stock,
      );
      return (
        (!Number.isFinite(priceLimit) ||
          priceLimit <= 0 ||
          productPrice(product) <= priceLimit) &&
        (!minRating || rating >= minRating) &&
        (!onSale || productDiscountPercent(product) > 0) &&
        (!inStockOnly || stock > 0)
      );
    });

    return matchingProducts.sort((first, second) => {
      if (sortOrder === 'price-low') {
        return productPrice(first) - productPrice(second);
      }
      if (sortOrder === 'price-high') {
        return productPrice(second) - productPrice(first);
      }
      if (sortOrder === 'rating') {
        return (Number(second.rating) || 0) - (Number(first.rating) || 0);
      }
      return 0;
    });
  }, [inStockOnly, maxPrice, minRating, onSale, products, sortOrder]);

  const resetFilters = () => {
    setMaxPrice('');
    setMinRating(0);
    setOnSale(false);
    setInStockOnly(false);
    setSortOrder('featured');
    onCategoryChange('');
    onSearchChange('');
  };

  const activeRoom = roomFilters.find(
    room => room.slug.replace(/-/g, ' ') === search.trim().toLowerCase(),
  );

  return (
    <View className="flex-1 pt-3">
      <View className="mb-4 flex-row items-center px-4">
        <View className="mr-2 h-[48px] flex-1 flex-row items-center rounded-full border border-[#E7DCCF] bg-white px-4">
          <Text className="mr-2 text-[20px] text-[#351D0E]">⌕</Text>
          <TextInput
            accessibilityLabel="Search furniture"
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search furniture..."
            placeholderTextColor="#9A8B7D"
            returnKeyType="search"
            className="flex-1 text-[14px] text-[#351D0E]"
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => onSearchChange('')}
              className="h-[32px] w-[32px] items-center justify-center">
              <X size={17} color="#8B735E" />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open shop filters"
          onPress={() => setFiltersVisible(true)}
          className="h-[48px] flex-row items-center rounded-full border border-[#F0D8BD] bg-[#FFF2E2] px-3">
          <SlidersHorizontal size={16} color="#351D0E" />
          <Text className="ml-2 text-[12px] font-bold text-[#351D0E]">Filters</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="mb-4 px-4">
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onSearchChange('');
            onCategoryChange('');
          }}
          className={`mr-2 rounded-full px-5 py-3 ${
            !activeRoom ? 'bg-[#F97316]' : 'bg-[#FFF0E1]'
          }`}>
          <Text className={`text-[13px] font-semibold ${!activeRoom ? 'text-white' : 'text-[#351D0E]'}`}>
            All
          </Text>
        </Pressable>
        {roomFilters.map(room => {
          const active = activeRoom?.slug === room.slug;
          return (
            <Pressable
              key={room.slug}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                onCategoryChange('');
                onSearchChange(room.slug.replace(/-/g, ' '));
              }}
              className={`mr-2 rounded-full px-5 py-3 ${
                active ? 'bg-[#F97316]' : 'bg-[#FFF0E1]'
              }`}>
              <Text className={`text-[13px] font-semibold ${active ? 'text-white' : 'text-[#351D0E]'}`}>
                {room.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="flex-1 flex-row px-3">
        <View className="mr-3 w-[88px] overflow-hidden rounded-[18px] border border-[#F0E7DE] bg-white">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !selectedCategory }}
            onPress={() => onCategoryChange('')}
            className={`min-h-[82px] items-center justify-center px-1 py-3 ${
              !selectedCategory ? 'border-l-[3px] border-[#F97316] bg-[#FFF4E7]' : ''
            }`}>
            <LayoutGrid
              size={24}
              color={!selectedCategory ? '#F97316' : '#263B2A'}
            />
            <Text className={`mt-2 text-center text-[11px] font-semibold leading-4 ${
              !selectedCategory ? 'text-[#E87424]' : 'text-[#351D0E]'
            }`}>
              All Categories
            </Text>
          </Pressable>
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}>
            {categories.map(category => {
              const active = selectedCategory === category.name;
              return (
                <Pressable
                  key={category.catId ?? category.id ?? category.name}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onCategoryChange(active ? '' : category.name)}
                  className={`min-h-[82px] items-center justify-center border-t border-[#FAF5EF] px-1 py-3 ${
                    active ? 'border-l-[3px] border-[#F97316] bg-[#FFF4E7]' : ''
                  }`}>
                  <Armchair
                    size={24}
                    color={active ? '#F97316' : '#263B2A'}
                  />
                  <Text
                    numberOfLines={3}
                    className={`mt-2 text-center text-[10px] font-medium leading-[14px] ${
                      active ? 'text-[#E87424]' : 'text-[#351D0E]'
                    }`}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View className="flex-1">
          <Text className="mb-3 text-[11px] text-[#634D3B]">
            {filteredProducts.length} furniture items
          </Text>
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}>
            {filteredProducts.length ? (
              <View className="flex-row flex-wrap justify-between">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    favorite={favorites.includes(String(product.id))}
                    compact
                    onFavoritePress={onFavoritePress}
                    onAddToCart={onAddToCart}
                    onProductPress={onProductPress}
                  />
                ))}
              </View>
            ) : (
              <View className="items-center rounded-[18px] border border-dashed border-[#E7DCCF] bg-white px-3 py-8">
                <Armchair size={30} color="#A78A70" />
                <Text className="mt-2 text-center text-[12px] font-semibold text-[#351D0E]">
                  No furniture found
                </Text>
                <Text className="mt-1 text-center text-[10px] text-[#8B735E]">
                  Try another search or clear the filters.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      <Modal
        visible={filtersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            onPress={() => setFiltersVisible(false)}
            className="absolute inset-0"
          />
          <View className="max-h-[82%] rounded-t-[24px] bg-[#FCFAF7] px-5 pb-8 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-[20px] font-black text-[#351D0E]">Filters</Text>
                <Text className="mt-1 text-[12px] text-[#8B735E]">
                  Refine your furniture search
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close filters"
                onPress={() => setFiltersVisible(false)}
                className="h-[38px] w-[38px] items-center justify-center rounded-full bg-white">
                <X size={20} color="#351D0E" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="mb-2 text-[13px] font-bold text-[#351D0E]">Category</Text>
              <View className="mb-4 flex-row flex-wrap">
                <Pressable
                  onPress={() => onCategoryChange('')}
                  className={`mb-2 mr-2 rounded-full px-3 py-2 ${
                    !selectedCategory ? 'bg-[#F97316]' : 'bg-white'
                  }`}>
                  <Text className={`text-[12px] ${!selectedCategory ? 'font-bold text-white' : 'text-[#634D3B]'}`}>
                    All
                  </Text>
                </Pressable>
                {categories.map(category => {
                  const active = selectedCategory === category.name;
                  return (
                    <Pressable
                      key={category.catId ?? category.id ?? category.name}
                      onPress={() => onCategoryChange(active ? '' : category.name)}
                      className={`mb-2 mr-2 rounded-full px-3 py-2 ${
                        active ? 'bg-[#F97316]' : 'bg-white'
                      }`}>
                      <Text className={`text-[12px] ${active ? 'font-bold text-white' : 'text-[#634D3B]'}`}>
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="mb-2 text-[13px] font-bold text-[#351D0E]">Maximum price</Text>
              <TextInput
                accessibilityLabel="Maximum price"
                value={maxPrice}
                onChangeText={value => setMaxPrice(value.replace(/[^\d]/g, ''))}
                placeholder="No limit"
                placeholderTextColor="#9A8B7D"
                keyboardType="number-pad"
                className="mb-4 h-[46px] rounded-[12px] border border-[#E7DCCF] bg-white px-4 text-[14px] text-[#351D0E]"
              />
              {maxPrice ? (
                <Text className="mb-4 mt-[-10px] text-[11px] text-[#8B735E]">
                  Up to {formatPrice(Number(maxPrice))}
                </Text>
              ) : null}

              <Text className="mb-2 text-[13px] font-bold text-[#351D0E]">Customer rating</Text>
              <View className="mb-4 flex-row">
                {[0, 3, 4].map(rating => (
                  <Pressable
                    key={rating}
                    onPress={() => setMinRating(rating)}
                    className={`mr-2 rounded-full px-3 py-2 ${
                      minRating === rating ? 'bg-[#F97316]' : 'bg-white'
                    }`}>
                    <Text className={`text-[12px] ${
                      minRating === rating ? 'font-bold text-white' : 'text-[#634D3B]'
                    }`}>
                      {rating ? `${rating}★ & up` : 'Any'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="mb-2 text-[13px] font-bold text-[#351D0E]">Sort by</Text>
              <View className="mb-4 flex-row flex-wrap">
                {([
                  ['featured', 'Featured'],
                  ['price-low', 'Price: Low to High'],
                  ['price-high', 'Price: High to Low'],
                  ['rating', 'Top Rated'],
                ] as Array<[SortOrder, string]>).map(([value, label]) => {
                  const active = sortOrder === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => setSortOrder(value)}
                      className={`mb-2 mr-2 rounded-full px-3 py-2 ${
                        active ? 'bg-[#F97316]' : 'bg-white'
                      }`}>
                      <Text className={`text-[12px] ${
                        active ? 'font-bold text-white' : 'text-[#634D3B]'
                      }`}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: onSale }}
                onPress={() => setOnSale(value => !value)}
                className="mb-3 flex-row items-center">
                <View className={`mr-2 h-[20px] w-[20px] items-center justify-center rounded border ${
                  onSale ? 'border-[#F97316] bg-[#F97316]' : 'border-[#CDBBA8] bg-white'
                }`}>
                  {onSale ? <Check size={14} color="#FFFFFF" /> : null}
                </View>
                <Text className="text-[13px] text-[#351D0E]">On sale</Text>
              </Pressable>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: inStockOnly }}
                onPress={() => setInStockOnly(value => !value)}
                className="mb-5 flex-row items-center">
                <View className={`mr-2 h-[20px] w-[20px] items-center justify-center rounded border ${
                  inStockOnly ? 'border-[#F97316] bg-[#F97316]' : 'border-[#CDBBA8] bg-white'
                }`}>
                  {inStockOnly ? <Check size={14} color="#FFFFFF" /> : null}
                </View>
                <Text className="text-[13px] text-[#351D0E]">In stock</Text>
              </Pressable>
            </ScrollView>

            <View className="mt-2 flex-row">
              <Pressable
                accessibilityRole="button"
                onPress={resetFilters}
                className="mr-3 h-[48px] flex-1 items-center justify-center rounded-full border border-[#E7DCCF] bg-white">
                <Text className="text-[13px] font-bold text-[#634D3B]">Clear all</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFiltersVisible(false)}
                className="h-[48px] flex-1 items-center justify-center rounded-full bg-[#F97316]">
                <Text className="text-[13px] font-bold text-white">
                  Show {filteredProducts.length} items
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
