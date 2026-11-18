import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  ChartNoAxesCombined,
  House,
  ShoppingBag,
  UserRound,
} from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

export type BottomBarItem = 'Home' | 'Products' | 'Orders' | 'More';

export type BottomBarProps = {
  activeItem?: BottomBarItem;
  onItemPress?: (item: BottomBarItem) => void;
  onAddPress?: () => void;
  badgeCount?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

type NavigationItem = {
  destination: BottomBarItem;
  label: string;
};

const leftNavigationItems: ReadonlyArray<NavigationItem> = [
  { destination: 'Home', label: 'Home' },
  { destination: 'Products', label: 'Products' },
];

const rightNavigationItems: ReadonlyArray<NavigationItem> = [
  { destination: 'Orders', label: 'Reports' },
  { destination: 'More', label: 'Profile' },
];

/* -------------------------------------------------------------------------- */
/*                                ICON DESIGNS                                */
/* -------------------------------------------------------------------------- */

function NavigationIcon({
  label,
  active,
}: {
  label: BottomBarItem;
  active: boolean;
}) {
  const color = active ? colors.primary : '#4B5563';

  switch (label) {
    case 'Home':
      return (
        <House
          color={color}
          fill={active ? color : 'transparent'}
          size={24}
          strokeWidth={2.2}
        />
      );
    case 'Products':
      return <ShoppingBag color={color} size={24} strokeWidth={2.2} />;
    case 'Orders':
      return <ChartNoAxesCombined color={color} size={24} strokeWidth={2.2} />;
    case 'More':
      return <UserRound color={color} size={24} strokeWidth={2.2} />;
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                            MAIN BOTTOM BAR COMPONENT                        */
/* -------------------------------------------------------------------------- */

export default function Bottombar({
  activeItem = 'Home',
  onItemPress,
  onAddPress,
  badgeCount = 0,
  className,
  style,
}: BottomBarProps) {
  const insets = useSafeAreaInsets();

  const renderTab = ({ destination, label }: NavigationItem) => {
    const isActive = activeItem === destination;
    const color = isActive ? colors.primary : '#4B5563';

    return (
      <Pressable
        key={destination}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={`${label} Tab`}
        onPress={() => onItemPress?.(destination)}
        style={({ pressed }) => [
          styles.tabButton,
          pressed && { opacity: 0.65 },
        ]}>
        <View
          style={[
            styles.tabContent,
            isActive && styles.activeTabContent,
          ]}>
          <View style={styles.iconWrapper}>
            <NavigationIcon label={destination} active={isActive} />

            {/* Optional Notification Badge (e.g. for Orders) */}
            {destination === 'Orders' && badgeCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {badgeCount > 9 ? '9+' : badgeCount}
                </Text>
              </View>
            )}
          </View>

          <Text
            numberOfLines={1}
            style={[
              styles.tabLabel,
              {
                color,
                fontWeight: isActive ? '700' : '500',
              },
            ]}>
            {label}
          </Text>
        </View>

      </Pressable>
    );
  };

  const safeBottom = Math.max(insets.bottom, 12);

  return (
    <SafeAreaView
      edges={['bottom']}
      pointerEvents="box-none"
      style={[
        styles.outerContainer,
        style,
      ]}
      className={className}>
      {/* Dock Bar */}
      <View style={styles.dockBar}>
        <Svg
          pointerEvents="none"
          style={styles.centerWave}
          viewBox="0 0 400 48"
          preserveAspectRatio="none">
          <Path
            d="M0 1 H140 C164 1 172 4 184 19 C192 29 194 43 200 43 C206 43 208 29 216 19 C228 4 236 1 260 1 H400"
            fill="none"
            stroke="#FDBA74"
            strokeWidth={2}
          />
        </Svg>
        {/* Left Tabs: Home, Products */}
        <View style={styles.tabsGroup}>
          {leftNavigationItems.map(renderTab)}
        </View>

        {/* Center Slot Spacer (reserves width and displays aligned Add label) */}
        <View style={styles.centerSlot} />

        {/* Right Tabs: Orders, More */}
        <View style={styles.tabsGroup}>
          {rightNavigationItems.map(renderTab)}
        </View>
      </View>

      {/* Floating Center Plus Action Button (Rendered outside dockBar to avoid Android outline clipping) */}
      <View
        pointerEvents="box-none"
        style={[
          styles.floatingFabWrapper,
          {
            bottom: safeBottom + 26,
          },
        ]}>
        {/* Ambient Pulse Ring */}
        <View style={styles.pulseRing} />

        {/* Main Floating Action Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add Product or Order"
          onPress={onAddPress}
          style={({ pressed }) => [
            styles.fabButton,
            pressed && styles.fabPressed,
          ]}>
          <Svg
            pointerEvents="none"
            style={styles.fabSvg}
            viewBox="0 0 72 72">
            <Defs>
              <LinearGradient id="centerFabGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FF7900" />
                <Stop offset="100%" stopColor="#EF3B0C" />
              </LinearGradient>
            </Defs>
            <Circle
              cx="36"
              cy="36"
              r="35"
              fill="none"
              stroke="#FDBA74"
              strokeWidth="2"
            />
            <Circle
              cx="36"
              cy="36"
              r="32"
              fill="url(#centerFabGradient)"
              stroke="#FFFFFF"
              strokeWidth="3.5"
            />
          </Svg>
          {/* Precision Symmetrical Plus Icon */}
          <View style={styles.plusContainer}>
            <View style={styles.plusHorizontal} />
            <View style={styles.plusVertical} />
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 99,
  },
  dockBar: {
    width: '100%',
    height: 82,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  centerWave: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 48,
  },
  tabsGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '100%',
  },
  tabButton: {
    flex: 1,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  activeTabContent: {
    backgroundColor: '#FFF1E6',
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    marginTop: 3,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  centerSlot: {
    width: 88,
    height: '100%',
  },
  floatingFabWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 88,
    height: 88,
    zIndex: 101,
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#FED7AA',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
  },
  fabButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  fabSvg: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  fabPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.92,
  },
  plusContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusHorizontal: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  plusVertical: {
    position: 'absolute',
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});
