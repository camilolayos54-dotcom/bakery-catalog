import { Stack } from 'expo-router';

export default function EditorLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: '#8a4b14' }}>
      <Stack.Screen name="index" options={{ title: 'Editor' }} />
      <Stack.Screen name="[id]" options={{ title: 'Producto' }} />
      <Stack.Screen name="bulk" options={{ title: 'Agregar varios' }} />
      <Stack.Screen name="groups" options={{ title: 'Grupos' }} />
    </Stack>
  );
}
