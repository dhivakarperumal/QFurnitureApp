import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
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

const leftNavigationItems: ReadonlyArray<{ label: BottomBarItem }> = [
  { label: 'Home' },
  { label: 'Products' },
];

const rightNavigationItems: ReadonlyArray<{ label: BottomBarItem }> = [
  { label: 'Orders' },
  { label: 'More' },
];

/* -------------------------------------------------------------------------- */
/*                                ICON DESIGNS                                */
/* -------------------------------------------------------------------------- */

function HomeIcon({ color, active }: { color: string; active: boolean }) {
  return (
    <View style={iconStyles.container}>
      {/* Roof Apex with Eaves */}
      <View
        style={[
          iconStyles.roof,
          {
            borderColor: color,
          },
        ]}
      />
      {/* House Body */}
      <View
        style={[
          iconStyles.houseBody,
          {
            borderColor: color,
          },
        ]}>
        {/* Doorway */}
        <View
          style={[
            iconStyles.houseDoor,
            {
              backgroundColor: active ? color : 'transparent',
              borderColor: color,
              borderWidth: active ? 0 : 1.2,
            },
          ]}
        />
      </View>
    </View>
  );
}

function ProductsIcon({ color, active }: { color: string; active: boolean }) {
  return (
    <View style={iconStyles.container}>
      {/* 2x2 Catalog Grid */}
      <View style={iconStyles.gridRow}>
        <View
          style={[
            iconStyles.gridTile,
            {
              backgroundColor: active ? color : 'transparent',
              borderColor: color,
              borderWidth: active ? 0 : 1.8,
            },
          ]}
        />
        <View
          style={[
            iconStyles.gridTile,
            {
              borderColor: color,
              borderWidth: 1.8,
            },
          ]}
        />
      </View>
      <View style={iconStyles.gridRow}>
        <View
          style={[
            iconStyles.gridTile,
            {
              borderColor: color,
              borderWidth: 1.8,
            },
          ]}
        />
        <View
          style={[
            iconStyles.gridTile,
            {
              backgroundColor: active ? color : 'transparent',
              borderColor: color,
              borderWidth: active ? 0 : 1.8,
              opacity: active ? 0.55 : 1,
            },
          ]}
        />
      </View>
    </View>
  );
}

function OrdersIcon({ color, active }: { color: string; active: boolean }) {
  return (
    <View style={iconStyles.container}>
      {/* Shopping / Order Bag Handle */}
      <View
        style={[
          iconStyles.bagHandle,
          {
            borderColor: color,
          },
        ]}
      />
      {/* Bag Body */}
      <View
        style={[
          iconStyles.bagBody,
          {
            borderColor: color,
            backgroundColor: active ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
          },
        ]}>
        {/* Receipt / Order Line */}
        <View
          style={[
            iconStyles.bagLine,
            {
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

function MoreIcon({ color, active }: { color: string; active: boolean }) {
  return (
    <View style={iconStyles.container}>
      {/* Capsule Frame with 3 Dots */}
      <View
        style={[
          iconStyles.moreCapsule,
          {
            borderColor: color,
            backgroundColor: active ? 'rgba(249, 115, 22, 0.12)' : 'transparent',
          },
        ]}>
        <View style={[iconStyles.moreDot, { backgroundColor: color }]} />
        <View style={[iconStyles.moreDot, { backgroundColor: color }]} />
        <View style={[iconStyles.moreDot, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function NavigationIcon({
  label,
  active,
}: {
  label: BottomBarItem;
  active: boolean;
}) {
  const color = active ? colors.primary : '#9CA3AF';

  switch (label) {
    case 'Home':
      return <HomeIcon color={color} active={active} />;
    case 'Products':
      return <ProductsIcon color={color} active={active} />;
    case 'Orders':
      return <OrdersIcon color={color} active={active} />;
    case 'More':
      return <MoreIcon color={color} active={active} />;
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

  // Pulse Animation for the Center Button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.28,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.45,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim, pulseOpacity]);

  const renderTab = ({ label }: { label: BottomBarItem }) => {
    const isActive = activeItem === label;
    const color = isActive ? colors.primary : '#9CA3AF';

    return (
      <Pressable
        key={label}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={`${label} Tab`}
        onPress={() => onItemPress?.(label)}
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
            <NavigationIcon label={label} active={isActive} />

            {/* Optional Notification Badge (e.g. for Orders) */}
            {label === 'Orders' && badgeCount > 0 && (
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

        {/* Micro Indicator Dot */}
        {isActive && <View style={styles.activeDot} />}
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
        {/* Left Tabs: Home, Products */}
        <View style={styles.tabsGroup}>
          {leftNavigationItems.map(renderTab)}
        </View>

        {/* Center Slot Spacer (reserves width and displays aligned Add label) */}
        <View style={styles.centerSlot}>
          <Text style={styles.fabLabel}>Add</Text>
        </View>

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
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseOpacity,
            },
          ]}
        />

        {/* Main Floating Action Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add Product or Order"
          onPress={onAddPress}
          style={({ pressed }) => [
            styles.fabButton,
            pressed && styles.fabPressed,
          ]}>
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
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    zIndex: 99,
  },
  dockBar: {
    width: '100%',
    height: 68,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  activeTabContent: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    marginTop: 3,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
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
    width: 68,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  floatingFabWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
    zIndex: 101,
  },
  pulseRing: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
  },
  fabButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  fabPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.92,
  },
  plusContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusHorizontal: {
    width: 18,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  plusVertical: {
    position: 'absolute',
    width: 3,
    height: 18,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: colors.primary,
  },
});

const iconStyles = StyleSheet.create({
  container: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Home
  roof: {
    position: 'absolute',
    top: 2,
    width: 13,
    height: 13,
    transform: [{ rotate: '45deg' }],
    borderLeftWidth: 2.2,
    borderTopWidth: 2.2,
    borderRadius: 1.5,
  },
  houseBody: {
    position: 'absolute',
    bottom: 2.5,
    width: 15,
    height: 11,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  houseDoor: {
    width: 4.5,
    height: 5.5,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  // Products (2x2 Grid)
  gridRow: {
    flexDirection: 'row',
    marginBottom: 2.5,
  },
  gridTile: {
    width: 8,
    height: 8,
    borderRadius: 2.5,
    marginRight: 2.5,
  },
  // Orders (Shopping / Order Bag)
  bagHandle: {
    width: 9,
    height: 5.5,
    borderTopLeftRadius: 4.5,
    borderTopRightRadius: 4.5,
    borderWidth: 2,
    borderBottomWidth: 0,
    marginBottom: -1,
  },
  bagBody: {
    width: 18,
    height: 13,
    borderRadius: 3.5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagLine: {
    width: 7,
    height: 2,
    borderRadius: 1,
  },
  // More (Capsule + 3 Dots)
  moreCapsule: {
    width: 22,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 1.2,
  },
});
