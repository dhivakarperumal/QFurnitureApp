import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  ChevronRight,
  Info,
  KeyRound,
  Mail,
  MapPin,
  PackageCheck,
  UserRound,
} from 'lucide-react-native';

export type MoreDestination =
  | 'account'
  | 'profile'
  | 'addresses'
  | 'orders'
  | 'password'
  | 'about'
  | 'contact';

type MoreMenuProps = {
  onSelect: (destination: MoreDestination) => void;
};

const menuItems = [
  { destination: 'profile', label: 'Profile', icon: UserRound },
  { destination: 'addresses', label: 'Addresses', icon: MapPin },
  { destination: 'orders', label: 'Orders', icon: PackageCheck },
  { destination: 'password', label: 'Set Password', icon: KeyRound },
  { destination: 'about', label: 'About Us', icon: Info },
  { destination: 'contact', label: 'Contact Us', icon: Mail },
] as const;

export function MoreMenu({ onSelect }: MoreMenuProps) {
  return (
    <View className="flex-1 bg-[#FCFAF7] px-4 pt-5">
      <View className="gap-3">
        {menuItems.map(({ destination, label, icon: Icon }) => (
          <Pressable
            key={destination}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onSelect(destination)}
            className="h-[76px] flex-row items-center rounded-[18px] border border-[#F0E7DE] bg-white px-4 shadow-sm elevation-[2]">
            <View className="h-[44px] w-[44px] items-center justify-center rounded-full bg-[#FFF0E1]">
              <Icon size={21} color="#E87524" strokeWidth={2} />
            </View>
            <Text className="ml-4 flex-1 text-[16px] font-bold text-[#351D0E]">
              {label}
            </Text>
            <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#FCF7F1]">
              <ChevronRight size={18} color="#B89478" strokeWidth={2.2} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type MorePlaceholderProps = {
  message: string;
};

export function MorePlaceholder({ message }: MorePlaceholderProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-center text-[14px] text-[#8B735E]">{message}</Text>
    </View>
  );
}
