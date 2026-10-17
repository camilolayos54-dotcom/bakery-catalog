import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useStore } from '@/store';

export default function RootLayout() {
  const reload = useStore((s) => s.reload);
  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <Stack screenOptions={{ headerTintColor: '#8a4b14' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ title: 'Producto', presentation: 'modal' }} />
      <Stack.Screen name="bulk" options={{ title: 'Agregar varios', presentation: 'modal' }} />
      <Stack.Screen name="groups" options={{ title: 'Grupos' }} />
    </Stack>
  );
}
