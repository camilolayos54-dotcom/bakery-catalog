import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';

import { useStore } from '@/store';

export default function TabsLayout() {
  const count = useStore((s) => Object.values(s.cart).reduce((a, b) => a + b, 0));

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerTintColor: '#8a4b14',
        tabBarActiveTintColor: '#b3541e',
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
        tabBarStyle: { height: 58, paddingBottom: 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Productos', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🥐</Text> }}
      />
      <Tabs.Screen
        name="sumas"
        options={{
          title: 'Sumas',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🧮</Text>,
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: '#b3541e' },
        }}
      />
      <Tabs.Screen
        name="editor"
        options={{ title: 'Editor', headerShown: false, tabBarIcon: () => <Text style={{ fontSize: 20 }}>✏️</Text> }}
      />
    </Tabs>
  );
}
