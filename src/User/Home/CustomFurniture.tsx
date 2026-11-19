import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { ArrowRight, Check } from 'lucide-react-native';

const steps = ['Choose design', 'Select material', 'Custom size', 'Get a quote'];

type CustomFurnitureProps = {
  onRequestPress: () => void;
};

export default function CustomFurniture({
  onRequestPress,
}: CustomFurnitureProps) {
  return (
    <View className="mt-5 px-4">
      <View className="overflow-hidden rounded-[20px] border border-[#F0DFCD] bg-white p-3 shadow-sm">
        <View className="flex-row items-center">
          <Image
            source={require('../../Assert/images/Cozy Mustard Armchair Living Room.png')}
            accessibilityLabel="Made-to-order furniture"
            resizeMode="cover"
            className="h-[82px] w-[92px] rounded-[14px]"
          />
          <View className="ml-3 flex-1">
            <Text className="text-[9px] font-bold uppercase tracking-[1.4px] text-[#A06E46]">
              Your idea, our craft
            </Text>
            <Text className="mt-1 text-[17px] font-black leading-5 text-[#351D0E]">
              Custom Furniture
            </Text>
            <Text className="text-[17px] font-black leading-5 text-[#E96B0B]">
              Tailored for You
            </Text>
          </View>
        </View>
        <View className="mt-3 flex-row flex-wrap">
          {steps.map(step => (
            <View key={step} className="mb-2 mr-3 flex-row items-center">
              <View className="mr-1 h-[17px] w-[17px] items-center justify-center rounded-full bg-[#FFF0DF]">
                <Check size={11} color="#E96B0B" strokeWidth={3} />
              </View>
              <Text className="text-[10px] font-semibold text-[#594333]">{step}</Text>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onRequestPress}
          className="mt-1 min-h-[42px] flex-row items-center justify-center rounded-full bg-[#E96B0B] px-4">
          <Text className="mr-2 text-[12px] font-bold text-white">
            Request custom furniture
          </Text>
          <ArrowRight size={15} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
