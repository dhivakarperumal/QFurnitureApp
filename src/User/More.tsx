import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  ChevronRight,
  Info,
  Mail,
  Trash2,
  UserRound,
} from 'lucide-react-native';

export type MoreDestination = 'account' | 'about' | 'contact';

type MoreMenuProps = {
  onSelect: (destination: MoreDestination) => void;
  onDeleteAccount: () => void;
  deletingAccount: boolean;
};

const menuItems = [
  { destination: 'account', label: 'My Account', icon: UserRound },
  { destination: 'about', label: 'About Us', icon: Info },
  { destination: 'contact', label: 'Contact Us', icon: Mail },
] as const;

export function MoreMenu({
  onSelect,
  onDeleteAccount,
  deletingAccount,
}: MoreMenuProps) {
  return (
    <View className="flex-1 bg-[#FCFAF7] px-4 pt-5">
      <View className="overflow-hidden rounded-[16px] border border-[#F0E7DE] bg-white">
        {menuItems.map(({ destination, label, icon: Icon }, index) => (
          <Pressable
            key={destination}
            accessibilityRole="button"
            onPress={() => onSelect(destination)}
            className={`h-[64px] flex-row items-center px-4 ${
              index < menuItems.length - 1
                ? 'border-b border-[#F7EDE4]'
                : ''
            }`}>
            <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-[#FFF0E1]">
              <Icon size={19} color="#F97316" />
            </View>
            <Text className="ml-3 flex-1 text-[15px] font-semibold text-[#351D0E]">
              {label}
            </Text>
            <ChevronRight size={18} color="#C09A7E" />
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete account"
        accessibilityState={{ disabled: deletingAccount }}
        disabled={deletingAccount}
        onPress={onDeleteAccount}
        className="mt-4 flex-row items-center rounded-[16px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-4 disabled:opacity-60">
        <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-[#FEE2E2]">
          <Trash2 size={19} color="#DC2626" />
        </View>
        <Text className="ml-3 flex-1 text-[15px] font-semibold text-[#B91C1C]">
          {deletingAccount ? 'Deleting account...' : 'Delete Account'}
        </Text>
        {deletingAccount ? (
          <ActivityIndicator size="small" color="#DC2626" />
        ) : (
          <ChevronRight size={18} color="#DC2626" />
        )}
      </Pressable>
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
