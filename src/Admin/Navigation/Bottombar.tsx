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
import { Home, Menu, Package, ShoppingBag } from 'lucide-react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Image,
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
  visible?: boolean;
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

function TabIcon({
  destination,
  active,
}: {
  destination: BottomBarItem;
  active: boolean;
}) {
  const iconProps = {
    size: 25,
    color: active ? '#FFFFFF' : '#F7F7F7',
    strokeWidth: 2.2,
  };

  switch (destination) {
    case 'Home':
      return <Home {...iconProps} />;
    case 'Products':
      return <Package {...iconProps} />;
    case 'Orders':
      return <ShoppingBag {...iconProps} />;
    case 'More':
      return <Menu {...iconProps} />;
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
  visible = true,
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
                color: isActive ? '#FFFFFF' : '#F7F7F7',
                fontWeight: isActive ? '700' : '500',
              },
            ]}>
            {label}
          </Text>

          {/* Clean Accent Dot Indicator */}
          <View
            style={[
              styles.activeDot,
              { backgroundColor: isActive ? '#FFFFFF' : 'transparent' },
            ]}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outerContainer,
        {
          opacity: visible ? 1 : 0,
          transform: [{ translateY: visible ? 0 : totalHeight }],
        },
        style,
      ]}
      className={className}>
      <View style={[styles.barContainer, { width: barWidth, height: totalHeight }]}>
        {/* Full-Width SVG Background, Center Wave Cutout & Orange Glow */}
        <Svg
          width={barWidth}
          height={totalHeight}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}>
          <Defs>
            <ClipPath id="bottomBarClip">
              <Path d={barPath} />
            </ClipPath>
          </Defs>

          {/* Bottom-bar artwork */}
          <Image
            href={require('../../Assert/images/topheader1.png')}
            x={0}
            y={0}
            width={barWidth}
            height={totalHeight}
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#bottomBarClip)"
          />

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
