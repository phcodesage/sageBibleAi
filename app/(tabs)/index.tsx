import { StyleSheet, ScrollView, Pressable, View, Modal, FlatList, TextInput } from 'react-native';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { useBible } from '../context/BibleContext';
import { useState, useCallback, useEffect, useRef } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { bibleBooks } from '../constants/bible-books';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';

interface ChapterContent {
  chapter: number;
  verses: any[];
}

export default function BibleScreen() {
  const { currentBook, currentChapter, setCurrentBook, setCurrentChapter, fetchVerseContent } = useBible();
  const [chapters, setChapters] = useState<ChapterContent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalView, setModalView] = useState<'books' | 'chapters'>('books');
  const scrollViewRef = useRef<ScrollView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Move styles that depend on theme inside the component
  const dynamicStyles = StyleSheet.create({
    headerText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    chapterItemText: {
      fontSize: 16,
      color: theme.text,
    },
    modalSubtitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
      color: theme.primary,
    },
    bookItemText: {
      fontSize: 14,
      textAlign: 'center',
      color: theme.text,
    },
    searchResultVerse: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 4,
    },
    searchResultText: {
      fontSize: 16,
      color: theme.text,
    }
  });

  // Load multiple chapters at once
  const loadChapters = useCallback(async (book: string, startChapter: number) => {
    setIsLoading(true);
    try {
      // Load current chapter and next four chapters (2 before, current, 2 after)
      const chapterPromises = [-2, -1, 0, 1, 2].map(offset => 
        fetchVerseContent(`${book} ${startChapter + offset}`)
      );
      
      const results = await Promise.all(chapterPromises);
      const validResults = results
        .filter(result => result?.verses)
        .map((result, index) => ({
          chapter: startChapter + (index - 2), // Adjust for the offset
          verses: result.verses
        }));

      setChapters(prev => {
        // Remove duplicates and sort chapters
        const allChapters = [...prev, ...validResults];
        const uniqueChapters = allChapters.reduce((acc, current) => {
          const exists = acc.find(item => item.chapter === current.chapter);
          if (!exists && current.chapter > 0) { // Only include valid chapters
            acc.push(current);
          }
          return acc;
        }, [] as ChapterContent[]);

        return uniqueChapters.sort((a, b) => a.chapter - b.chapter);
      });
    } catch (error) {
      console.error('Error loading chapters:', error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadChapters(currentBook, currentChapter);
  }, [currentBook, currentChapter]);

  const handleScroll = ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 2000; // Increased from 1000 to load earlier
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;

    if (isCloseToBottom && !isLoading) {
      const lastChapter = chapters[chapters.length - 1]?.chapter || currentChapter;
      loadChapters(currentBook, lastChapter + 1);
    }

    const isCloseToTop = contentOffset.y <= paddingToBottom;
    if (isCloseToTop && !isLoading && currentChapter > 1) {
      const firstChapter = chapters[0]?.chapter || currentChapter;
      if (firstChapter > 1) {
        loadChapters(currentBook, Math.max(1, firstChapter - 3));
      }
    }
  };

  const handleBookSelect = (book: string) => {
    setCurrentBook(book);
    setCurrentChapter(1);
    setChapters([]);
    setModalView('chapters');
  };

  const handleChapterSelect = (chapter: number) => {
    setCurrentChapter(chapter);
    setChapters([]);
    setShowModal(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      // Search within current chapter
      const results = chapters.flatMap(chapter => 
        chapter.verses.filter(verse => 
          verse.text.toLowerCase().includes(text.toLowerCase())
        )
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleVersePress = (verseId: number) => {
    setSelectedVerses(prev => 
      prev.includes(verseId) 
        ? prev.filter(id => id !== verseId)
        : [...prev, verseId]
    );
  };

  const renderModalContent = () => {
    if (modalView === 'books') {
      const oldTestament = bibleBooks.slice(0, 39);
      const newTestament = bibleBooks.slice(39);

      return (
        <>
          <Text style={dynamicStyles.modalSubtitle}>Old Testament</Text>
          <FlatList
            data={oldTestament}
            numColumns={2}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.bookItem,
                  currentBook === item && styles.selectedBook
                ]}
                onPress={() => handleBookSelect(item)}
              >
                <Text style={[
                  dynamicStyles.bookItemText,
                  currentBook === item && styles.selectedBook
                ]}>
                  {item}
                </Text>
              </Pressable>
            )}
          />
          <Text style={[dynamicStyles.modalSubtitle, { marginTop: 16 }]}>New Testament</Text>
          <FlatList
            data={newTestament}
            numColumns={2}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.bookItem,
                  currentBook === item && styles.selectedBook
                ]}
                onPress={() => handleBookSelect(item)}
              >
                <Text style={[
                  dynamicStyles.bookItemText,
                  currentBook === item && styles.selectedBook
                ]}>
                  {item}
                </Text>
              </Pressable>
            )}
          />
        </>
      );
    }

    return (
      <FlatList
        data={Array.from({ length: 150 }, (_, i) => i + 1)}
        numColumns={5}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.chapterItem,
              currentChapter === item && styles.selectedChapter
            ]}
            onPress={() => handleChapterSelect(item)}
          >
            <Text style={[
              dynamicStyles.chapterItemText,
              currentChapter === item && styles.selectedChapter
            ]}>
              {item}
            </Text>
          </Pressable>
        )}
      />
    );
  };

  return (
    <Screen>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Pressable 
          style={styles.headerButton}
          onPress={() => {
            setShowModal(true);
            setModalView('books');
          }}
        >
          <Text style={dynamicStyles.headerText}>
            {currentBook} {currentChapter}
          </Text>
          <FontAwesome name="chevron-down" size={16} color={theme.text} />
        </Pressable>
        <Pressable 
          style={styles.searchButton}
          onPress={() => setShowSearch(true)}
        >
          <FontAwesome name="search" size={20} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={[styles.content, { backgroundColor: theme.background }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {chapters.map((chapter) => (
          <View key={chapter.chapter} style={[styles.chapterContainer, { backgroundColor: theme.background }]}>
            <Text variant="chapter" style={{ color: theme.text }}>
              Chapter {chapter.chapter}
            </Text>
            <View style={styles.versesContainer}>
              {chapter.verses.map((verse) => (
                <Pressable
                  key={`${chapter.chapter}-${verse.verse}`}
                  onPress={() => handleVersePress(verse.verse)}
                  style={styles.verseContainer}
                >
                  <Text variant="verseNumber" style={{ color: theme.verseNumber }}>
                    {verse.verse}
                  </Text>
                  <Text 
                    variant="verse"
                    style={[
                      styles.verseText,
                      { color: theme.text },
                      selectedVerses.includes(verse.verse) && {
                        backgroundColor: theme.verseHighlight
                      }
                    ]}
                  >
                    {verse.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={showSearch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearch(false)}
      >
        <View style={styles.searchModal}>
          <View style={styles.searchHeader}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search in current chapter..."
              autoFocus
            />
            <Pressable onPress={() => setShowSearch(false)}>
              <FontAwesome name="times" size={24} color={Colors.primary} />
            </Pressable>
          </View>
          {searchResults.length > 0 && (
            <Text style={styles.resultCount}>
              Found {searchResults.length} matches
            </Text>
          )}
          <ScrollView style={styles.searchResults}>
            {searchResults.map((verse, index) => (
              <Pressable
                key={index}
                style={styles.searchResult}
                onPress={() => {
                  setSelectedVerses([verse.verse]);
                  setShowSearch(false);
                  // Scroll to verse
                }}
              >
                <Text style={dynamicStyles.searchResultVerse}>
                  Verse {verse.verse}
                </Text>
                <Text style={dynamicStyles.searchResultText}>
                  {verse.text}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>
                {modalView === 'books' ? 'Select Book' : `Select Chapter (${currentBook})`}
              </Text>
              {modalView === 'chapters' && (
                <Pressable 
                  style={styles.backButton}
                  onPress={() => setModalView('books')}
                >
                  <FontAwesome name="arrow-left" size={20} color={Colors.primary} />
                </Pressable>
              )}
              <Pressable onPress={() => setShowModal(false)}>
                <FontAwesome name="times" size={24} color={Colors.primary} />
              </Pressable>
            </View>
            {renderModalContent()}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// Static styles that don't depend on theme
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    padding: 8,
  },
  versesContainer: {
    padding: 16,
  },
  verseContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  verseText: {
    flex: 1,
    fontSize: 20,
    lineHeight: 32,
    paddingLeft: 8,
  },
  highlightedVerse: {
    backgroundColor: '#fff3cd',
  },
  searchModal: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    marginRight: 16,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    fontSize: 16,
  },
  resultCount: {
    padding: 16,
    color: '#666',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResults: {
    flex: 1,
  },
  searchResult: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    gap: 8,
  },
  content: {
    flex: 1,
  },
  chapterContainer: {
    marginBottom: 16,
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  versesContainer: {
    padding: 16,
  },
  verseContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  verseText: {
    flex: 1,
    fontSize: 20,
    lineHeight: 32,
    paddingLeft: 8,
  },
  firstVerse: {
    marginTop: 0,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chapterItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  selectedChapter: {
    backgroundColor: Colors.primary,
  },
  selectedChapterText: {
    color: '#fff',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    padding: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
});
