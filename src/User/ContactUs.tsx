import React, { useState } from 'react';
import {
  Image,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Headphones,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Send,
  X,
} from 'lucide-react-native';

// ─── hero image ───────────────────────────────────────────────────────────────
const heroImage = require('../Assert/images/Cozy Mustard Armchair Living Room.png');

// ─── constants ────────────────────────────────────────────────────────────────
const PHONE   = '+91 98765 43210';
const EMAIL   = 'support@qliving.com';
const ADDRESS = '123, 4th Avenue, Chennai – 600010, Tamil Nadu';
const MAPS_URL = 'https://maps.google.com/?q=T+Nagar,Chennai,Tamil+Nadu';

const SUBJECTS = [
  'Product Inquiry',
  'Order Status',
  'Delivery Issue',
  'Return & Refund',
  'Custom Furniture',
  'Other',
];

const FAQS = [
  {
    q: 'How long does delivery take?',
    a: 'Standard delivery takes 5–10 business days depending on your location. We offer express delivery in select cities.',
  },
  {
    q: 'Can I get a custom size or design for my furniture?',
    a: 'Yes! We offer custom furniture tailored to your space. Contact us with your dimensions and design preferences for a quote.',
  },
  {
    q: 'How do I take care of my furniture to make it last longer?',
    a: 'Clean regularly with a dry cloth, avoid direct sunlight, and use coasters. For wood furniture, apply furniture polish every few months.',
  },
  {
    q: 'What is your return and refund policy?',
    a: 'We accept returns within 7 days of delivery for manufacturing defects. Contact our support team to initiate a return.',
  },
  {
    q: 'Do you offer installation services?',
    a: 'Yes, we provide free installation for most furniture items. Our team will schedule a visit after delivery.',
  },
];

