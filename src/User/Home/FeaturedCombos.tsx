import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import api from '../../api';
import ProductCard from '../ProductCard';
import type { StoreProduct } from '../types';

type FeaturedCombo = StoreProduct & {
  featured?: boolean | number;
};

type CombosResponse = {
  combos?: FeaturedCombo[];
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
  return 'Could not load featured combos. Please try again.';
}

type FeaturedCombosProps = {
  favorites: string[];
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onProductPress: (productId: string) => void;
};

export default function FeaturedCombos({
  favorites,
  onFavoritePress,
  onAddToCart,
  onProductPress,
}: FeaturedCombosProps) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 40) / 2;
  const [combos, setCombos] = useState<FeaturedCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    const loadCombos = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<CombosResponse>('/combos', {
          params: { page: 1, limit: 100, status: 'Active' },
        });
        if (!Array.isArray(data?.combos)) {
          throw new Error('The combos response did not contain a combo list.');
        }

        const featuredCombos = data.combos.filter(
          combo => combo.featured === true || combo.featured === 1,
        );
        if (active) setCombos(featuredCombos.slice(0, 5));
      } catch (requestError) {
        console.error('Could not load featured combos:', requestError);
        if (active) setError(errorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCombos();
    return () => {
      active = false;
    };
  }, [retryCount]);

  if (!loading && !error && !combos.length) return null;

  return (
    <View className="mt-8">
      <View className="mb-4 px-4">
        <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#A06E46]">
          Designed to go together
        </Text>
        <Text className="mt-1 text-[22px] font-black text-[#351D0E]">
          Featured combos
        </Text>
        <Text className="mt-1 text-[12px] text-[#8B735E]">
          Complete your space with curated bundles.
        </Text>
      </View>
      {loading ? (
        <View className="h-[150px] items-center justify-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : error ? (
        <View className="mx-4 rounded-[16px] border border-[#F0E7DE] bg-white p-4">
          <Text accessibilityRole="alert" className="text-[13px] text-[#8B2D20]">
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetryCount(count => count + 1)}
            className="mt-3 self-start rounded-full bg-[#FFF0E1] px-4 py-2">
            <Text className="text-[12px] font-bold text-[#351D0E]">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-4">
          {combos.map(combo => {
            const productId = `combo-${combo.id}`;
            const product: StoreProduct = {
              ...combo,
              id: productId,
              item_type: 'combo',
              category: 'Furniture combo',
              images: combo.images ?? combo.image,
            };

            return (
              <ProductCard
                key={productId}
                product={product}
                favorite={favorites.includes(productId)}
                cardWidth={cardWidth}
                onFavoritePress={onFavoritePress}
                onAddToCart={onAddToCart}
                onProductPress={onProductPress}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
