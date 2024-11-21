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
  const [visibleChapter, setVisibleChapter] = useState(currentChapter);
  const [isScrolling, setIsScrolling] = useState(false);
  const [chapterLayouts, setChapterLayouts] = useState<{[key: string]: number}>({});

  // Move all styles that depend on theme or state inside the component
  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      elevation: isScrolling ? 4 : 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isScrolling ? 0.2 : 0,
      shadowRadius: 4,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconButton: {
      padding: 10,
      borderRadius: 20,
      backgroundColor: isScrolling ? `${Colors.light.primary}10` : 'transparent',
    },
    titleButton: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    titleText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
    },
    chapterText: {
      fontSize: 14,
      color: theme.text,
      opacity: 0.8,
    },
    dropdownIcon: {
      marginTop: 2,
    },
    searchButton: {
      backgroundColor: `${Colors.light.primary}10`,
    },
    buttonPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.95 }],
    },
    content: {
      flex: 1,
    },
    chapterContainer: {
      marginBottom: 16,
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

  const handleScroll = useCallback((event: any) => {
    if (!isScrolling) {
      setIsScrolling(true);
    }

    const scrollY = event.nativeEvent.contentOffset.y;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    const viewportCenter = scrollY + (layoutHeight / 2);

    // Find the chapter closest to the center of the viewport
    let closestChapter = visibleChapter;
    let minDistance = Infinity;

    Object.entries(chapterLayouts).forEach(([chapter, yPosition]) => {
      const distance = Math.abs(yPosition - viewportCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestChapter = parseInt(chapter);
      }
    });

    if (closestChapter !== visibleChapter) {
      setVisibleChapter(closestChapter);
      setCurrentChapter(closestChapter);
    }
  }, [chapterLayouts, visibleChapter]);

  useEffect(() => {
    if (isScrolling) {
      const timeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [isScrolling]);

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
          <Text style={styles.modalSubtitle}>Old Testament</Text>
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
                  styles.bookItemText,
                  currentBook === item && styles.selectedBook
                ]}>
                  {item}
                </Text>
              </Pressable>
            )}
          />
          <Text style={[styles.modalSubtitle, { marginTop: 16 }]}>New Testament</Text>
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
                  styles.bookItemText,
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
              styles.chapterItemText,
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
      setVisibleChapter(1);
      setChapters([]);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handlePrevBook = () => {
    const currentIndex = bibleService.bibleData.findIndex(b => b.abbrev === currentBook);
    if (currentIndex > 0) {
      const prevBook = bibleService.bibleData[currentIndex - 1];
      setCurrentBook(prevBook.abbrev);
      setCurrentChapter(1);
      setVisibleChapter(1);
      setChapters([]);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable 
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.buttonPressed
            ]}
            onPress={handlePrevBook}
          >
            <FontAwesome name="chevron-left" size={20} color={theme.text} />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.titleButton,
            pressed && styles.buttonPressed
          ]}
          onPress={() => setShowBookDropdown(!showBookDropdown)}
        >
          <Text style={styles.titleText}>
            {bibleService.bibleData.find(b => b.abbrev === currentBook)?.name || currentBook}
          </Text>
          <Text style={styles.chapterText}>
            Chapter {visibleChapter}
          </Text>
          <FontAwesome 
            name={showBookDropdown ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={theme.text} 
            style={styles.dropdownIcon}
          />
        </Pressable>

        <View style={styles.headerRight}>
          <Pressable 
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.buttonPressed
            ]}
            onPress={handleNextBook}
          >
            <FontAwesome name="chevron-right" size={20} color={theme.text} />
          </Pressable>

          <Pressable 
            style={({ pressed }) => [
              styles.iconButton,
              styles.searchButton,
              pressed && styles.buttonPressed
            ]}
            onPress={() => {
              setShowSearch(true);
              setSearchQuery('');
              setSearchResults([]);
              setSearchStats({ total: 0, bookOccurrences: {}, relatedWords: [] });
            }}
          >
            <FontAwesome name="search" size={20} color={theme.text} />
          </Pressable>
        </View>
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
          <View 
            key={chapter.chapter} 
            style={[styles.chapterContainer, { backgroundColor: theme.background }]}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setChapterLayouts(prev => ({
                ...prev,
                [chapter.chapter]: layout.y
              }));
            }}
          >
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
              <Text style={styles.modalTitle}>
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

// Move static styles outside the component
const staticStyles = StyleSheet.create({
  content: {
    flex: 1,
  },
  chapterContainer: {
    marginBottom: 16,
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
