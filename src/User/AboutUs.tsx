import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  ArrowRight,
  Headphones,
  ShieldCheck,
  Smile,
  Star,
  Store,
  Truck,
  Users,
  Wrench,
} from 'lucide-react-native';
import ShopByRoom from './Home/ShopByRoom';

// ─── local asset paths ────────────────────────────────────────────────────────
const heroImage = require('../Assert/images/Cozy Mustard Armchair Living Room.png');
const ctaBgImage = require('../User/assets/shopbyroom-bedroom.png');

const journeyMilestones = [
  {
    period: '2018',
    title: 'A vision for better homes',
    description:
      'Q Living began with a simple vision: make homes more comfortable and beautiful.',
  },
  {
    period: 'Growing together',
    title: 'Furniture for everyday living',
    description:
      'We bring together thoughtful design, lasting quality, and affordability.',
  },
  {
    period: 'Today',
    title: 'Creating spaces that inspire',
    description:
      'Our journey continues as we help make every house feel like home.',
  },
] as const;

// ─── Metric card in 2×2 grid ──────────────────────────────────────────────────
function MetricCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 flex-row items-center rounded-[16px] border border-[#F0E7DE] bg-white p-4 m-1">
      <View className="mr-3 h-[40px] w-[40px] items-center justify-center rounded-full bg-[#FFF0E1]">
        <Icon size={20} color="#F97316" strokeWidth={1.8} />
      </View>
      <View>
        <Text className="text-[16px] font-black text-[#351D0E]">{value}</Text>
        <Text className="text-[11px] text-[#8B735E]">{label}</Text>
      </View>
    </View>
  );
}

// ─── Why-choose feature card ──────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-1 m-1 rounded-[16px] border border-[#F0E7DE] bg-white p-4">
      <View className="mb-3 h-[40px] w-[40px] items-center justify-center rounded-full bg-[#FFF0E1]">
        <Icon size={20} color="#F97316" strokeWidth={1.8} />
      </View>
      <Text className="mb-1 text-[14px] font-black text-[#351D0E]">{title}</Text>
      <Text className="text-[12px] leading-[17px] text-[#8B735E]">{description}</Text>
    </View>
  );
}

