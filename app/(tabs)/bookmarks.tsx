import { StyleSheet, FlatList, Pressable } from 'react-native';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { useBible } from '../context/BibleContext';
import { useRouter } from 'expo-router';
import Colors from '../constants/Colors';
import { useState, useEffect } from 'react';

export default function BookmarksScreen() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  return (
    <Screen>
      <FlatList
        data={bookmarks}
        keyExtractor={(item) => `${item.id}`}
        renderItem={({ item }) => (
          <Pressable
            style={styles.bookmarkItem}
            onPress={() => {
              router.push({
                pathname: '/verse/[id]',
                params: { id: item.verse_id }
              });
            }}
          >
            <Text style={styles.reference}>
              {item.book} {item.chapter}:{item.verse}
            </Text>
            {item.note && <Text style={styles.note}>{item.note}</Text>}
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
  bookmarkItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reference: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  note: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
}); 