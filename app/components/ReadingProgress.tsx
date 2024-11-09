import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import Colors from '../constants/Colors';

interface ReadingProgressProps {
  currentChapter: number;
  maxChapters: number;
  book: string;
}

export function ReadingProgress({ currentChapter, maxChapters, book }: ReadingProgressProps) {
  const progress = (currentChapter / maxChapters) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.text}>
        {book} {currentChapter}/{maxChapters}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: '#fff',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    marginBottom: 4,
  },
  progress: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  text: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
}); 