import React from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HomeProps = {
  onActionPress?: (label: string) => void;
};

const stats = [
  { label: 'Total Products', value: '284', icon: '▣', color: '#F59E0B' },
  { label: 'Orders', value: '1,248', icon: '▤', color: '#10B981' },
  { label: 'Revenue', value: '₹8.42L', icon: '₹', color: '#F97316' },
  { label: 'Pending', value: '36', icon: '◷', color: '#EF4444' },
];

const quickActions = [
  { label: 'Add Product', icon: '＋', color: '#F59E0B' },
  { label: 'New Order', icon: '▤', color: '#3B82F6' },
  { label: 'Categories', icon: '▦', color: '#10B981' },
  { label: 'Customers', icon: '♙', color: '#8B5CF6' },
  { label: 'Stock', icon: '⚠', color: '#F59E0B' },
];

const orders = [
  { id: '#ORD-1048', customer: 'Rahul', date: '18 Nov', amount: '₹24,500', status: 'Delivered', color: '#10B981' },
  { id: '#ORD-1047', customer: 'Priya', date: '18 Nov', amount: '₹18,200', status: 'Shipped', color: '#F97316' },
  { id: '#ORD-1046', customer: 'Arun', date: '17 Nov', amount: '₹32,900', status: 'Confirmed', color: '#3B82F6' },
];

const statusOverview = [
  { label: 'Placed', count: 12, color: '#FBBF24' },
  { label: 'Confirmed', count: 8, color: '#3B82F6' },
  { label: 'Packed', count: 5, color: '#A855F7' },
  { label: 'Shipped', count: 7, color: '#F97316' },
  { label: 'Delivered', count: 24, color: '#10B981' },
];

const lowStock = [
  { name: 'Royal Lounge Chair', stock: 2 },
  { name: 'Oak Dining Table', stock: 4 },
  { name: 'Modern Wardrobe', stock: 3 },
];

