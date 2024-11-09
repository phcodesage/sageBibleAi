import { View, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

interface ScreenProps {
  children: React.ReactNode;
  style?: any;
}

export function Screen({ children, style }: ScreenProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView 
      style={[
        styles.safe, 
        { backgroundColor: theme.background },
        style
      ]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.container, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
}); 