import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { Gift, Home, Search, ShoppingCart, UserRound } from 'lucide-react-native';
import type { StoreTab } from './types';

type TabsProps = {
  activeTab: StoreTab;
  cartCount: number;
  bottomInset: number;
  onTabPress: (tab: StoreTab) => void;
};

const tabs = [
  { name: 'Home',    icon: Home,         label: 'Home'    },
  { name: 'Explore', icon: Search,       label: 'Explore' },
  { name: 'Cart',    icon: ShoppingCart, label: 'Cart'    },
  { name: 'Combos',  icon: Gift,         label: 'Combo'   },
  { name: 'Profile', icon: UserRound,    label: 'Account' },
] as const;

const GREEN = '#123D24';

// ─── Orange corner blobs ────────────────────────────────────────────────────
// Rendered inside the pill which has overflow:hidden, so they get clipped
// cleanly to the rounded pill shape automatically.
function LeftBlob() {
  return (
    <Svg
      width={120}
      height={90}
      viewBox="0 0 120 90"
      pointerEvents="none"
      style={styles.blobLeft}>
      <Defs>
        <LinearGradient id="lgL" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#FFB820" />
          <Stop offset="100%" stopColor="#FF4A0A" />
        </LinearGradient>
      </Defs>
      {/* Main blob */}
      <Path d="M0 0 C60 0 75 20 70 45 C65 70 50 88 0 90 Z" fill="url(#lgL)" />
      {/* Darker bottom accent */}
      <Path d="M0 58 C30 50 55 65 50 90 L0 90 Z" fill="#D94200" opacity="0.75" />
    </Svg>
  );
}

function RightBlob() {
  return (
    <Svg
      width={120}
      height={90}
      viewBox="0 0 120 90"
      pointerEvents="none"
      style={styles.blobRight}>
      <Defs>
        <LinearGradient id="lgR" x1="100%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%"   stopColor="#FFB820" />
          <Stop offset="100%" stopColor="#FF4A0A" />
        </LinearGradient>
      </Defs>
      {/* Main blob (mirrored) */}
      <Path d="M120 0 C60 0 45 20 50 45 C55 70 70 88 120 90 Z" fill="url(#lgR)" />
      {/* Darker bottom accent */}
      <Path d="M120 58 C90 50 65 65 70 90 L120 90 Z" fill="#D94200" opacity="0.75" />
    </Svg>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function Tabs({
  activeTab,
  cartCount,
  bottomInset,
  onTabPress,
}: TabsProps) {
  const { width } = useWindowDimensions();
  const barWidth = width - 32;

  return (
    // Outermost: sits at bottom, full width
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingBottom: Math.max(bottomInset, 8) }]}>

      {/*
        Wrapper: tall enough to contain the floating cart button above the bar.
        NO overflow:hidden here — the cart button must not be clipped.
        Height = BAR_H (90) + CART_OVERFLOW (24) = 114
      */}
      <View style={[styles.wrapper, { width: barWidth }]}>

        {/*
          Pill bar: sits at the BOTTOM of the wrapper.
          overflow:hidden clips the blobs to the pill shape.
        */}
        <View style={styles.pill}>
          {/* Cream background */}
          <View style={styles.pillBg} />

          {/* Orange corner blobs — clipped by overflow:hidden */}
          <LeftBlob />
          <RightBlob />

          {/* Thin vertical dividers */}
          <View pointerEvents="none" style={[styles.sep, styles.sepLeft]} />
          <View pointerEvents="none" style={[styles.sep, styles.sepRight]} />

          {/* Tab buttons row */}
          <View style={styles.tabsRow}>
            {tabs.map(({ name, icon: Icon, label }) => {
              const active = activeTab === name;

              // Centre slot reserved for the floating cart
              if (name === 'Cart') {
                return <View key={name} style={styles.cartSlot} />;
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
                    pressed && styles.tabPressed,
                  ]}>
                  <Icon
                    size={22}
                    color={GREEN}
                    fill={active && name === 'Home' ? GREEN : 'transparent'}
                    strokeWidth={2.2}
                  />
                  <Text style={[styles.label, active && styles.activeLabel]}>
                    {label}
                  </Text>
                  {active && <View style={styles.activeBar} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/*
          Floating cart FAB: positioned on the WRAPPER (not inside the pill),
          so overflow:hidden on pill does NOT clip it.
          top: 0 of wrapper = 24px above the pill top edge.
        */}
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'Cart' }}
          accessibilityLabel={`Cart tab, ${cartCount} items`}
          onPress={() => onTabPress('Cart')}
          style={({ pressed }) => [
            styles.cartBtn,
            pressed && styles.tabPressed,
          ]}>

          {/* Cart circle gradient */}
          <Svg
            width={82}
            height={82}
            viewBox="0 0 82 82"
            pointerEvents="none"
            style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="cg" x1="30%" y1="0%" x2="70%" y2="100%">
                <Stop offset="0%"   stopColor="#FFBE28" />
                <Stop offset="100%" stopColor="#FF3E08" />
              </LinearGradient>
            </Defs>
            {/* White border ring */}
            <Circle cx="41" cy="41" r="40" fill="#FFFFFF" />
            {/* Orange fill */}
            <Circle cx="41" cy="41" r="34" fill="url(#cg)" />
            {/* Soft highlight shimmer */}
            <Circle cx="41" cy="30" r="13" fill="#FFFFFF" opacity="0.18" />
          </Svg>

          <ShoppingCart
            size={28}
            color="#FFFFFF"
            strokeWidth={2.3}
            style={styles.cartIcon}
          />

          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {cartCount > 99 ? '99+' : cartCount}
              </Text>
            </View>
          )}
        </Pressable>

      </View>
    </View>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────
