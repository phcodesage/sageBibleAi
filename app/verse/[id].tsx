import { StyleSheet } from 'react-native';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { useLocalSearchParams } from 'expo-router';
import { useBible } from '../context/BibleContext';
import { useEffect, useState } from 'react';

export default function VerseScreen() {
  const { id } = useLocalSearchParams();
  const { fetchVerseContent } = useBible();
  const [verse, setVerse] = useState<any>(null);

  useEffect(() => {
    const loadVerse = async () => {
      if (id) {
        const content = await fetchVerseContent(id as string);
        setVerse(content);
      }
    };
    loadVerse();
  }, [id]);

  if (!verse) return null;

  return (
    <Screen>
      <Text style={styles.reference}>
        {verse.book} {verse.chapter}:{verse.verse}
      </Text>
      <Text style={styles.text}>{verse.text}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  reference: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  text: {
    fontSize: 18,
    lineHeight: 24,
  },
}); 