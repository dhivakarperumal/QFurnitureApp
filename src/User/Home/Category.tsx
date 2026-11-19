import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Armchair, ArrowRight } from 'lucide-react-native';
import type { StoreCategory } from '../types';
import { categoryImage } from '../utils';

type CategoryProps = {
  categories: StoreCategory[];
  onCategoryPress: (category: string) => void;
  onViewAllPress: () => void;
};

export default function Category({
  categories,
  onCategoryPress,
  onViewAllPress,
}: CategoryProps) {
  return (
    <View className="mt-7">
      <View className="mb-4 flex-row items-center justify-between px-4">
        <Text className="text-[22px] font-black text-[#351D0E]">
          Shop by <Text className="text-[#E87424]">Category</Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onViewAllPress}
          className="flex-row items-center rounded-full bg-[#FFF0E1] px-3 py-2">
          <Text className="mr-1 text-[12px] font-semibold text-[#634D3B]">View all</Text>
          <ArrowRight size={14} color="#634D3B" />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4">
        {categories.map((category, index) => {
          const imageUri = categoryImage(category);
          return (
            <Pressable
              key={category.catId ?? category.id ?? category.name ?? index}
              accessibilityRole="button"
              onPress={() => onCategoryPress(category.name)}
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
  );
}