const BAR_H       = 90;   // pill height
const CART_SIZE   = 82;   // cart button diameter
const CART_OVER   = 24;   // how many px the cart floats above the bar top
const WRAPPER_H   = BAR_H + CART_OVER;   // 114

const styles = StyleSheet.create({
  // Anchored to screen bottom
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 20,
  },

  // Tall wrapper: holds pill + floating cart, NO overflow hidden
  wrapper: {
    height: WRAPPER_H,
    position: 'relative',
    shadowColor: '#FF6010',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },

  // Pill bar: at the bottom of wrapper, clips blobs
  pill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_H,
    borderRadius: BAR_H / 2,
    overflow: 'hidden',   // ← clips blobs to rounded pill ✅
  },

  // Cream pill fill
  pillBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF7E8',
    borderWidth: 1.5,
    borderColor: '#FFAA44',
    borderRadius: BAR_H / 2,
  },

  // Blobs sit at corners inside the pill
  blobLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  blobRight: {
    position: 'absolute',
    top: 0,
    right: 0,
  },

  // Thin dividers
  sep: {
    position: 'absolute',
    top: 22,
    height: 46,
    width: 1,
    backgroundColor: '#BB7030',
    opacity: 0.5,
  },
  sepLeft:  { left: '25%'  },
  sepRight: { right: '25%' },

  // Tab buttons fill the pill height
  tabsRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartSlot: { flex: 1.1 },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabPressed: { opacity: 0.65 },

  label: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },
  activeLabel: {
    fontWeight: '700',
  },
  activeBar: {
    position: 'absolute',
    bottom: 10,
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FF5000',
  },

  // Cart FAB: on the wrapper (outside overflow:hidden pill) so it's never clipped
  cartBtn: {
    position: 'absolute',
    top: 0,                           // top of wrapper = CART_OVER above pill
    left: '50%',
    marginLeft: -(CART_SIZE / 2),     // -41
    width: CART_SIZE,
    height: CART_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4A00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 18,
  },
  cartIcon: {
    position: 'absolute',
  },

  // Notification badge
  badge: {
    position: 'absolute',
    top: 2,
    right: 1,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#F23D0A',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
});
