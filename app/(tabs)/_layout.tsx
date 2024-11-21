import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarStyle: { 
        backgroundColor: theme.background,
        borderTopWidth: 1,
        borderTopColor: theme.verseBorder,
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      tabBarActiveTintColor: theme.primary,
      tabBarInactiveTintColor: theme.tabIconDefault,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bible',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI Chat',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="comments" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
