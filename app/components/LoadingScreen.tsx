import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from './Text';
import Colors from '../constants/Colors';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.light.primary} />
      <Text style={styles.text}>Loading Bible...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.primary,
  },
}); 