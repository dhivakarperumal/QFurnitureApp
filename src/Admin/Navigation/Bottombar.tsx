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
  { destination: 'Orders', label: 'Reports' },
  { destination: 'More', label: 'Profile' },
];

/* -------------------------------------------------------------------------- */
/*                         CUSTOM VECTOR ICONS (1:1)                          */
/* -------------------------------------------------------------------------- */

function HomeIcon({ active }: { active: boolean }) {
  const color = active ? '#FF6A00' : '#404B5A';

  if (active) {
    return (
      <Svg width={25} height={25} viewBox="0 0 28 28" fill="none">
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
        d="M10 9.5V7C10 4.8 11.8 3 14 3C16.2 3 18 4.8 18 7V9.5"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Path
        d="M5.5 10.5C5.2 10.5 5 10.8 5.1 11.1L6.8 22.6C7 23.9 8.1 25 9.5 25H18.5C19.9 25 21 23.9 21.2 22.6L22.9 11.1C23 10.8 22.8 10.5 22.5 10.5H5.5Z"
        stroke={color}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ReportsIcon({ active }: { active: boolean }) {
  const color = active ? '#FF6A00' : '#404B5A';

  return (
    <Svg width={25} height={25} viewBox="0 0 28 28" fill="none">
      <Rect x="4" y="16" width="4.5" height="9" rx="1.5" fill={color} />
      <Rect x="11.5" y="11" width="4.5" height="14" rx="1.5" fill={color} />
      <Rect x="19" y="6" width="4.5" height="19" rx="1.5" fill={color} />
      <Path
        d="M5 14C8 12 13 8 22 3.5"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Path
        d="M17 3.5H22V8.5"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const color = active ? '#FF6A00' : '#404B5A';

  return (
    <Svg width={25} height={25} viewBox="0 0 28 28" fill="none">
      <Circle cx="14" cy="8" r="5" stroke={color} strokeWidth={2.4} />
      <Path
        d="M5 23.5C5 18.5 9 15.5 14 15.5C19 15.5 23 18.5 23 23.5"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
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
      return <ReportsIcon active={active} />;
    case 'More':
      return <ProfileIcon active={active} />;
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
  const scoopWidth = 52;
  const scoopDepth = 38;

  // Full-width flat white body path with center scoop cutout (no rounded outer corners)
  const barPath = `M 0 0
    H ${cx - scoopWidth}
    C ${cx - 28} 0, ${cx - 20} ${scoopDepth}, ${cx} ${scoopDepth}
    C ${cx + 20} ${scoopDepth}, ${cx + 28} 0, ${cx + scoopWidth} 0
    H ${barWidth}
    V ${totalHeight}
    H 0
    Z`;

  // Top orange contour line across the entire screen
  const contourPath = `M 0 0
    H ${cx - scoopWidth}
    C ${cx - 28} 0, ${cx - 20} ${scoopDepth}, ${cx} ${scoopDepth}
    C ${cx + 20} ${scoopDepth}, ${cx + 28} 0, ${cx + scoopWidth} 0
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
          pressed && { opacity: 0.7 },
        ]}>
        <View style={[styles.tabContent, isActive && styles.activeTabContent]}>
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
                color: isActive ? '#FF6A00' : '#404B5A',
                fontWeight: isActive ? '700' : '600',
              },
            ]}>
            {label}
          </Text>
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
            strokeOpacity={0.22}
            fill="none"
          />
          <Path
            d={contourPath}
            stroke="#FFB366"
            strokeWidth={3}
            strokeOpacity={0.35}
            fill="none"
          />

          {/* Solid White Body with Scoop Cutout */}
          <Path d={barPath} fill="#FFFFFF" />

          {/* Sharp Orange Contour Stroke */}
          <Path d={contourPath} stroke="#FF7A00" strokeWidth={2} fill="none" />
        </Svg>

        {/* Tab Items Row (positioned in the interactive barHeight zone, above safeBottom) */}
        <View style={[styles.tabsRow, { height: barHeight }]}>
          {/* Left Navigation: Home, Products */}
          <View style={styles.tabsGroup}>
            {leftNavigationItems.map(renderTab)}
          </View>

          {/* Center Gap for FAB */}
          <View style={styles.centerGap} pointerEvents="none" />

          {/* Right Navigation: Reports, Profile */}
          <View style={styles.tabsGroup}>
            {rightNavigationItems.map(renderTab)}
          </View>
        </View>

        {/* Center Floating Action Button (Elevated inside the scoop) */}
        <View pointerEvents="box-none" style={styles.fabContainer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add Action"
            onPress={onAddPress}
            style={({ pressed }) => [
              styles.fabButton,
              pressed && styles.fabPressed,
            ]}>
            <Svg
              width={66}
              height={66}
              viewBox="0 0 66 66"
              pointerEvents="none"
              style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient
                  id="centerFabGrad"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%">
                  <Stop offset="0%" stopColor="#FFA033" />
                  <Stop offset="25%" stopColor="#FF7A00" />
                  <Stop offset="100%" stopColor="#EE3505" />
                </LinearGradient>
              </Defs>
              <Circle
                cx="33"
                cy="33"
                r="31"
                fill="url(#centerFabGrad)"
                stroke="#FFFFFF"
                strokeWidth="3.5"
              />
            </Svg>

            {/* Symmetrical White Plus Icon */}
            <View style={styles.plusContainer}>
              <View style={styles.plusHorizontal} />
              <View style={styles.plusVertical} />
            </View>
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    minWidth: 64,
    overflow: 'hidden',
  },
  activeTabContent: {
    backgroundColor: '#FEEFE6',
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
    width: 66,
    height: '100%',
  },
  fabContainer: {
    position: 'absolute',
    top: -26,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  fabButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.94,
  },
  plusContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusHorizontal: {
    width: 24,
    height: 4.2,
    borderRadius: 2.1,
    backgroundColor: '#FFFFFF',
  },
  plusVertical: {
    position: 'absolute',
    width: 4.2,
    height: 24,
    borderRadius: 2.1,
    backgroundColor: '#FFFFFF',
  },
});
