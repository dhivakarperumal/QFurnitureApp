import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

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
  { destination: 'Orders', label: 'Orders' },
  { destination: 'More', label: 'More' },
];

/* -------------------------------------------------------------------------- */
/*                         CUSTOM VECTOR ICONS (1:1)                          */
/* -------------------------------------------------------------------------- */

function HomeIcon({ active }: { active: boolean }) {
  const color = active ? '#FF6A00' : '#404B5A';

  if (active) {
    return (
      <Svg width={27} height={27} viewBox="0 0 28 28" fill="none">
        <Path
          d="M12.4 3.2C13.3 2.3 14.7 2.3 15.6 3.2L24.2 11.2C25.1 12 25.4 13.2 24.8 14.2C24.3 15.1 23.2 15.6 22.1 15.6H22V23C22 24.1 21.1 25 20 25H16.5C15.7 25 15 24.3 15 23.5V17.5C15 16.9 14.6 16.5 14 16.5C13.4 16.5 13 16.9 13 17.5V23.5C13 24.3 12.3 25 11.5 25H8C6.9 25 6 24.1 6 23V15.6H5.9C4.8 15.6 3.7 15.1 3.2 14.2C2.6 13.2 2.9 12 3.8 11.2L12.4 3.2Z"
          fill={color}
        />
      </Svg>
    );
  }

  return (
    <Svg width={25} height={25} viewBox="0 0 28 28" fill="none">
      <Path
        d="M12.4 3.2C13.3 2.3 14.7 2.3 15.6 3.2L24.2 11.2C25.1 12 25.4 13.2 24.8 14.2C24.3 15.1 23.2 15.6 22.1 15.6H22V23C22 24.1 21.1 25 20 25H16.5C15.7 25 15 24.3 15 23.5V17.5C15 16.9 14.6 16.5 14 16.5C13.4 16.5 13 16.9 13 17.5V23.5C13 24.3 12.3 25 11.5 25H8C6.9 25 6 24.1 6 23V15.6H5.9C4.8 15.6 3.7 15.1 3.2 14.2C2.6 13.2 2.9 12 3.8 11.2L12.4 3.2Z"
        stroke={color}
        strokeWidth={2.3}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProductsIcon({ active }: { active: boolean }) {
  const color = active ? '#FF6A00' : '#404B5A';

  return (
    <Svg width={25} height={25} viewBox="0 0 28 28" fill="none">
      <Path
        d="M8.2 6.7 14 3.4l5.8 3.3v6.8L14 17l-5.8-3.5V6.7Z"
        stroke={color}
        strokeWidth={2.1}
        strokeLinejoin="round"
      />
      <Path
        d="m8.2 6.7 5.8 3.5 5.8-3.5M14 10.2V17m-3.5-11.1 5.8 3.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="m2.8 19.1 2.9-1.7 4.2 7.1L7 26.2l-4.2-7.1Zm2.9-1.7 3.3-1.9a4 4 0 0 1 3-.3l2.2.7a3.6 3.6 0 0 0 2.7-.3l4.5-2.6a1.5 1.5 0 0 1 2 .5 1.5 1.5 0 0 1-.5 2l-5.6 3.3a5.5 5.5 0 0 1-4 .5l-3.6-1a3.1 3.1 0 0 0-2.2.3l-.9.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m4.7 4.4 1 .6m2-3.2.3 1.1m13.3 1.5-1 .6m-2-3.2-.3 1.1M3.3 10.1l1.1-.3m19.2.3-1.1-.3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function OrdersIcon({ active }: { active: boolean }) {
  const color = active ? '#FF6A00' : '#404B5A';

  return (
    <Svg width={25} height={25} viewBox="0 0 28 28" fill="none">
      {/* Clipboard Sheet */}
      <Rect
        x="5.5"
        y="5"
        width="17"
        height="19"
        rx="3"
        stroke={color}
        strokeWidth={2.3}
      />
      {/* Top Clip */}
      <Path
        d="M10 5V3.8C10 3.3 10.4 3 11 3H17C17.6 3 18 3.3 18 3.8V5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      {/* Order List Items */}
      <Path
        d="M9.5 10.5H18.5M9.5 14.5H18.5M9.5 18.5H15"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MoreIcon({ active }: { active: boolean }) {
  const color = active ? '#FF6A00' : '#404B5A';

  return (
    <Svg width={25} height={25} viewBox="0 0 28 28" fill="none">
      <Rect
        x="2"
        y="2"
        width="10"
        height="10"
        rx="2"
        stroke={color}
        strokeWidth={2.3}
      />
      <Rect
        x="16"
        y="2"
        width="10"
        height="10"
        rx="2"
        stroke={color}
        strokeWidth={2.3}
      />
      <Rect
        x="2"
        y="16"
        width="10"
        height="10"
        rx="2"
        stroke={color}
        strokeWidth={2.3}
      />
      <Rect
        x="17.5"
        y="17.5"
        width="7"
        height="7"
        rx="1.5"
        transform="rotate(45 21 21)"
        stroke={color}
        strokeWidth={2.3}
      />
    </Svg>
  );
}

function TabIcon({
  destination,
  active,
}: {
  destination: BottomBarItem;
  active: boolean;
}) {
  switch (destination) {
    case 'Home':
      return <HomeIcon active={active} />;
    case 'Products':
      return <ProductsIcon active={active} />;
    case 'Orders':
      return <OrdersIcon active={active} />;
    case 'More':
      return <MoreIcon active={active} />;
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
  const { width: windowWidth } = useWindowDimensions();
  const barWidth = windowWidth;

  const safeBottom = Math.max(insets.bottom, 8);
  const barHeight = 68;
  const totalHeight = barHeight + safeBottom;

  const cx = barWidth / 2;
  const scoopWidth = 60;
  const scoopDepth = 43;

  // Full-width flat white body path with center scoop cutout
  const barPath = `M 0 0
    H ${cx - scoopWidth}
    C ${cx - 36} 0, ${cx - 24} ${scoopDepth}, ${cx} ${scoopDepth}
    C ${cx + 24} ${scoopDepth}, ${cx + 36} 0, ${cx + scoopWidth} 0
    H ${barWidth}
    V ${totalHeight}
    H 0
    Z`;

  // Top orange contour line across the entire screen
  const contourPath = `M 0 0
    H ${cx - scoopWidth}
    C ${cx - 36} 0, ${cx - 24} ${scoopDepth}, ${cx} ${scoopDepth}
    C ${cx + 24} ${scoopDepth}, ${cx + 36} 0, ${cx + scoopWidth} 0
    H ${barWidth}`;

  const isTabActive = (dest: BottomBarItem) => {
    return activeItem === dest;
  };

  const renderTab = ({ destination, label }: NavigationItem) => {
    const isActive = isTabActive(destination);

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
        <View style={styles.tabContent}>
          <View style={styles.iconWrapper}>
            <TabIcon destination={destination} active={isActive} />

            {/* Notification Badge */}
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
                color: isActive ? '#FF6A00' : '#64748B',
                fontWeight: isActive ? '700' : '500',
              },
            ]}>
            {label}
          </Text>

          {/* Clean Accent Dot Indicator */}
          <View
            style={[
              styles.activeDot,
              { backgroundColor: isActive ? '#FF6A00' : 'transparent' },
            ]}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outerContainer, style]}
      className={className}>
      <View style={[styles.barContainer, { width: barWidth, height: totalHeight }]}>
        {/* Full-Width SVG Background, Center Wave Cutout & Orange Glow */}
        <Svg
          width={barWidth}
          height={totalHeight}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}>
          {/* Ambient Glow Paths */}
          <Path
            d={contourPath}
            stroke="#FF9533"
            strokeWidth={6}
            strokeOpacity={0.25}
            fill="none"
          />
          <Path
            d={contourPath}
            stroke="#FFB066"
            strokeWidth={3.5}
            strokeOpacity={0.35}
            fill="none"
          />

          {/* Solid White Body with Scoop Cutout */}
          <Path d={barPath} fill="#FFFFFF" />

          {/* Sharp Orange Contour Stroke */}
          <Path d={contourPath} stroke="#FF7A00" strokeWidth={2.4} fill="none" />
        </Svg>

        {/* Tab Items Row (positioned in the interactive barHeight zone, above safeBottom) */}
        <View style={[styles.tabsRow, { height: barHeight }]}>
          {/* Left Navigation: Home, Products */}
          <View style={styles.tabsGroup}>
            {leftNavigationItems.map(renderTab)}
          </View>

          {/* Center Gap for FAB */}
          <View style={styles.centerGap} pointerEvents="none" />

          {/* Right Navigation: Orders, More */}
          <View style={styles.tabsGroup}>
            {rightNavigationItems.map(renderTab)}
          </View>
        </View>

        {/* Center Floating Action Button (Locked to exact pixel center: cx - 33) */}
        <View
          pointerEvents="box-none"
          style={[styles.fabContainer, { left: cx - 33 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add Action"
            onPress={onAddPress}
            style={({ pressed }) => [
              styles.fabButton,
              pressed && styles.fabPressed,
            ]}>
            {/* Unified SVG: Gradient Circle and Centered White Plus in one canvas */}
            <Svg width={66} height={66} viewBox="0 0 66 66">
              <Defs>
                <LinearGradient
                  id="centerFabGrad"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%">
                  <Stop offset="0%" stopColor="#FFA233" />
                  <Stop offset="30%" stopColor="#FF7300" />
                  <Stop offset="100%" stopColor="#EE2E00" />
                </LinearGradient>
              </Defs>
              {/* Outer Glow Halo Ring */}
              <Circle
                cx="33"
                cy="33"
                r="32.5"
                stroke="#FFA74F"
                strokeWidth="1.5"
                opacity={0.4}
                fill="none"
              />
              {/* Main Gradient Circle with White Border */}
              <Circle
                cx="33"
                cy="33"
                r="30.5"
                fill="url(#centerFabGrad)"
                stroke="#FFFFFF"
                strokeWidth="3.5"
              />
              {/* Symmetrical White Plus Icon (Horizontal bar) */}
              <Rect
                x="21"
                y="30.8"
                width="24"
                height="4.4"
                rx="2.2"
                fill="#FFFFFF"
              />
              {/* Symmetrical White Plus Icon (Vertical bar) */}
              <Rect
                x="30.8"
                y="21"
                width="4.4"
                height="24"
                rx="2.2"
                fill="#FFFFFF"
              />
            </Svg>
          </Pressable>
        </View>
      </View>
    </View>
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
    zIndex: 100,
  },
  barContainer: {
    width: '100%',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  tabsRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    zIndex: 5,
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
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2.5,
  },
  iconWrapper: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    marginTop: 3,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  centerGap: {
    width: 72,
    height: '100%',
  },
  fabContainer: {
    position: 'absolute',
    top: -24,
    width: 66,
    height: 66,
    zIndex: 20,
  },
  fabButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.94,
  },
});
