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
  RadialGradient,
  Rect,
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
  { name: 'Home', icon: Home, label: 'Home' },
  { name: 'Explore', icon: Search, label: 'Explore' },
  { name: 'Cart', icon: ShoppingCart, label: 'Cart' },
  { name: 'Combos', icon: Gift, label: 'Combo' },
  { name: 'Profile', icon: UserRound, label: 'Account' },
] as const;

const GREEN = '#123D24';

export default function Tabs({
  activeTab,
  cartCount,
  bottomInset,
  onTabPress,
}: TabsProps) {
  const { width } = useWindowDimensions();
  const barWidth = width - 32;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        { paddingBottom: Math.max(bottomInset, 8) },
      ]}>
      <View style={[styles.bar, { width: barWidth }]}>

        {/* ── SVG background: pill + orange corner blobs ── */}
        <Svg
          pointerEvents="none"
          width={barWidth}
          height={90}
          viewBox="0 0 400 90"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}>
          <Defs>
            {/* Bar gradient – warm cream */}
            <LinearGradient id="barBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFF8EC" />
              <Stop offset="100%" stopColor="#FFF3DC" />
            </LinearGradient>
            {/* Orange corner blob gradient */}
            <LinearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFB820" />
              <Stop offset="100%" stopColor="#FF4A0A" />
            </LinearGradient>
            {/* Glow behind cart */}
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FF8C00" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#FF8C00" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Pill background */}
          <Rect
            x="1" y="1" width="398" height="88"
            rx="44"
            fill="url(#barBg)"
            stroke="#FFAA44"
            strokeWidth="1.5"
          />

          {/* Left orange blob */}
          <Path
            d="M0 48C0 20 18 2 46 2h68C82 12 46 36 10 82 4 72 0 61 0 48Z"
            fill="url(#blobGrad)"
          />
          {/* Left bottom accent wave */}
          <Path
            d="M0 72 C12 60 32 56 60 62 L46 88 Q22 88 6 82Z"
            fill="#FF6010"
            opacity="0.9"
          />

          {/* Right orange blob */}
          <Path
            d="M400 48C400 20 382 2 354 2h-68c32 10 68 34 104 80 6-10 10-21 10-34Z"
            fill="url(#blobGrad)"
          />
          {/* Right bottom accent wave */}
          <Path
            d="M400 72 C388 60 368 56 340 62 L354 88 Q378 88 394 82Z"
            fill="#FF6010"
            opacity="0.9"
          />

          {/* Subtle glow behind center cart button */}
          <Circle cx="200" cy="10" r="55" fill="url(#glow)" />
        </Svg>

        {/* ── Tabs row ── */}
        <View style={styles.tabsRow}>
          {tabs.map(({ name, icon: Icon, label }) => {
            const active = activeTab === name;

            // Centre slot – reserved for the floating cart
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
                  pressed && styles.pressed,
                ]}>
                <Icon
                  size={24}
                  color={GREEN}
                  fill={active && name === 'Home' ? GREEN : 'transparent'}
                  strokeWidth={2.2}
                />
                <Text style={[styles.label, active && styles.activeLabel]}>
                  {label}
                </Text>
                {active && <View style={styles.activeIndicator} />}
              </Pressable>
            );
          })}
        </View>

        {/* ── Separators: left of Explore, right of Combo ── */}
        <View pointerEvents="none" style={[styles.sep, styles.sepLeft]} />
        <View pointerEvents="none" style={[styles.sep, styles.sepRight]} />

        {/* ── Floating cart button ── */}
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'Cart' }}
          accessibilityLabel={`Cart tab, ${cartCount} items`}
          onPress={() => onTabPress('Cart')}
          style={({ pressed }) => [styles.cartBtn, pressed && styles.pressed]}>

          {/* Outer glow ring */}
          <Svg width={94} height={94} viewBox="0 0 94 94" pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="cartGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FFAA00" stopOpacity="0.5" />
                <Stop offset="100%" stopColor="#FF4A00" stopOpacity="0" />
              </RadialGradient>
              <LinearGradient id="cartGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                <Stop offset="0%" stopColor="#FFAE1A" />
                <Stop offset="100%" stopColor="#FF3E08" />
              </LinearGradient>
            </Defs>
            {/* Glow halo */}
            <Circle cx="47" cy="47" r="47" fill="url(#cartGlow)" />
            {/* White border ring */}
            <Circle cx="47" cy="47" r="38" fill="white" />
            {/* Orange filled circle */}
            <Circle cx="47" cy="47" r="34" fill="url(#cartGrad)" />
            {/* Subtle inner highlight */}
            <Circle cx="47" cy="37" r="14" fill="white" opacity="0.12" />
          </Svg>

          <ShoppingCart
            size={30}
            color="#FFFFFF"
            strokeWidth={2.3}
            style={styles.cartIcon}
          />

          {/* Badge */}
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
    shadowColor: '#FF6010',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  tabsRow: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartSlot: {
    flex: 1.1,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    gap: 4,
  },
  pressed: {
    opacity: 0.68,
  },
  label: {
    color: GREEN,
    fontSize: 11.5,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  activeLabel: {
    fontWeight: '700',
    fontSize: 12,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 9,
    width: 36,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#FF5000',
  },

  /* Thin dividers */
  sep: {
    position: 'absolute',
    top: 22,
    height: 46,
    width: 1,
    backgroundColor: '#D4914A',
    opacity: 0.6,
  },
  sepLeft: {
    left: '25%',
  },
  sepRight: {
    right: '25%',
  },

  /* Cart FAB */
  cartBtn: {
    position: 'absolute',
    left: '50%',
    top: -28,
    width: 94,
    height: 94,
    marginLeft: -47,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 16,
  },
  cartIcon: {
    position: 'absolute',
  },

  /* Badge */
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 26,
    height: 26,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#F23D0A',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
});
