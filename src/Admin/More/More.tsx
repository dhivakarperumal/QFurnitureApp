import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ChevronRight, LayoutGrid, UsersRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Categery from './Categery';
import Usermanagement from './Usermanagement';

type MoreProps = {
  onScrollVisibilityChange?: (visible: boolean) => void;
  onDetailsVisibilityChange?: (visible: boolean) => void;
};

export default function More({
  onScrollVisibilityChange,
  onDetailsVisibilityChange,
}: MoreProps) {
  const insets = useSafeAreaInsets();
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);
  const [usersOpen, setUsersOpen] = React.useState(false);

  const openCategories = () => {
    setCategoriesOpen(true);
    onDetailsVisibilityChange?.(true);
    onScrollVisibilityChange?.(true);
  };

  const closeCategories = () => {
    setCategoriesOpen(false);
    onDetailsVisibilityChange?.(false);
    onScrollVisibilityChange?.(true);
  };

  const openUsers = () => {
    setUsersOpen(true);
    onDetailsVisibilityChange?.(true);
    onScrollVisibilityChange?.(true);
  };

  const closeUsers = () => {
    setUsersOpen(false);
    onDetailsVisibilityChange?.(false);
    onScrollVisibilityChange?.(true);
  };

  if (categoriesOpen) {
    return (
      <Categery
        onScrollVisibilityChange={onScrollVisibilityChange}
        onBackPress={closeCategories}
      />
    );
  }

  if (usersOpen) {
    return (
      <Usermanagement
        onScrollVisibilityChange={onScrollVisibilityChange}
        onBackPress={closeUsers}
      />
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName="px-4 pb-[255px]"
      style={{ paddingTop: insets.top + 84 }}
    >
      <Text className="mb-4 text-[18px] font-black text-[#17191C]">More</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open categories"
        onPress={openCategories}
        className="flex-row items-center rounded-[18px] border border-[#FCE6D7] bg-white p-4 shadow-sm elevation-[2]"
      >
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#FFF1D6]">
          <LayoutGrid size={25} color="#F97316" strokeWidth={2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-black text-[#17191C]">
            Categories
          </Text>
          <Text className="mt-1 text-[11px] text-[#64748B]">
            View and manage furniture categories
          </Text>
        </View>
        <ChevronRight size={21} color="#94A3B8" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open user management"
        onPress={openUsers}
        className="mt-3 flex-row items-center rounded-[18px] border border-[#FCE6D7] bg-white p-4 shadow-sm elevation-[2]"
      >
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#FFF1D6]">
          <UsersRound size={25} color="#F97316" strokeWidth={2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-black text-[#17191C]">
            User Management
          </Text>
          <Text className="mt-1 text-[11px] text-[#64748B]">
            View and manage registered accounts
          </Text>
        </View>
        <ChevronRight size={21} color="#94A3B8" />
      </Pressable>
    </ScrollView>
  );
}
