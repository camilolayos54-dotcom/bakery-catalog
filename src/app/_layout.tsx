import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { initVault } from '@/lib/vault/sync';
import { useStore } from '@/store';

export default function RootLayout() {
  const reload = useStore((s) => s.reload);
  useEffect(() => {
    // Never let a storage problem leave the app on a blank screen: show what we can, log the rest.
    reload()
      .catch((e) => console.warn('[app] no se pudo cargar el catálogo', e))
      .then(() => initVault())
      .catch((e) => console.warn('[app] carpeta Bakery', e));
  }, [reload]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      {/* El formulario de producto vive fuera de las pestañas: al cerrarlo no deja nada abierto en ninguna. */}
      <Stack.Screen
        name="product/[id]"
        options={{ headerShown: true, title: 'Producto', headerTintColor: '#8a4b14', headerBackTitle: 'Volver' }}
      />
    </Stack>
  );
}
