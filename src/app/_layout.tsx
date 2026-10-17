import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useStore } from '@/store';

export default function RootLayout() {
  const reload = useStore((s) => s.reload);
  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
