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
  CheckCircle,
  Headphones,
  Home,
  LayoutGrid,
  ShieldCheck,
  Smile,
  Star,
  Store,
  Truck,
  Users,
  Wrench,
} from 'lucide-react-native';

// ─── local asset paths ────────────────────────────────────────────────────────
const heroImage = require('../Assert/images/Cozy Mustard Armchair Living Room.png');
const ctaBgImage = require('../User/assets/shopbyroom-bedroom.png');
const livingRoomImage = require('../User/assets/shopbyroom-living.png');
const bedroomImage = require('../User/assets/shopbyroom-bedroom.png');
const diningRoomImage = require('../User/assets/shopbyroom-dining.png');

// ─── Stat item in the top row ─────────────────────────────────────────────────
function JourneyStat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center px-1">
      <View className="mb-1 h-[36px] w-[36px] items-center justify-center rounded-full bg-[#FFF0E1]">
        <Icon size={18} color="#F97316" strokeWidth={1.8} />
      </View>
      <Text className="text-[13px] font-black text-[#F97316]">{value}</Text>
      <Text className="text-center text-[10px] leading-[13px] text-[#8B735E]">{label}</Text>
    </View>
  );
}

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

// ─── Room card ────────────────────────────────────────────────────────────────
function RoomCard({
  image,
  label,
  onPress,
}: {
  image: ReturnType<typeof require>;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mr-3 overflow-hidden rounded-[16px]"
      style={{ width: 120 }}>
      <Image
        source={image}
        style={{ width: 120, height: 120 }}
        resizeMode="cover"
      />
      <View className="absolute inset-0 justify-end bg-black/30 p-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] font-bold text-white">{label}</Text>
          <View className="h-[18px] w-[18px] items-center justify-center rounded-full bg-white/90">
            <ArrowRight size={10} color="#F97316" strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main About Us component ─────────────────────────────────────────────────
export default function AboutUs({
  onExplorePress,
}: {
  onExplorePress?: () => void;
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

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <View className="mx-4 mb-5 flex-row rounded-[18px] border border-[#F0E7DE] bg-white px-2 py-4">
        <JourneyStat icon={Home} value="2018" label={`Established\nwith a vision`} />
        <JourneyStat icon={LayoutGrid} value="269" label={`Designs to\nchoose from`} />
        <JourneyStat icon={Users} value="3823" label={`Happy\ncustomers`} />
        <JourneyStat icon={CheckCircle} value="3834" label={`Projects\ncompleted`} />
        <JourneyStat icon={Star} value="Today" label={`Creating\nbetter homes`} />
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
      <View className="mt-6 px-5">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[18px] font-black text-[#351D0E]">
            Shop by <Text className="text-[#F97316]">Room</Text>
          </Text>
          <Pressable onPress={onExplorePress} className="flex-row items-center">
            <Text className="text-[12px] font-semibold text-[#F97316]">
              Explore All Rooms
            </Text>
            <ArrowRight size={12} color="#F97316" strokeWidth={2.5} style={{ marginLeft: 3 }} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <RoomCard image={livingRoomImage} label="Living Room" onPress={onExplorePress} />
          <RoomCard image={bedroomImage} label="Bedroom" onPress={onExplorePress} />
          <RoomCard image={diningRoomImage} label="Dining Room" onPress={onExplorePress} />
        </ScrollView>
      </View>

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
