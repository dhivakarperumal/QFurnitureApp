import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Armchair, ArrowRight } from 'lucide-react-native';
import type { StoreCategory } from '../types';
import { categoryImage } from '../utils';
import { useAutoSwiper } from './useAutoSwiper';

const styles = StyleSheet.create({
  scrollContent: {
    paddingLeft: 8,
  },
});

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
  const [contentWidth, setContentWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const categoryWidth = viewportWidth > 0 ? (viewportWidth - 32) / 3 : 110;
  const categoryStep = categoryWidth + 12;
  const snapOffsets = categories.map((_, index) => index * categoryStep);
  const { scrollRef, handleScrollBeginDrag, handleScrollSettled } =
    useAutoSwiper({
      itemCount: categories.length,
      visibleCount: 3,
      itemStep: categoryStep,
      contentWidth,
      viewportWidth,
    });

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
      <View className="mx-4">
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}
          onContentSizeChange={width => setContentWidth(width)}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollSettled}
          onMomentumScrollEnd={handleScrollSettled}
          snapToInterval={categoryStep}
          snapToAlignment="start"
          snapToOffsets={snapOffsets}
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={styles.scrollContent}>
          {categories.map((category, index) => {
            const imageUri = categoryImage(category);
            return (
              <Pressable
                key={category.catId ?? category.id ?? category.name ?? index}
                accessibilityRole="button"
                onPress={() => onCategoryPress(category.name)}
                style={{ width: categoryWidth }}
                className={`items-center ${
                  index === categories.length - 1 ? 'mr-0' : 'mr-3'
                }`}>
                <View
                  className="h-[104px] overflow-hidden rounded-[18px] bg-[#F1E5D7]"
                  style={{ width: categoryWidth }}>
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
    </View>
  );
}
