import { StyleSheet, ScrollView, Pressable, View, Modal, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { useBible } from '../context/BibleContext';
import { useState, useCallback, useEffect, useRef } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { bibleBooks } from '../constants/bible-books';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { bibleService } from '../services/bibleService';

interface VerseComment {
  text: string;
  comment?: string;
}

interface ChapterContent {
  chapter: number;
  verses: {
    verse: number;
    text: string;
    comment?: string;
  }[];
}

interface SearchResult {
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  matchIndex: number;
  keyword: string;
}

const BIBLE_STRUCTURE = {
  oldTestament: {
    law: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
    history: ['Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther'],
    poetry: ['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon'],
    majorProphets: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'],
    minorProphets: ['Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi']
  },
  newTestament: {
    gospels: ['Matthew', 'Mark', 'Luke', 'John'],
    history: ['Acts'],
    paulineEpistles: ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon'],
    generalEpistles: ['Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude'],
    apocalyptic: ['Revelation']
  }
};

export default function BibleScreen() {
  const { currentBook, currentChapter, setCurrentBook, setCurrentChapter, fetchVerseContent } = useBible();
  const [chapters, setChapters] = useState<ChapterContent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalView, setModalView] = useState<'books' | 'chapters'>('books');
  const scrollViewRef = useRef<ScrollView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchStats, setSearchStats] = useState<{
    total: number;
    bookOccurrences: { [key: string]: number };
    relatedWords: string[];
  }>({ total: 0, bookOccurrences: {}, relatedWords: [] });
  const [showSearch, setShowSearch] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [selectedTestament, setSelectedTestament] = useState<'old' | 'new' | null>(null);
  const [isSearching, setIsSearching] = useState(false);

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
      console.log(`Loading chapters for ${book}, starting at chapter ${startChapter}`);
      
      // Only load valid chapters (1 and above)
      const chapterPromises = [];
      for (let offset = -2; offset <= 2; offset++) {
        const targetChapter = startChapter + offset;
        if (targetChapter > 0) { // Only fetch valid chapters
          console.log(`Fetching chapter ${targetChapter}`);
          chapterPromises.push(fetchVerseContent(`${book} ${targetChapter}`));
        }
      }
      
      const results = await Promise.all(chapterPromises);
      console.log('Received results:', results.map(r => ({
        chapter: r?.chapter,
        verseCount: r?.verses?.length
      })));

      const validResults = results
        .filter(result => result?.verses)
        .map(result => ({
          chapter: result.chapter,
          verses: result.verses
        }));

      console.log('Valid results:', validResults.map(r => ({
        chapter: r.chapter,
        verseCount: r.verses.length
      })));

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

        const sortedChapters = uniqueChapters.sort((a, b) => a.chapter - b.chapter);
        console.log('Final chapters state:', sortedChapters.map(c => ({
          chapter: c.chapter,
          verseCount: c.verses.length
        })));

        return sortedChapters;
      });
    } catch (error) {
      console.error('Error loading chapters:', error);
    }
    setIsLoading(false);
  }, [fetchVerseContent]);

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

  // Add this function to handle verse navigation
  const navigateToVerse = useCallback(async (book: string, chapter: number, verse: number) => {
    console.log(`Navigating to ${book} ${chapter}:${verse}`);
    
    try {
      setIsLoading(true);
      setCurrentBook(book);
      setCurrentChapter(chapter);
      setSelectedVerses([verse]);
      setShowSearch(false);

      // Load the chapter content
      const chapterData = await fetchVerseContent(`${book} ${chapter}`);
      if (chapterData) {
        setChapters([{
          chapter: chapter,
          verses: chapterData.verses
        }]);

        // Scroll to top after setting the chapter
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchVerseContent]);

  // Update the search handler to use debouncing
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (text.length >= 2) {
      setIsSearching(true);
    }

    // Set new timeout for search
    const newTimeout = setTimeout(async () => {
      if (text.length >= 2) {
        try {
          const results = await bibleService.searchText(text);
          setSearchResults(results);
          
          // Update search stats
          const bookOccurrences: { [key: string]: number } = {};
          results.forEach(result => {
            const bookName = bibleService.bibleData.find(b => b.abbrev === result.book)?.name || result.book;
            bookOccurrences[bookName] = (bookOccurrences[bookName] || 0) + 1;
          });

          setSearchStats({
            total: results.length,
            bookOccurrences,
            relatedWords: await bibleService.findRelatedWords(text)
          });
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setSearchStats({ total: 0, bookOccurrences: {}, relatedWords: [] });
        setIsSearching(false);
      }
    }, 300);

    setSearchTimeout(newTimeout);
  }, []);

  const handleVersePress = (verseId: number) => {
    setSelectedVerses(prev => 
      prev.includes(verseId) 
        ? prev.filter(id => id !== verseId)
        : [...prev, verseId]
    );
  };

  const parseVerseText = (verseText: string): VerseComment => {
    const commentRegex = /\{([^}]+)\}/g;
    const comments: string[] = [];
    let cleanText = verseText;
    
    let match;
    while ((match = commentRegex.exec(verseText)) !== null) {
      comments.push(match[1]);
      cleanText = cleanText.replace(match[0], '');
    }

    return {
      text: cleanText.trim(),
      comment: comments.length > 0 ? comments.join(' ') : undefined
    };
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

  const handleNextBook = () => {
    const currentIndex = bibleService.bibleData.findIndex(b => b.abbrev === currentBook);
    if (currentIndex < bibleService.bibleData.length - 1) {
      const nextBook = bibleService.bibleData[currentIndex + 1];
      setCurrentBook(nextBook.abbrev);
      setCurrentChapter(1);
      setChapters([]);
    }
  };

  const handlePrevBook = () => {
    const currentIndex = bibleService.bibleData.findIndex(b => b.abbrev === currentBook);
    if (currentIndex > 0) {
      const prevBook = bibleService.bibleData[currentIndex - 1];
      setCurrentBook(prevBook.abbrev);
      setCurrentChapter(1);
      setChapters([]);
    }
  };

  // Add new state for book dropdown
  const [showBookDropdown, setShowBookDropdown] = useState(false);

  const renderBookDropdown = () => (
    <View style={[styles.bookDropdown, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.bookList}>
        {!selectedTestament ? (
          // Show Testament Selection
          <>
            <Pressable
              style={styles.testamentItem}
              onPress={() => setSelectedTestament('old')}
            >
              <Text style={[styles.testamentHeader, { color: theme.primary }]}>
                Old Testament
              </Text>
              <Text style={[styles.testamentSubtext, { color: theme.text }]}>
                Genesis to Malachi
              </Text>
            </Pressable>
            
            <Pressable
              style={styles.testamentItem}
              onPress={() => setSelectedTestament('new')}
            >
              <Text style={[styles.testamentHeader, { color: theme.primary }]}>
                New Testament
              </Text>
              <Text style={[styles.testamentSubtext, { color: theme.text }]}>
                Matthew to Revelation
              </Text>
            </Pressable>
          </>
        ) : (
          // Show Books of Selected Testament
          <>
            <View style={styles.dropdownHeader}>
              <Pressable 
                style={styles.backButton}
                onPress={() => setSelectedTestament(null)}
              >
                <FontAwesome name="arrow-left" size={20} color={theme.text} />
              </Pressable>
              <Text style={[styles.testamentHeader, { color: theme.primary }]}>
                {selectedTestament === 'old' ? 'Old Testament' : 'New Testament'}
              </Text>
            </View>
            
            {Object.entries(
              selectedTestament === 'old' 
                ? BIBLE_STRUCTURE.oldTestament 
                : BIBLE_STRUCTURE.newTestament
            ).map(([category, books]) => (
              <View key={category}>
                <Text style={[styles.categoryHeader, { color: theme.text }]}>
                  {category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Text>
                {books.map(bookName => {
                  const book = bibleService.bibleData.find(b => b.name === bookName);
                  if (!book) return null;
                  return (
                    <Pressable
                      key={book.abbrev}
                      style={[
                        styles.bookDropdownItem,
                        currentBook === book.abbrev && styles.selectedBookDropdownItem
                      ]}
                      onPress={() => {
                        setCurrentBook(book.abbrev);
                        setCurrentChapter(1);
                        setChapters([]);
                        setShowBookDropdown(false);
                        setSelectedTestament(null);
                      }}
                    >
                      <Text style={[styles.bookDropdownText, { color: theme.text }]}>
                        {book.name}
                      </Text>
                      <Text style={[styles.bookAbbrev, { color: theme.primary }]}>
                        {book.abbrev}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );

  const renderSearchStats = () => (
    <View style={styles.searchStats}>
      <Text style={[styles.searchStatsText, { color: theme.text }]}>
        Found {searchStats.total} occurrences
      </Text>
      
      {/* Related Words */}
      {searchStats.relatedWords.length > 0 && (
        <View style={styles.relatedWordsContainer}>
          <Text style={[styles.relatedWordsTitle, { color: theme.primary }]}>
            Related Words:
          </Text>
          <View style={styles.relatedWordsList}>
            {searchStats.relatedWords.map((word, index) => (
              <Pressable
                key={word}
                style={styles.relatedWordChip}
                onPress={() => {
                  setSearchQuery(word);
                  handleSearch(word);
                }}
              >
                <Text style={[styles.relatedWordText, { color: theme.primary }]}>
                  {word}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Book Statistics */}
      <View style={styles.bookStats}>
        <Text style={[styles.bookStatsTitle, { color: theme.text }]}>
          Occurrences by Book:
        </Text>
        {Object.entries(searchStats.bookOccurrences)
          .sort(([, a], [, b]) => b - a)
          .map(([book, count]) => (
            <View key={book} style={styles.bookStatRow}>
              <Text style={[styles.bookStatText, { color: theme.text }]}>
                {book}
              </Text>
              <Text style={[styles.bookStatCount, { color: theme.primary }]}>
                {count}
              </Text>
            </View>
          ))}
      </View>
    </View>
  );

  // Add this helper function to highlight search terms
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return (
      <Text style={[styles.searchResultText, { color: theme.text }]}>
        {parts.map((part, index) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <Pressable
              key={index}
              onPress={() => {
                setSearchQuery(part);
                handleSearch(part);
              }}
            >
              <Text style={[styles.highlightedTerm, { backgroundColor: theme.primary + '30' }]}>
                {part}
              </Text>
            </Pressable>
          ) : (
            <Text key={index}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  return (
    <Screen>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Pressable 
          style={styles.navigationButton}
          onPress={handlePrevBook}
        >
          <FontAwesome name="chevron-left" size={20} color={theme.text} />
        </Pressable>

        <Pressable 
          style={styles.headerButton}
          onPress={() => setShowBookDropdown(!showBookDropdown)}
        >
          <Text style={dynamicStyles.headerText}>
            {bibleService.bibleData?.find(b => b.abbrev === currentBook)?.name || currentBook} {currentChapter}
          </Text>
          <FontAwesome 
            name={showBookDropdown ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={theme.text} 
          />
        </Pressable>

        <Pressable 
          style={styles.navigationButton}
          onPress={handleNextBook}
        >
          <FontAwesome name="chevron-right" size={20} color={theme.text} />
        </Pressable>

        <Pressable 
          style={styles.searchButton}
          onPress={() => {
            setShowSearch(true);
            setSearchQuery('');  // Clear previous search
            setSearchResults([]);
            setSearchStats({ total: 0, bookOccurrences: {}, relatedWords: [] });
          }}
        >
          <View style={styles.searchButtonContainer}>
            <FontAwesome name="search" size={20} color={theme.text} />
            <View style={styles.searchTooltip}>
              <Text style={styles.searchTooltipText}>
                Search for words, phrases, or references
              </Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* Book Dropdown */}
      {showBookDropdown && renderBookDropdown()}

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
              {chapter.verses.map((verse) => {
                const parsedVerse = parseVerseText(verse.text);
                return (
                  <Pressable
                    key={`${chapter.chapter}-${verse.verse}`}
                    id={`verse-${chapter.chapter}-${verse.verse}`}
                    onPress={() => handleVersePress(verse.verse)}
                    style={[
                      styles.verseContainer,
                      selectedVerses.includes(verse.verse) && styles.selectedVerseContainer
                    ]}
                  >
                    <Text variant="verseNumber" style={{ color: theme.verseNumber }}>
                      {verse.verse}
                    </Text>
                    <View style={styles.verseTextContainer}>
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
                        {parsedVerse.text}
                      </Text>
                      {parsedVerse.comment && (
                        <Text 
                          variant="verseComment"
                          style={[
                            styles.verseComment,
                            { color: theme.primary }
                          ]}
                        >
                          {parsedVerse.comment}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
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
              placeholder="Search the Bible..."
              autoFocus
            />
            <Pressable onPress={() => setShowSearch(false)}>
              <FontAwesome name="times" size={24} color={Colors.primary} />
            </Pressable>
          </View>

          {searchQuery.length >= 2 && (
            <View style={styles.searchStats}>
              {isSearching ? (
                <View style={styles.searchingContainer}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={[styles.searchingText, { color: theme.text }]}>
                    Searching...
                  </Text>
                </View>
              ) : (
                <Text style={[styles.searchStatsText, { color: theme.text }]}>
                  Found {searchStats.total} occurrences
                </Text>
              )}
            </View>
          )}

          <ScrollView style={styles.searchResults}>
            {!isSearching && searchResults.map((result, index) => (
              <Pressable
                key={`${result.book}-${result.chapter}-${result.verse}-${index}`}
                style={styles.searchResultItem}
                onPress={() => navigateToVerse(result.book, result.chapter, result.verse)}
              >
                <View style={styles.searchResultHeader}>
                  <Text style={[styles.searchResultReference, { color: theme.primary }]}>
                    {bibleService.bibleData.find(b => b.abbrev === result.book)?.name} {result.chapter}:{result.verse}
                  </Text>
                </View>
                <Text 
                  style={[styles.searchResultText, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {highlightSearchTerm(result.text, searchQuery)}
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  navigationButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  bookDropdown: {
    position: 'absolute',
    top: 60, // Adjust based on your header height
    left: 0,
    right: 0,
    maxHeight: '50%',
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bookList: {
    paddingVertical: 8,
  },
  bookDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedBookDropdownItem: {
    backgroundColor: Colors.primary + '20', // 20 is for opacity
  },
  bookDropdownText: {
    fontSize: 16,
    flex: 1,
  },
  selectedBookDropdownText: {
    fontWeight: 'bold',
  },
  bookAbbrev: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.7,
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
    padding: 12,
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
  searchResultHeader: {
    marginBottom: 8,
  },
  verseReference: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary + '15',
  },
  verseReferenceText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  referenceIcon: {
    marginLeft: 4,
  },
  searchResultContent: {
    marginLeft: 8,
  },
  highlightedTerm: {
    fontWeight: 'bold',
    backgroundColor: Colors.primary + '30',
    borderRadius: 4,
    paddingHorizontal: 2,
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
  verseTextContainer: {
    flex: 1,
    paddingLeft: 8,
  },
  verseText: {
    fontSize: 20,
    lineHeight: 32,
  },
  verseComment: {
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
  },
  testamentItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  testamentHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  testamentSubtext: {
    fontSize: 14,
    opacity: 0.7,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  categoryHeader: {
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary + '10',
  },
  searchStats: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  searchStatsText: {
    fontSize: 16,
    fontWeight: '500',
  },
  relatedWordsContainer: {
    marginTop: 8,
  },
  relatedWordsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  relatedWordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relatedWordChip: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  relatedWordText: {
    fontSize: 14,
  },
  bookStats: {
    marginTop: 16,
  },
  bookStatsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  bookStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  bookStatText: {
    fontSize: 14,
  },
  bookStatCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchResultLocation: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  searchButtonContainer: {
    position: 'relative',
  },
  searchTooltip: {
    position: 'absolute',
    top: 30,
    right: 0,
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 8,
    width: 150,
    opacity: 0,  // Hidden by default
  },
  searchTooltipText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  searchInstructions: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInstructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  searchInstructionText: {
    fontSize: 16,
    marginBottom: 8,
    paddingLeft: 8,
  },
  highlightedTerm: {
    fontWeight: 'bold',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  searchResultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultReference: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchResultText: {
    fontSize: 14,
    lineHeight: 20,
  },
  selectedVerseContainer: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  searchingText: {
    marginLeft: 8,
    fontSize: 16,
  },
});