// ─── Main About Us component ─────────────────────────────────────────────────
export default function AboutUs({
  onExplorePress,
  onRoomPress,
  refreshKey = 0,
}: {
  onExplorePress?: () => void;
  onRoomPress: (roomSlug: string) => void;
  refreshKey?: number;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
      className="flex-1 bg-[#FCFAF7]">

      {/* ── OUR JOURNEY section ─────────────────────────────────────────── */}
      <View className="px-5 pt-5 pb-4">
        <Text className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[#B07040]">
          Our Journey
        </Text>
        <Text className="text-[26px] font-black leading-[32px] text-[#351D0E]">
          The Q Living{'\n'}
          <Text className="text-[#F97316]">Furniture</Text>
          {'\n'}Journey
        </Text>
        {/* orange underline */}
        <View className="mt-2 h-[3px] w-[44px] rounded-full bg-[#F97316]" />
      </View>

      {/* ── Journey timeline ────────────────────────────────────────────── */}
      <View className="relative mx-4 mb-5 rounded-[18px] border border-[#F0E7DE] bg-white p-4">
        <View className="absolute bottom-7 left-[22px] top-7 w-[2px] bg-[#F0E7DE]" />
        {journeyMilestones.map((milestone, index) => (
          <View
            key={milestone.period}
            className={`flex-row ${index < journeyMilestones.length - 1 ? 'mb-5' : ''}`}>
            <View className="z-10 mr-3 mt-1 h-[14px] w-[14px] items-center justify-center rounded-full bg-[#FFF0E1]">
              <View className="h-[7px] w-[7px] rounded-full bg-[#F97316]" />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-[11px] font-black uppercase tracking-wider text-[#F97316]">
                {milestone.period}
              </Text>
              <Text className="text-[14px] font-black text-[#351D0E]">
                {milestone.title}
              </Text>
              <Text className="mt-1 text-[12px] leading-[17px] text-[#8B735E]">
                {milestone.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Hero image card ─────────────────────────────────────────────── */}
      <View className="mx-4 mb-6 overflow-hidden rounded-[20px]">
        <Image
          source={heroImage}
          style={{ width: '100%', height: 220 }}
          resizeMode="cover"
        />
        {/* bottom-left badge */}
        <View className="absolute bottom-4 left-4 rounded-[10px] bg-white/90 px-3 py-2">
          <Text className="text-[9px] font-semibold uppercase tracking-wider text-[#8B735E]">
            Best In Home
          </Text>
          <Text className="text-[12px] font-black text-[#351D0E]">
            Comfort • Style • Personal
          </Text>
        </View>
        {/* orange FAB */}
        <View className="absolute bottom-4 right-4 h-[44px] w-[44px] items-center justify-center rounded-full bg-[#F97316] shadow-md">
          <Store size={22} color="white" strokeWidth={1.8} />
        </View>
      </View>

      {/* ── Our Story ───────────────────────────────────────────────────── */}
      <View className="px-5 pb-2">
        <Text className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[#B07040]">
          A Little About Us
        </Text>
        <Text className="text-[26px] font-black text-[#351D0E]">
          Our <Text className="text-[#F97316]">Story</Text>
        </Text>
        <View className="mt-2 mb-4 h-[3px] w-[44px] rounded-full bg-[#F97316]" />

        <Text className="mb-3 text-[13px] leading-[20px] text-[#634D3B]">
          We believe a home should feel comfortable, look beautiful, and most
          importantly, feel like you. That's why we bring together the best in
          design, quality, and affordability.
        </Text>
        <Text className="mb-4 text-[13px] leading-[20px] text-[#634D3B]">
          From a humble beginning to a trusted name in home furnishings, our
          journey has been about creating spaces that inspire and bring joy to
          everyday life.
        </Text>

        <Pressable onPress={onExplorePress} className="flex-row items-center">
          <Text className="text-[13px] font-bold text-[#F97316]">
            Our story continues
          </Text>
          <ArrowRight size={14} color="#F97316" strokeWidth={2.5} style={{ marginLeft: 4 }} />
        </Pressable>
      </View>

      {/* ── Metrics 2×2 grid ────────────────────────────────────────────── */}
      <View className="mx-3 mt-5">
        <View className="flex-row">
          <MetricCard icon={Users} value="10,000+" label="Happy Homes" />
          <MetricCard icon={ShieldCheck} value="500+" label="Furniture Designs" />
        </View>
        <View className="flex-row">
          <MetricCard icon={Star} value="5+" label="Years of Trust" />
          <MetricCard icon={Smile} value="25,000+" label="Social Followers" />
        </View>
      </View>

      {/* ── Shop by Room ────────────────────────────────────────────────── */}
      <ShopByRoom refreshKey={refreshKey} onRoomPress={onRoomPress} />

      {/* ── Why Choose Q Living ─────────────────────────────────────────── */}
      <View className="mt-6 px-5">
        <Text className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[#B07040]">
          The Q Living Difference
        </Text>
        <Text className="text-[22px] font-black leading-[28px] text-[#351D0E]">
          Why Choose{' '}
          <Text className="text-[#F97316]">Q Living{'\n'}Furniture?</Text>
        </Text>
        <View className="mt-2 mb-3 h-[3px] w-[44px] rounded-full bg-[#F97316]" />
        <Text className="mb-4 text-[13px] leading-[19px] text-[#634D3B]">
          A thoughtful mix of comfort, practical design, and helpful service
          for the spaces you live in.
        </Text>

        <View className="flex-row">
          <FeatureCard
            icon={ShieldCheck}
            title="Thoughtful quality"
            description="Furniture selected for superior comfort, lasting style, and dependable use."
          />
          <FeatureCard
            icon={Wrench}
            title="Made for your space"
            description="Find practical pieces for the rooms and routines that make a home yours."
          />
        </View>
        <View className="flex-row">
          <FeatureCard
            icon={Truck}
            title="A smoother delivery"
            description="Helpful delivery support keeps your furniture journey simple from start to finish."
          />
          <FeatureCard
            icon={Headphones}
            title="Here to help"
            description="Our team is ready to help you choose pieces that feel right for your home."
          />
        </View>
      </View>

      {/* ── CTA Banner ──────────────────────────────────────────────────── */}
      <View className="mx-4 mt-6 overflow-hidden rounded-[20px]">
        <Image
          source={ctaBgImage}
          style={{ width: '100%', height: 190 }}
          resizeMode="cover"
        />
        <View className="absolute inset-0 justify-center bg-[#C2440A]/75 px-5">
          <Text className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#FFD6AD]">
            Make Room For What Matters
          </Text>
          <Text className="mb-1 text-[22px] font-black leading-[26px] text-white">
            Let's create your{'\n'}
            <Text className="text-[#FFB347]">dream space.</Text>
          </Text>
          <Text className="mb-4 text-[12px] leading-[17px] text-[#FFE8D4]">
            Explore furniture for the moments and people{'\n'}that make a house feel like home.
          </Text>
          <Pressable
            onPress={onExplorePress}
            className="flex-row self-start items-center rounded-full bg-[#F97316] px-5 py-[10px]">
            <Text className="text-[13px] font-bold text-white">Shop now</Text>
            <ArrowRight size={13} color="white" strokeWidth={2.5} style={{ marginLeft: 5 }} />
          </Pressable>
        </View>
      </View>

    </ScrollView>
  );
}
