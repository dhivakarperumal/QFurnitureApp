import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Armchair,
  ChevronDown,
  ChevronUp,
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

type FilterSectionKey = 'category' | 'price' | 'rating' | 'sort' | 'availability';

type FilterSectionProps = {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function FilterSection({
  title,
  expanded,
  onToggle,
  children,
}: FilterSectionProps) {
  return (
    <View className="border-b border-[#EAE4DA]">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        className="h-[48px] flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-[#351D0E]">{title}</Text>
        {expanded ? (
          <ChevronUp size={19} color="#8B735E" />
        ) : (
          <ChevronDown size={19} color="#8B735E" />
        )}
      </Pressable>
      {expanded ? <View className="pb-2">{children}</View> : null}
    </View>
  );
}

type PriceRangeSliderProps = {
  maximum: number;
  minimumValue: number;
  maximumValue: number;
  onMinimumValueChange: (value: number) => void;
  onMaximumValueChange: (value: number) => void;
};

function PriceRangeSlider({
  maximum,
  minimumValue,
  maximumValue,
  onMinimumValueChange,
  onMaximumValueChange,
}: PriceRangeSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const minimumStart = useRef(minimumValue);
  const maximumStart = useRef(maximumValue);
  const values = useRef({ trackWidth, maximum, minimumValue, maximumValue });
  values.current = { trackWidth, maximum, minimumValue, maximumValue };

  const minimumResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          minimumStart.current = values.current.minimumValue;
        },
        onPanResponderMove: (_, gesture) => {
          const current = values.current;
          const usableWidth = current.trackWidth - 22;
          if (usableWidth <= 0) return;

          const step = Math.max(1000, Math.round(current.maximum / 100));
          const rawValue =
            minimumStart.current +
            (gesture.dx / usableWidth) * current.maximum;
          const nextValue = Math.max(
            0,
            Math.min(
              current.maximumValue,
              Math.round(rawValue / step) * step,
            ),
          );
          onMinimumValueChange(nextValue);
        },
      }),
    [onMinimumValueChange],
  );
  const maximumResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          maximumStart.current = values.current.maximumValue;
        },
        onPanResponderMove: (_, gesture) => {
          const current = values.current;
          const usableWidth = current.trackWidth - 22;
          if (usableWidth <= 0) return;

          const step = Math.max(1000, Math.round(current.maximum / 100));
          const rawValue =
            maximumStart.current +
            (gesture.dx / usableWidth) * current.maximum;
          const nextValue = Math.min(
            current.maximum,
            Math.max(
              current.minimumValue,
              Math.round(rawValue / step) * step,
            ),
          );
          onMaximumValueChange(nextValue);
        },
      }),
    [onMaximumValueChange],
  );

  const usableWidth = Math.max(0, trackWidth - 22);
  const minimumPosition = (minimumValue / maximum) * usableWidth;
  const maximumPosition = (maximumValue / maximum) * usableWidth;
  const selectedTrackStyle = useMemo(
    () => ({
      left: 11 + minimumPosition,
      width: maximumPosition - minimumPosition,
    }),
    [maximumPosition, minimumPosition],
  );
  const minimumThumbStyle = useMemo(
    () => ({ left: minimumPosition }),
    [minimumPosition],
  );
  const maximumThumbStyle = useMemo(
    () => ({ left: maximumPosition }),
    [maximumPosition],
  );

  return (
    <View>
      <View
        onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
        className="relative h-[34px] justify-center">
        <View className="absolute left-[11px] right-[11px] h-[4px] rounded-full bg-[#E7DCCF]" />
        <View
          style={selectedTrackStyle}
          className="absolute h-[4px] rounded-full bg-[#F97316]"
        />
        <View
          {...minimumResponder.panHandlers}
          style={minimumThumbStyle}
          className="absolute top-[6px] h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[#F97316] bg-white"
        />
        <View
          {...maximumResponder.panHandlers}
          style={maximumThumbStyle}
          className="absolute top-[6px] h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[#F97316] bg-white"
        />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[12px] text-[#8B735E]">{formatPrice(minimumValue)}</Text>
        <Text className="text-[12px] text-[#8B735E]">{formatPrice(maximumValue)}</Text>
      </View>
    </View>
  );
}

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
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const filtersTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [onSale, setOnSale] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('featured');
  const [expandedFilterSections, setExpandedFilterSections] = useState<
    Record<FilterSectionKey, boolean>
  >({
    category: true,
    price: true,
    rating: true,
    sort: true,
    availability: true,
  });

  const priceRangeMaximum = useMemo(() => {
    const highestPrice = products.reduce(
      (highest, product) => Math.max(highest, productPrice(product)),
      0,
    );
    return Math.max(Math.ceil(highestPrice / 50000) * 50000, 50000);
  }, [products]);

  useEffect(() => {
    if (!filtersVisible) return;

    filtersTranslateX.setValue(screenWidth);
    const animation = Animated.timing(filtersTranslateX, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [filtersVisible, filtersTranslateX, screenWidth]);

  const filteredProducts = useMemo(() => {
    const minimumPrice = minPrice ?? 0;
    const maximumPrice = maxPrice ?? priceRangeMaximum;
    const matchingProducts = products.filter(product => {
      const rating = Number(product.rating) || 0;
      const stock = Number(
        product.available_stock ?? product.total_stock ?? product.stock,
      );
      return (
        productPrice(product) >= minimumPrice &&
        productPrice(product) <= maximumPrice &&
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
  }, [
    inStockOnly,
    maxPrice,
    minPrice,
    minRating,
    onSale,
    products,
    priceRangeMaximum,
    sortOrder,
  ]);

  const resetFilters = () => {
    setMinPrice(null);
    setMaxPrice(null);
    setMinRating(0);
    setOnSale(false);
    setInStockOnly(false);
    setSortOrder('featured');
    onCategoryChange('');
    onSearchChange('');
  };

  const toggleFilterSection = (section: FilterSectionKey) => {
    setExpandedFilterSections(current => ({
      ...current,
      [section]: !current[section],
    }));
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
        className="flex-grow-0 flex-shrink-0"
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
        animationType="none"
        onRequestClose={() => setFiltersVisible(false)}>
        <View className="flex-1 flex-row justify-end bg-black/40">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            onPress={() => setFiltersVisible(false)}
            className="absolute inset-0"
          />
          <Animated.View
            style={{ transform: [{ translateX: filtersTranslateX }] }}
            className="h-full w-full bg-[#FCFAF7]">
            <View
              style={{ paddingTop: insets.top + 12 }}
              className="flex-row items-center border-b border-[#E7DCCF] bg-white px-4 pb-4">
              <View className="mr-2 h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-[#EAF4F0]">
                <SlidersHorizontal size={20} color="#F97316" />
              </View>
              <View className="flex-1">
                <Text className="text-[20px] font-black text-[#351D0E]">Filters</Text>
                <Text className="text-[12px] text-[#8B735E]">
                  Refine your product selection
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={resetFilters}
                className="mr-2 h-[38px] items-center justify-center rounded-full border border-[#F0D8BD] px-3">
                <Text className="text-[12px] font-bold text-[#F97316]">Clear All</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close filters"
                onPress={() => setFiltersVisible(false)}
                className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[#E7DCCF] bg-white">
                <X size={20} color="#351D0E" />
              </Pressable>
            </View>

            <ScrollView
              className="flex-1 px-4"
              showsVerticalScrollIndicator={false}>
              <FilterSection
                title="Category"
                expanded={expandedFilterSections.category}
                onToggle={() => toggleFilterSection('category')}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: !selectedCategory }}
                  onPress={() => onCategoryChange('')}
                  className="min-h-[40px] flex-row items-center">
                  <View className={`mr-3 h-[20px] w-[20px] items-center justify-center rounded-full border ${
                    !selectedCategory ? 'border-[#F97316]' : 'border-[#CDBBA8]'
                  }`}>
                    {!selectedCategory ? <View className="h-[10px] w-[10px] rounded-full bg-[#F97316]" /> : null}
                  </View>
                  <Text className="text-[14px] text-[#634D3B]">All categories</Text>
                </Pressable>
                {categories.map(category => {
                  const active = selectedCategory === category.name;
                  return (
                    <Pressable
                      key={category.catId ?? category.id ?? category.name}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => onCategoryChange(active ? '' : category.name)}
                      className="min-h-[40px] flex-row items-center">
                      <View className={`mr-3 h-[20px] w-[20px] items-center justify-center rounded-full border ${
                        active ? 'border-[#F97316]' : 'border-[#CDBBA8]'
                      }`}>
                        {active ? <View className="h-[10px] w-[10px] rounded-full bg-[#F97316]" /> : null}
                      </View>
                      <Text className="flex-1 text-[14px] text-[#634D3B]">
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </FilterSection>

              <FilterSection
                title="Price Range"
                expanded={expandedFilterSections.price}
                onToggle={() => toggleFilterSection('price')}>
                <PriceRangeSlider
                  maximum={priceRangeMaximum}
                  minimumValue={minPrice ?? 0}
                  maximumValue={maxPrice ?? priceRangeMaximum}
                  onMinimumValueChange={setMinPrice}
                  onMaximumValueChange={setMaxPrice}
                />
              </FilterSection>

              <FilterSection
                title="Rating"
                expanded={expandedFilterSections.rating}
                onToggle={() => toggleFilterSection('rating')}>
                {[0, 3, 4].map(rating => {
                  const active = minRating === rating;
                  return (
                    <Pressable
                      key={rating}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => setMinRating(rating)}
                      className="min-h-[40px] flex-row items-center">
                      <View className={`mr-3 h-[20px] w-[20px] items-center justify-center rounded-full border ${
                        active ? 'border-[#F97316]' : 'border-[#CDBBA8]'
                      }`}>
                        {active ? <View className="h-[10px] w-[10px] rounded-full bg-[#F97316]" /> : null}
                      </View>
                      <Text className="text-[14px] text-[#634D3B]">
                        {rating ? `${rating}★ and above` : 'Any rating'}
                      </Text>
                    </Pressable>
                  );
                })}
              </FilterSection>

              <FilterSection
                title="Sort by"
                expanded={expandedFilterSections.sort}
                onToggle={() => toggleFilterSection('sort')}>
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
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => setSortOrder(value)}
                      className="min-h-[40px] flex-row items-center">
                      <View className={`mr-3 h-[20px] w-[20px] items-center justify-center rounded-full border ${
                        active ? 'border-[#F97316]' : 'border-[#CDBBA8]'
                      }`}>
                        {active ? <View className="h-[10px] w-[10px] rounded-full bg-[#F97316]" /> : null}
                      </View>
                      <Text className="text-[14px] text-[#634D3B]">{label}</Text>
                    </Pressable>
                  );
                })}
              </FilterSection>

              <FilterSection
                title="Availability"
                expanded={expandedFilterSections.availability}
                onToggle={() => toggleFilterSection('availability')}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: onSale }}
                  onPress={() => setOnSale(value => !value)}
                  className="min-h-[40px] flex-row items-center">
                  <View className={`mr-3 h-[20px] w-[20px] items-center justify-center rounded border ${
                    onSale ? 'border-[#F97316] bg-[#F97316]' : 'border-[#CDBBA8] bg-white'
                  }`}>
                    {onSale ? <Check size={14} color="#FFFFFF" /> : null}
                  </View>
                  <Text className="text-[14px] text-[#634D3B]">On sale</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: inStockOnly }}
                  onPress={() => setInStockOnly(value => !value)}
                  className="min-h-[40px] flex-row items-center">
                  <View className={`mr-3 h-[20px] w-[20px] items-center justify-center rounded border ${
                    inStockOnly ? 'border-[#F97316] bg-[#F97316]' : 'border-[#CDBBA8] bg-white'
                  }`}>
                    {inStockOnly ? <Check size={14} color="#FFFFFF" /> : null}
                  </View>
                  <Text className="text-[14px] text-[#634D3B]">In stock</Text>
                </Pressable>
              </FilterSection>
            </ScrollView>

            <View
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
              className="border-t border-[#EAE4DA] bg-white px-4 pt-4">
              <Pressable
                accessibilityRole="button"
                onPress={() => setFiltersVisible(false)}
                className="h-[54px] w-full items-center justify-center rounded-[16px] bg-[#F97316]">
                <Text className="text-[16px] font-bold text-white">
                  Show {filteredProducts.length} products
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
