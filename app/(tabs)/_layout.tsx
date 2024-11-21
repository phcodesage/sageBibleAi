import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';

export default function TabLayout() {
  useEffect(() => {
    // Hide the navigation bar
    NavigationBar.setVisibilityAsync('hidden');
    // Optional: Set behavior when swiping from bottom
    NavigationBar.setBehaviorAsync('overlay-swipe');
  }, []);

  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarStyle: { display: 'none' } // Hide the tab bar
    }}>
      <Tabs.Screen name="index" />
    </Tabs>
  );
}
