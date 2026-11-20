import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import {
  Gift,
  Home,
  Ellipsis,
  Search,
  ShoppingCart,
} from 'lucide-react-native';
import type { StoreTab } from './types';

type TabsProps = {
  activeTab: StoreTab;
  cartCount: number;
  bottomInset: number;
  onTabPress: (tab: StoreTab) => void;
};

const tabs = [
  { name: 'Home', icon: Home, label: 'Home' },
  { name: 'Explore', icon: Search, label: 'Explore' },
  { name: 'Cart', icon: ShoppingCart, label: 'Cart' },
  { name: 'Combos', icon: Gift, label: 'Combo' },
  { name: 'Profile', icon: Ellipsis, label: 'More' },
] as const;

const GREEN = '#123D24';

export default function Tabs({
  activeTab,
  cartCount,
  bottomInset,
  onTabPress,
}: TabsProps) {
  const { width } = useWindowDimensions();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        { paddingBottom: Math.max(bottomInset, 8) },
      ]}>
      <View style={styles.bar}>
        <Svg
          pointerEvents="none"
          width={width - 32}
          height={90}
          viewBox="0 0 400 90"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="barOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFB21A" />
              <Stop offset="100%" stopColor="#FF4A0A" />
            </LinearGradient>
          </Defs>
          <Rect
            x="1"
            y="1"
            width="398"
            height="88"
            rx="44"
            fill="#FFF9EF"
            stroke="#FF9B28"
            strokeWidth="2"
          />
          <Path
            d="M2 45C7 17 26 2 58 2h53C72 10 34 31 8 74 4 67 2 57 2 45Z"
            fill="url(#barOrange)"
          />
          <Path
            d="M398 45c-5-28-24-43-56-43h-53c39 8 77 29 103 72 4-7 6-17 6-29Z"
            fill="url(#barOrange)"
          />
          <Path
            d="M16 79c25 8 47 7 67 5 18-2 34 1 50 4H24c-7 0-11-3-8-9Zm368 0c-25 8-47 7-67 5-18-2-34 1-50 4h109c7 0 11-3 8-9Z"
            fill="#FF6A0A"
            opacity="0.85"
          />
        </Svg>

        <View style={styles.tabsRow}>
          {tabs.map(({ name, icon: Icon, label }) => {
            const active = activeTab === name;

            if (name === 'Cart') {
              return <View key={name} style={styles.tabSlot} />;
            }

            return (
              <Pressable
                key={name}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label} tab`}
                onPress={() => onTabPress(name)}
                style={({ pressed }) => [
                  styles.tab,
                  pressed && styles.pressed,
                ]}>
                <Icon
                  size={25}
                  color={GREEN}
                  fill={active && name === 'Home' ? GREEN : 'transparent'}
                  strokeWidth={2.2}
                />
                <Text style={[styles.label, active && styles.activeLabel]}>
                  {label}
                </Text>
                {active ? <View style={styles.activeIndicator} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View
          pointerEvents="none"
          style={[styles.separator, styles.leftSeparator]}
        />
        <View
          pointerEvents="none"
          style={[styles.separator, styles.rightSeparator]}
        />

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'Cart' }}
          accessibilityLabel={`Cart tab, ${cartCount} items`}
          onPress={() => onTabPress('Cart')}
          style={({ pressed }) => [
            styles.cartButton,
            pressed && styles.pressed,
          ]}>
          <Svg width={82} height={82} viewBox="0 0 82 82" pointerEvents="none">
            <Defs>
              <LinearGradient
                id="cartOrange"
                x1="20%"
                y1="0%"
                x2="80%"
                y2="100%">
                <Stop offset="0%" stopColor="#FF9F17" />
                <Stop offset="100%" stopColor="#FF3E08" />
              </LinearGradient>
            </Defs>
            <Circle
              cx="41"
              cy="41"
              r="39"
              fill="url(#cartOrange)"
              stroke="#FFFFFF"
              strokeWidth="5"
            />
            <Circle
              cx="41"
              cy="41"
              r="39"
              fill="none"
              stroke="#FFB34F"
              strokeWidth="1.5"
              opacity="0.8"
            />
          </Svg>
          <ShoppingCart
            size={37}
            color="#FFFFFF"
            strokeWidth={2.2}
            style={styles.cartIcon}
          />
          {cartCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {cartCount > 99 ? '99+' : cartCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  bar: {
    height: 90,
    borderRadius: 45,
    position: 'relative',
    shadowColor: '#F45B12',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  tabsRow: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabSlot: {
    flex: 1,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    marginTop: 5,
    color: GREEN,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
  },
  activeLabel: {
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 10,
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF5B0A',
  },
  separator: {
    position: 'absolute',
    top: 26,
    height: 38,
    width: 1,
    backgroundColor: '#E9B777',
    opacity: 0.75,
  },
  leftSeparator: {
    left: '20%',
  },
  rightSeparator: {
    left: '80%',
  },
  cartButton: {
    position: 'absolute',
    left: '50%',
    top: -25,
    width: 82,
    height: 82,
    marginLeft: -41,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
    shadowColor: '#FF5B0A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  cartIcon: {
    position: 'absolute',
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: -2,
    minWidth: 29,
    height: 29,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#F23D0A',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
