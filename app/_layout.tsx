import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { BibleProvider } from './context/BibleContext';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { LoadingScreen } from './components/LoadingScreen';
import { DownloadScreen } from './components/DownloadScreen';
import { DownloadManager } from './utils/downloadManager';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
  });
  const [isDownloaded, setIsDownloaded] = useState<boolean | null>(null);

  useEffect(() => {
    checkBibleData();
  }, []);

  async function checkBibleData() {
    const downloaded = await DownloadManager.checkIfBibleDownloaded();
    setIsDownloaded(downloaded);
  }

  if (!fontsLoaded || isDownloaded === null) {
    return <LoadingScreen />;
  }

  if (!isDownloaded) {
    return <DownloadScreen onComplete={() => setIsDownloaded(true)} />;
  }

  return (
    <BibleProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="verse/[id]" 
          options={{ headerShown: true, title: 'Verse' }} 
        />
      </Stack>
    </BibleProvider>
  );
}
