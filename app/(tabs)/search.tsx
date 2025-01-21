import { useState } from 'react';
import { StyleSheet, TextInput, FlatList, Pressable } from 'react-native';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { useBible } from '../context/BibleContext';
import { useRouter } from 'expo-router';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { SearchResult } from '../types/bible';

export default function SearchScreen() {
  const router = useRouter();
  const { search } = useBible();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length >= 2) {
      const searchResults = await search(text);
      setResults(searchResults);
    } else {
      setResults([]);
    }
  };

  return (
    <Screen>
      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={handleSearch}
        placeholder="Search the Bible..."
        placeholderTextColor="#666"
      />
      <FlatList
        data={results}
        keyExtractor={(item) => `${item.book}-${item.chapter}-${item.verse}`}
        renderItem={({ item }) => (
          <Pressable
            style={styles.resultItem}
            onPress={() => {
              router.push({
                pathname: '/verse/[id]',
                params: { id: `${item.book} ${item.chapter}:${item.verse}` }
              });
            }}
          >
            <Text style={[styles.reference, { color: theme.primary }]}>
              {item.book} {item.chapter}:{item.verse}
            </Text>
            <Text style={styles.verseText}>{item.text}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchInput: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    fontSize: 16,
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reference: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  verseText: {
    fontSize: 14,
    color: '#333',
  },
}); 