export default function Home({ onActionPress }: HomeProps) {
  const insets = useSafeAreaInsets();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName="px-4 pb-[126px]"
      style={{ paddingTop: insets.top + 170 }}>
      <View className="mb-4 min-h-[118px] justify-center overflow-hidden rounded-[22px] bg-[#17191C] px-5 py-5">
        <View className="absolute -right-10 -top-14 h-[130px] w-[130px] rounded-full bg-white/10" />
        <View className="absolute -bottom-14 right-16 h-[110px] w-[110px] rounded-full bg-[#F59E0B]/20" />
        <Text className="text-[12px] font-bold uppercase tracking-[2px] text-[#FFD45A]">
          Admin dashboard
        </Text>
        <Text className="mt-1 text-[24px] font-black text-white">
          {greeting}!
        </Text>
        <Text className="mt-1 text-[13px] text-white/75">
          Here’s what’s happening with your store today.
        </Text>
      </View>

      <View className="mb-4 flex-row flex-wrap justify-between">
        {stats.map(stat => (
          <View
            key={stat.label}
            className="mb-3 w-[48%] rounded-[18px] border border-[#ECE8DF] bg-white p-4 shadow-sm elevation-[3]">
            <View
              className="mb-3 h-[42px] w-[42px] items-center justify-center rounded-[14px]"
              style={{ backgroundColor: stat.color }}>
              <Text className="text-[21px] font-black text-white">{stat.icon}</Text>
            </View>
            <Text className="text-[12px] font-bold text-[#718080]">
              {stat.label}
            </Text>
            <Text className="mt-1 text-[24px] font-black text-[#17191C]">
              {stat.value}
            </Text>
          </View>
        ))}
      </View>

      <View className="mb-4 rounded-[18px] border border-[#F4D89A] bg-[#F8F9FA] px-4 py-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => onActionPress?.('Low Stock')}
          className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="mr-3 text-[18px] text-[#D97706]">⚠</Text>
            <Text className="text-[13px] font-bold text-[#92400E]">
              3 products need restocking
            </Text>
          </View>
          <Text className="text-[13px] font-black text-[#B45309]">Review →</Text>
        </Pressable>
      </View>

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Sales Overview
          </Text>
          <View className="rounded-full bg-[#F8F9FA] px-3 py-1.5">
            <Text className="text-[11px] font-bold text-[#A16207]">
              This Week
            </Text>
          </View>
        </View>
        <View className="h-[150px] flex-row items-end justify-between px-1">
          {[42, 68, 54, 82, 61, 94, 72].map((height, index) => (
            <View key={index} className="items-center">
              <View
                className="w-[26px] rounded-t-[8px] bg-[#F59E0B]"
                style={{ height: height * 1.18 }}
              />
              <Text className="mt-2 text-[10px] font-bold text-[#94A3B8]">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <Text className="mb-4 text-[17px] font-black text-[#17191C]">
          Orders Overview
        </Text>
        {statusOverview.map(item => (
          <View key={item.label} className="mb-3">
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-[12px] font-semibold text-[#64748B]">
                {item.label}
              </Text>
              <Text className="text-[12px] font-black text-[#17191C]">
                {item.count}
              </Text>
            </View>
            <View className="h-[7px] overflow-hidden rounded-full bg-[#EDF2F4]">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, item.count * 4)}%`,
                  backgroundColor: item.color,
                }}
              />
            </View>
          </View>
        ))}
      </View>

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Quick Actions
          </Text>
          <Text className="text-[11px] font-bold text-[#A16207]">
            5 shortcuts
          </Text>
        </View>
        <View className="flex-row flex-wrap justify-between">
          {quickActions.map(action => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              onPress={() => onActionPress?.(action.label)}
              className="mb-3 h-[88px] w-[31%] items-center justify-center rounded-[16px] border border-[#ECE8DF] bg-[#FFFCF7]"
              style={({ pressed }) => (pressed ? { opacity: 0.65 } : null)}>
              <View
                className="mb-2 h-[38px] w-[38px] items-center justify-center rounded-[12px]"
                style={{ backgroundColor: action.color }}>
                <Text className="text-[18px] font-black text-white">
                  {action.icon}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                className="px-1 text-[10px] font-bold text-[#17191C]">
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Low Stock Alert
          </Text>
          <Pressable onPress={() => onActionPress?.('View Stock')}>
            <Text className="text-[12px] font-bold text-[#7C3AED]">
              View All
            </Text>
          </Pressable>
        </View>
        {lowStock.map(item => (
          <View
            key={item.name}
            className="mb-3 flex-row items-center rounded-[12px] bg-[#FFFBF5] p-3">
            <View className="mr-3 h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#FFE8C2]">
              <Text className="text-[18px]">▣</Text>
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="text-[13px] font-bold text-[#17191C]">
                {item.name}
              </Text>
              <Text className="mt-1 text-[11px] text-[#94A3B8]">
                Stock: <Text className="font-black text-[#EF4444]">{item.stock}</Text>
              </Text>
            </View>
            <View className="rounded-full bg-[#FEE2E2] px-2 py-1">
              <Text className="text-[9px] font-bold text-[#EF4444]">
                Low Stock
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className="rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Recent Orders
          </Text>
          <Pressable onPress={() => onActionPress?.('View Orders')}>
            <Text className="text-[12px] font-bold text-[#F59E0B]">
              View All →
            </Text>
          </Pressable>
        </View>
        {orders.map(order => (
          <Pressable
            key={order.id}
            onPress={() => onActionPress?.(order.id)}
            className="mb-3 flex-row items-center border-b border-[#F1F5F9] pb-3">
            <View className="mr-3 h-[38px] w-[38px] items-center justify-center rounded-full bg-[#FFF1D6]">
              <Text className="text-[13px] font-black text-[#B45309]">
                {order.customer.charAt(0)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-black text-[#17191C]">
                {order.id}
              </Text>
              <Text className="mt-0.5 text-[11px] text-[#94A3B8]">
                {order.customer} • {order.date}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[12px] font-black text-[#17191C]">
                {order.amount}
              </Text>
              <Text
                className="mt-1 text-[10px] font-bold"
                style={{ color: order.color }}>
                {order.status}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}