// ─── Contact card ─────────────────────────────────────────────────────────────
function ContactCard({
  icon: Icon,
  title,
  line1,
  line2,
  onPress,
}: {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  title: string;
  line1: string;
  line2?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 m-1 flex-row items-start rounded-[16px] border border-[#F0E7DE] bg-white p-4">
      <View className="mr-3 mt-[2px] h-[36px] w-[36px] items-center justify-center rounded-full bg-[#FFF0E1]">
        <Icon size={18} color="#F97316" strokeWidth={1.8} />
      </View>
      <View className="flex-1">
        <Text className="text-[13px] font-black text-[#351D0E]">{title}</Text>
        <Text className="mt-[3px] text-[11px] leading-[15px] text-[#8B735E]">{line1}</Text>
        {line2 ? (
          <Text className="text-[11px] leading-[15px] text-[#8B735E]">{line2}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── FAQ accordion item ───────────────────────────────────────────────────────
function FaqItem({
  icon: Icon,
  question,
  answer,
}: {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen(v => !v)}
      className="mb-3 overflow-hidden rounded-[16px] border border-[#F0E7DE] bg-white">
      <View className="flex-row items-center px-4 py-4">
        <View className="mr-3 h-[34px] w-[34px] items-center justify-center rounded-full bg-[#FFF0E1]">
          <Icon size={16} color="#F97316" strokeWidth={1.8} />
        </View>
        <Text className="flex-1 text-[13px] font-semibold text-[#351D0E]">
          {question}
        </Text>
        {open ? (
          <ChevronUp size={18} color="#F97316" />
        ) : (
          <ChevronDown size={18} color="#C09A7E" />
        )}
      </View>
      {open ? (
        <View className="border-t border-[#F7EDE4] px-4 pb-4 pt-3">
          <Text className="text-[12px] leading-[18px] text-[#634D3B]">{answer}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ─── Subject picker modal ─────────────────────────────────────────────────────
function SubjectPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        className="h-[46px] flex-row items-center justify-between rounded-[12px] border border-[#E8D5C2] bg-white px-4">
        <Text
          className={`text-[13px] ${value ? 'text-[#351D0E]' : 'text-[#C09A7E]'}`}>
          {value || 'Select a subject'}
        </Text>
        <ChevronDown size={16} color="#C09A7E" />
      </Pressable>
      <Modal visible={visible} transparent animationType="fade">
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setVisible(false)}>
          <View className="rounded-t-[24px] bg-white px-4 pb-8 pt-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[16px] font-black text-[#351D0E]">
                Select a Subject
              </Text>
              <Pressable onPress={() => setVisible(false)}>
                <X size={20} color="#8B735E" />
              </Pressable>
            </View>
            {SUBJECTS.map(subject => (
              <Pressable
                key={subject}
                onPress={() => {
                  onSelect(subject);
                  setVisible(false);
                }}
                className={`mb-2 rounded-[12px] border px-4 py-3 ${
                  value === subject
                    ? 'border-[#F97316] bg-[#FFF0E1]'
                    : 'border-[#F0E7DE] bg-white'
                }`}>
                <Text
                  className={`text-[13px] font-semibold ${
                    value === subject ? 'text-[#F97316]' : 'text-[#634D3B]'
                  }`}>
                  {subject}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Success toast ────────────────────────────────────────────────────────────
function SuccessModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/45 px-6">
        <View className="w-full rounded-[24px] border border-[#F6D4B2] bg-[#FFFCF8] p-6 items-center">
          <View className="mb-4 h-[64px] w-[64px] items-center justify-center rounded-full bg-[#FFF0E1]">
            <Send size={30} color="#F97316" strokeWidth={1.8} />
          </View>
          <Text className="mb-2 text-[20px] font-black text-[#351D0E]">
            Message Sent!
          </Text>
          <Text className="mb-6 text-center text-[13px] leading-[20px] text-[#634D3B]">
            Thank you for reaching out. Our team will get back to you within 24 hours.
          </Text>
          <Pressable
            onPress={onClose}
            className="w-full h-[48px] items-center justify-center rounded-[14px] bg-[#F97316]">
            <Text className="text-[14px] font-bold text-white">Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Contact Us component ────────────────────────────────────────────────
export default function ContactUs() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())    e.name    = 'Name is required';
    if (!email.trim())   e.email   = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!subject)        e.subject = 'Please select a subject';
    if (!message.trim()) e.message = 'Message cannot be empty';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = () => {
    if (!validate()) return;
    setSending(true);
    // Simulate API call
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 1200);
  };

  const handleClose = () => {
    setSent(false);
    setName('');
    setEmail('');
    setPhone('');
    setSubject('');
    setMessage('');
    setErrors({});
  };

  const faqIcons = [Phone, Mail, MapPin, Headphones, Navigation];

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
          className="flex-1 bg-[#FCFAF7]">

          {/* ── Hero Banner ────────────────────────────────────────────── */}
          <View className="mx-4 mt-4 mb-5 overflow-hidden rounded-[20px] bg-[#FFF5EC]">
            <View className="flex-row">
              {/* left text */}
              <View className="flex-1 justify-center px-5 py-6">
                <Text className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#B07040]">
                  Get In Touch
                </Text>
                <Text className="text-[22px] font-black leading-[26px] text-[#351D0E]">
                  We're Here to{'\n'}
                  <Text className="text-[#F97316]">Help You</Text>
                </Text>
                <View className="mt-2 mb-3 h-[3px] w-[36px] rounded-full bg-[#F97316]" />
                <Text className="text-[11px] leading-[16px] text-[#8B735E]">
                  Have a question or need assistance?{'\n'}We'd love to hear from you.
                </Text>
              </View>
              {/* right image */}
              <Image
                source={heroImage}
                style={{ width: 140, height: 160 }}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* ── Get In Touch cards ──────────────────────────────────────── */}
          <View className="px-4 mb-6">
            <Text className="text-[20px] font-black text-[#351D0E]">
              Get In Touch
            </Text>
            <View className="mt-2 mb-4 h-[3px] w-[44px] rounded-full bg-[#F97316]" />

            <View className="flex-row">
              <ContactCard
                icon={Phone}
                title="Call Us"
                line1={PHONE}
                line2="Mon – Sat, 9AM – 7PM"
                onPress={() => Linking.openURL(`tel:${PHONE.replace(/\s/g, '')}`)}
              />
              <ContactCard
                icon={Mail}
                title="Email Us"
                line1={EMAIL}
                line2="We'll reply within 24 hours"
                onPress={() => Linking.openURL(`mailto:${EMAIL}`)}
              />
            </View>
            <View className="flex-row">
              <ContactCard
                icon={MapPin}
                title="Visit Our Store"
                line1={ADDRESS}
                onPress={() => Linking.openURL(MAPS_URL)}
              />
              <ContactCard
                icon={Headphones}
                title="Customer Support"
                line1={PHONE}
                line2="Quick assistance for your queries"
                onPress={() => Linking.openURL(`tel:${PHONE.replace(/\s/g, '')}`)}
              />
            </View>
          </View>

          {/* ── Contact form ────────────────────────────────────────────── */}
          <View className="px-4 mb-6">
            <Text className="text-[20px] font-black text-[#351D0E]">
              Send Us a{' '}
              <Text className="text-[#F97316]">Message</Text>
            </Text>
            <Text className="mt-1 mb-4 text-[12px] leading-[17px] text-[#8B735E]">
              Have a question? Fill out the form below and we'll get back to you shortly.
            </Text>

            {/* Row 1: Name + Email */}
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="mb-1 text-[12px] font-semibold text-[#634D3B]">
                  Your Name <Text className="text-[#F97316]">*</Text>
                </Text>
                <TextInput
                  value={name}
                  onChangeText={v => { setName(v); setErrors(e => ({ ...e, name: '' })); }}
                  placeholder="Enter your name"
                  placeholderTextColor="#C09A7E"
                  className={`h-[46px] rounded-[12px] border bg-white px-4 text-[13px] text-[#351D0E] ${
                    errors.name ? 'border-red-400' : 'border-[#E8D5C2]'
                  }`}
                />
                {errors.name ? (
                  <Text className="mt-1 text-[10px] text-red-500">{errors.name}</Text>
                ) : null}
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-[12px] font-semibold text-[#634D3B]">
                  Email Address <Text className="text-[#F97316]">*</Text>
                </Text>
                <TextInput
                  value={email}
                  onChangeText={v => { setEmail(v); setErrors(e => ({ ...e, email: '' })); }}
                  placeholder="Enter your email"
                  placeholderTextColor="#C09A7E"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className={`h-[46px] rounded-[12px] border bg-white px-4 text-[13px] text-[#351D0E] ${
                    errors.email ? 'border-red-400' : 'border-[#E8D5C2]'
                  }`}
                />
                {errors.email ? (
                  <Text className="mt-1 text-[10px] text-red-500">{errors.email}</Text>
                ) : null}
              </View>
            </View>

            {/* Row 2: Phone + Subject */}
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="mb-1 text-[12px] font-semibold text-[#634D3B]">
                  Phone Number
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#C09A7E"
                  keyboardType="phone-pad"
                  className="h-[46px] rounded-[12px] border border-[#E8D5C2] bg-white px-4 text-[13px] text-[#351D0E]"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-[12px] font-semibold text-[#634D3B]">
                  Subject <Text className="text-[#F97316]">*</Text>
                </Text>
                <SubjectPicker value={subject} onSelect={v => { setSubject(v); setErrors(e => ({ ...e, subject: '' })); }} />
                {errors.subject ? (
                  <Text className="mt-1 text-[10px] text-red-500">{errors.subject}</Text>
                ) : null}
              </View>
            </View>

            {/* Message */}
            <View className="mb-4">
              <Text className="mb-1 text-[12px] font-semibold text-[#634D3B]">
                Your Message <Text className="text-[#F97316]">*</Text>
              </Text>
              <TextInput
                value={message}
                onChangeText={v => { setMessage(v); setErrors(e => ({ ...e, message: '' })); }}
                placeholder="Type your message here..."
                placeholderTextColor="#C09A7E"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                className={`rounded-[12px] border bg-white px-4 py-3 text-[13px] text-[#351D0E] ${
                  errors.message ? 'border-red-400' : 'border-[#E8D5C2]'
                }`}
                style={{ minHeight: 110 }}
              />
              {errors.message ? (
                <Text className="mt-1 text-[10px] text-red-500">{errors.message}</Text>
              ) : null}
            </View>

            {/* Send button */}
            <Pressable
              onPress={handleSend}
              disabled={sending}
              className={`h-[52px] flex-row items-center justify-center rounded-[16px] ${
                sending ? 'bg-[#F9A87A]' : 'bg-[#F97316]'
              }`}>
              <Send size={18} color="white" strokeWidth={2} style={{ marginRight: 8 }} />
              <Text className="text-[15px] font-bold text-white">
                {sending ? 'Sending…' : 'Send Message'}
              </Text>
            </Pressable>
          </View>

          {/* ── Map placeholder ─────────────────────────────────────────── */}
          <View className="mx-4 mb-6 overflow-hidden rounded-[20px] border border-[#F0E7DE]">
            {/* Styled map mockup */}
            <View
              className="bg-[#E8F4F8]"
              style={{ height: 180 }}>
              {/* Grid lines mimicking map tiles */}
              <View className="absolute inset-0 opacity-30">
                {[0, 1, 2, 3].map(i => (
                  <View
                    key={`h-${i}`}
                    className="absolute w-full border-t border-[#A0C4D8]"
                    style={{ top: `${i * 25 + 12}%` }}
                  />
                ))}
                {[0, 1, 2, 3, 4].map(i => (
                  <View
                    key={`v-${i}`}
                    className="absolute h-full border-l border-[#A0C4D8]"
                    style={{ left: `${i * 20 + 10}%` }}
                  />
                ))}
              </View>
              {/* Road lines */}
              <View className="absolute bg-[#C8DFE8]" style={{ top: '48%', left: 0, right: 0, height: 10 }} />
              <View className="absolute bg-[#C8DFE8]" style={{ top: 0, bottom: 0, left: '42%', width: 10 }} />
              <View className="absolute bg-[#D4E8C8]" style={{ top: '30%', left: 0, right: 0, height: 6 }} />
              <View className="absolute bg-[#D4E8C8]" style={{ top: '70%', left: 0, right: 0, height: 6 }} />

              {/* T. Nagar label */}
              <Text
                className="absolute text-[13px] font-bold text-[#5A8A9F]"
                style={{ top: '54%', left: '15%' }}>
                T. Nagar
              </Text>

              {/* Map pin */}
              <View className="absolute items-center" style={{ top: '28%', left: '55%' }}>
                <View className="h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F97316] shadow-md">
                  <MapPin size={18} color="white" strokeWidth={2} />
                </View>
                <View className="h-0 w-0" style={{
                  borderLeftWidth: 6,
                  borderRightWidth: 6,
                  borderTopWidth: 8,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: '#F97316',
                }} />
              </View>
            </View>

            {/* Store info overlay */}
            <Pressable
              onPress={() => Linking.openURL(MAPS_URL)}
              className="absolute top-3 left-3 flex-row items-center rounded-[14px] border border-[#F0E7DE] bg-white px-3 py-3 shadow-sm"
              style={{ maxWidth: 200 }}>
              <View className="mr-2 h-[30px] w-[30px] items-center justify-center rounded-full bg-[#FFF0E1]">
                <MapPin size={15} color="#F97316" strokeWidth={2} />
              </View>
              <View>
                <Text className="text-[11px] font-black text-[#351D0E]">Our Store Location</Text>
                <Text className="text-[9px] leading-[13px] text-[#8B735E]">{ADDRESS}</Text>
              </View>
            </Pressable>

            {/* Open in Maps button */}
            <Pressable
              onPress={() => Linking.openURL(MAPS_URL)}
              className="absolute bottom-3 right-3 flex-row items-center rounded-full bg-[#F97316] px-4 py-[7px]">
              <Navigation size={12} color="white" strokeWidth={2.5} style={{ marginRight: 4 }} />
              <Text className="text-[11px] font-bold text-white">Open Maps</Text>
            </Pressable>
          </View>

          {/* ── FAQ section ─────────────────────────────────────────────── */}
          <View className="px-4">
            <Text className="mb-1 text-[20px] font-black text-[#351D0E]">
              Frequently Asked{' '}
              <Text className="text-[#F97316]">Questions</Text>
            </Text>
            <View className="mt-2 mb-4 h-[3px] w-[44px] rounded-full bg-[#F97316]" />

            {FAQS.map((faq, index) => (
              <FaqItem
                key={index}
                icon={faqIcons[index % faqIcons.length]}
                question={faq.q}
                answer={faq.a}
              />
            ))}
          </View>

          {/* ── Bottom CTA strip ────────────────────────────────────────── */}
          <Pressable
            onPress={() => Linking.openURL(`tel:${PHONE.replace(/\s/g, '')}`)}
            className="mx-4 mt-2 flex-row items-center justify-between rounded-[18px] bg-[#F97316] px-5 py-4">
            <View>
              <Text className="text-[11px] font-semibold text-[#FFE4CC]">
                Still have questions?
              </Text>
              <Text className="text-[16px] font-black text-white">
                Call us directly
              </Text>
            </View>
            <View className="flex-row items-center">
              <Phone size={16} color="white" strokeWidth={2} style={{ marginRight: 6 }} />
              <Text className="text-[14px] font-bold text-white">{PHONE}</Text>
              <ArrowRight size={16} color="white" strokeWidth={2.5} style={{ marginLeft: 6 }} />
            </View>
          </Pressable>

        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Success modal */}
      <SuccessModal visible={sent} onClose={handleClose} />
    </>
  );
}
