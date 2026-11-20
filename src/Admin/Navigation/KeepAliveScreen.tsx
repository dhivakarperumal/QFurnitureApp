import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const hiddenScreenStyle = StyleSheet.create({
  hidden: { display: 'none' },
});

type KeepAliveScreenProps = {
  active: boolean;
  children: React.ReactNode;
};

export default function KeepAliveScreen({
  active,
  children,
}: KeepAliveScreenProps) {
  const [hasBeenActive, setHasBeenActive] = useState(active);

  useEffect(() => {
    if (active) setHasBeenActive(true);
  }, [active]);

  if (!hasBeenActive) return null;

  return (
    <View
      className="flex-1"
      pointerEvents={active ? 'auto' : 'none'}
      style={active ? undefined : hiddenScreenStyle.hidden}
    >
      {children}
    </View>
  );
}
