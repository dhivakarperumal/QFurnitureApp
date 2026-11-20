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

/** Small orange blob rendered via SVG, clipped to the pill corners */
function CornerBlob({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left';
  return (
    <Svg
      width={110}
      height={90}
      viewBox="0 0 110 90"
      pointerEvents="none"
      style={[styles.blobSvg, isLeft ? styles.blobLeft : styles.blobRight]}>
      <Defs>
        <LinearGradient
          id={`blob-${side}`}
          x1={isLeft ? '0%' : '100%'}
          y1="0%"
          x2={isLeft ? '100%' : '0%'}
          y2="100%">
          <Stop offset="0%"   stopColor="#FFB820" />
          <Stop offset="100%" stopColor="#FF4A0A" />
        </LinearGradient>
      </Defs>
      {isLeft ? (
        <>
          {/* Main blob */}
          <Path
            d="M0 0 Q55 0 55 45 Q55 70 20 85 L0 90 Z"
            fill={`url(#blob-${side})`}
          />
          {/* Darker bottom accent */}
          <Path
            d="M0 60 Q25 52 45 65 L20 90 L0 90 Z"
            fill="#E84E00"
            opacity="0.85"
          />
        </>
      ) : (
        <>
          <Path
            d="M110 0 Q55 0 55 45 Q55 70 90 85 L110 90 Z"
            fill={`url(#blob-${side})`}
          />
          <Path
            d="M110 60 Q85 52 65 65 L90 90 L110 90 Z"
            fill="#E84E00"
            opacity="0.85"
          />
        </>
      )}
    </Svg>
  );
}

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
      style={[styles.container, { paddingBottom: Math.max(bottomInset, 8) }]}>

      {/* ── Pill bar ── */}
      <View style={[styles.bar, { width: barWidth }]}>

        {/* Cream pill background */}
        <View style={styles.pillBg} />

        {/* Orange corner blobs (clipped inside pill via overflow:hidden on pillBg) */}
        <CornerBlob side="left" />
        <CornerBlob side="right" />

        {/* Thin dividers */}
        <View pointerEvents="none" style={[styles.sep, styles.sepLeft]} />
        <View pointerEvents="none" style={[styles.sep, styles.sepRight]} />

        {/* Tab buttons */}
        <View style={styles.tabsRow}>
          {tabs.map(({ name, icon: Icon, label }) => {
            const active = activeTab === name;

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

        {/* ── Floating Cart FAB ── */}
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'Cart' }}
          accessibilityLabel={`Cart tab, ${cartCount} items`}
          onPress={() => onTabPress('Cart')}
          style={({ pressed }) => [styles.cartBtn, pressed && styles.pressed]}>

          {/* Cart circle drawn with SVG for the gradient */}
          <Svg
            width={82}
            height={82}
            viewBox="0 0 82 82"
            pointerEvents="none"
            style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="cartGrad" x1="30%" y1="0%" x2="70%" y2="100%">
                <Stop offset="0%"   stopColor="#FFBE28" />
                <Stop offset="100%" stopColor="#FF3E08" />
              </LinearGradient>
            </Defs>
            {/* White ring */}
            <Circle cx="41" cy="41" r="40" fill="#FFFFFF" />
            {/* Orange filled circle */}
            <Circle cx="41" cy="41" r="35" fill="url(#cartGrad)" />
            {/* Soft highlight */}
            <Circle cx="41" cy="30" r="13" fill="#FFFFFF" opacity="0.15" />
          </Svg>

          <ShoppingCart
            size={30}
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 20,
  },

  /* Outer pill shell — no background colour here, it comes from pillBg */
  bar: {
    height: 90,
    borderRadius: 45,
    position: 'relative',
    overflow: 'hidden',       // clips blobs to pill shape ✅
    shadowColor: '#FF6010',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },

  /* Cream pill background fills the whole bar */
  pillBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF7E8',
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: '#FFAA44',
  },

  /* Blob SVGs — absolutely positioned inside the bar */
  blobSvg: {
    position: 'absolute',
    top: 0,
  },
  blobLeft:  { left: 0  },
  blobRight: { right: 0 },

  /* Thin vertical dividers */
  sep: {
    position: 'absolute',
    top: 22,
    height: 46,
    width: 1,
    backgroundColor: '#C8894A',
    opacity: 0.55,
  },
  sepLeft:  { left: '25%'  },
  sepRight: { right: '25%' },

  /* Row of tabs */
  tabsRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    gap: 3,
  },
  pressed: {
    opacity: 0.65,
  },
  label: {
    color: GREEN,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
  activeLabel: {
    fontWeight: '700',
    fontSize: 11.5,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 10,
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FF5000',
  },

  /* Floating cart button — sits ABOVE overflow:hidden bar via absolute on container */
  cartBtn: {
    position: 'absolute',
    left: '50%',
    top: -24,                 // floats above the bar
    width: 82,
    height: 82,
    marginLeft: -41,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4A00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 18,
    zIndex: 30,
  },
  cartIcon: {
    position: 'absolute',
  },

  /* Badge */
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#F23D0A',
    zIndex: 31,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
  },
});
