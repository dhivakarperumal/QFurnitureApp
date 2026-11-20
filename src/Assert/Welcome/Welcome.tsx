import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  ImageSourcePropType,
  PanResponder,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';

const slides: {
  image: ImageSourcePropType;
  title: string;
  description: string;
}[] = [
  {
    image: require('./1.png'),
    title: 'Make room for comfort',
    description:
      'Discover thoughtfully designed furniture, cosy accents, and timeless pieces that make every corner feel like home.',
  },
  {
    image: require('./2.png'),
    title: 'Find your own style',
    description:
      'Explore thoughtfully chosen furniture, colours, and finishing touches for the spaces you love most, and create rooms that feel uniquely yours.',
  },
  {
    image: require('./3.png'),
    title: 'Delivered with care',
    description:
      'Choose your favourite pieces and let us bring them to your doorstep.',
  },
];

export default function Welcome({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex === slides.length - 1;
  const slide = slides[activeIndex];
  const contentBottomMargin =
    activeIndex === 1
      ? 'mb-[50px]'
      : activeIndex === 2
        ? 'mb-[30px]'
        : 'mb-[40px]';
  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 16 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -50) {
            setActiveIndex(index => Math.min(index + 1, slides.length - 1));
          } else if (gesture.dx > 50) {
            setActiveIndex(index => Math.max(index - 1, 0));
          }
        },
      }),
    [],
  );

  return (
    <ImageBackground
      source={slide.image}
      resizeMode="cover"
      className="flex-1 bg-[#FFF7ED]">
      <StatusBar
        barStyle="light-content"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip welcome"
        onPress={onComplete}
        style={{ top: insets.top + 14 }}
        className="absolute right-6 z-10 rounded-full bg-black/20 px-4 py-2">
        <Text className="text-[13px] font-bold text-white">Skip</Text>
      </Pressable>
      <View
        {...swipeResponder.panHandlers}
        className={`flex-1 justify-end px-6 ${contentBottomMargin}`}
        style={{
          paddingTop: insets.top + 14,
          paddingBottom: Math.max(insets.bottom, 20) + 18,
        }}>
        <View className="mb-10 w-full items-center">
          <Text className="text-center text-[28px] font-black leading-[34px] text-[#351D0E]">
            {slide.title}
          </Text>
          <Text className="mt-3 max-w-[330px] text-center text-[14px] leading-5 text-[#725D4B]">
            {slide.description}
          </Text>
        </View>
        <View className="w-full items-center">
          <View
            accessibilityLabel={`Page ${activeIndex + 1} of ${slides.length}`}
            className="mb-7 flex-row items-center">
            {slides.map((item, index) => (
              <View
                key={item.title}
                className={`mx-1 h-2 rounded-full ${
                  index === activeIndex ? 'w-7 bg-[#F97316]' : 'w-2 bg-[#D9C4AA]'
                }`}
              />
            ))}
          </View>

          <View className="w-full max-w-[380px] flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isLastSlide ? 'Get started' : 'Next welcome page'}
              onPress={() =>
                isLastSlide
                  ? onComplete()
                  : setActiveIndex(index => index + 1)
              }
              className="h-[52px] flex-1 flex-row items-center justify-center rounded-full bg-[#F97316] shadow-md">
              <Text className="mr-2 text-[15px] font-black text-white">
                {isLastSlide ? 'Get started' : 'Continue'}
              </Text>
              <ArrowRight size={19} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}
