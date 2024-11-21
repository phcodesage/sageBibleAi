import { StyleSheet, ScrollView, Pressable, View, Modal, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { useBible } from '../context/BibleContext';
import { useState, useCallback, useEffect, useRef } from 'react';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
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

// Add this interface for chapter layout information
interface ChapterLayout {
  y: number;
  height: number;
}

export default function BibleScreen() {
  // First get the context values
  const { fetchVerseContent } = useBible();
  
  // Then declare all state
  const [currentBook, setCurrentBook] = useState('gn');
  const [currentChapter, setCurrentChapter] = useState(1);
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
  const [layouts, setLayouts] = useState<{
    chapters: {[key: string]: ChapterLayout},
    showChapter: boolean,
    showBook: boolean
  }>({
    chapters: {},
    showChapter: false,
    showBook: false
  });
  const [isChapterLoading, setIsChapterLoading] = useState(false);
  const [totalChapters, setTotalChapters] = useState(0);

  // Add missing style properties
  const styles = StyleSheet.create({
    appBar: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    appBarButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    appBarButtonText: {
      fontSize: 16,
      fontWeight: '500',
      marginHorizontal: 4,
    },
    appBarTitle: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginHorizontal: 8,
      paddingHorizontal: 12,
    },
    appBarTitleText: {
      fontSize: 18,
      fontWeight: '500',
    },
    bottomNav: {
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.verseBorder,
      paddingVertical: 8,
    },
    chapterButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 16,
    },
    chapterNavButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.verseBorder,
      minWidth: 80,
      justifyContent: 'center',
    },
    chapterNavText: {
      fontSize: 16,
      fontWeight: '500',
      marginHorizontal: 4,
    },
    currentChapterIndicator: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.primary + '10',
    },
    currentChapterText: {
      fontSize: 16,
      fontWeight: '600',
    },
    buttonPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
      backgroundColor: theme.primary + '10',
    },
    chapterDropdown: {
      position: 'absolute',
      top: 56,
      left: 0,
      right: 0,
      maxHeight: '80%',
      padding: 16,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    chapterItem: {
      flex: 1,
      aspectRatio: 1,
      margin: 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: '#f5f5f5',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.5,
    },
    chapterItemText: {
      fontSize: 16,
      fontWeight: '500',
    },
    content: {
      flex: 1,
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
    selectedChapter: {
      backgroundColor: theme.primary,
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
      backgroundColor: theme.primary + '10',
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
      backgroundColor: theme.primary + '20',
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
      backgroundColor: theme.primary,
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
      backgroundColor: theme.primary + '10',
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
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: '500',
    },
    chapterNavigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.verseBorder,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    bookNavButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.verseBorder,
    },
    bookNavText: {
      fontSize: 14,
      fontWeight: '500',
      marginHorizontal: 8,
    },
    modalSubtitle: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 16,
    },
    bookItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.verseBorder,
    },
    selectedBook: {
      backgroundColor: theme.primary + '20',
    },
    bookItemText: {
      fontSize: 16,
      color: theme.text,
    },
    bookDropdown: {
      position: 'absolute',
      top: 56,
      left: 0,
      right: 0,
      backgroundColor: theme.background,
      elevation: 4,
      maxHeight: '80%',
    },
    bookList: {
      flex: 1,
    },
    bookDropdownItem: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectedBookDropdownItem: {
      backgroundColor: theme.primary + '20',
    },
    bookDropdownText: {
      fontSize: 16,
      color: theme.text,
    },
    bookAbbrev: {
      fontSize: 14,
      color: theme.primary,
    },
    searchModal: {
      flex: 1,
      backgroundColor: theme.background,
    },
    searchHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.verseBorder,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      marginRight: 16,
      color: theme.text,
    },
    searchResults: {
      flex: 1,
    },
    searchResultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    searchButton: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.verseBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  // Update the handleChapterSelect function
  const handleChapterSelect = async (chapter: number) => {
    try {
      setIsChapterLoading(true);
      setCurrentChapter(chapter);
      setSelectedVerses([]); // Clear any selected verses
      
      // Load only the selected chapter
      const chapterData = await fetchVerseContent(`${currentBook} ${chapter}`);
      if (chapterData) {
        setChapters([{
          chapter: chapter,
          verses: chapterData.verses
        }]);

        // Reset scroll position immediately
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });

        // Clear any previous layouts
        setLayouts(prev => ({
          ...prev,
          chapters: {},
          showChapter: false
        }));
      }
    } catch (error) {
      console.error('Error in handleChapterSelect:', error);
    } finally {
      setIsChapterLoading(false);
    }
  };

  // Update the ScrollView section
  <ScrollView 
    ref={scrollViewRef}
    style={styles.content}
    onScroll={handleScroll}
    scrollEventThrottle={16}
  >
    {/* Chapter Content - Only show current chapter */}
    {chapters.map((chapter) => (
      <View 
        key={chapter.chapter} 
        style={[styles.chapterContainer, { backgroundColor: theme.background }]}
      >
        <Text variant="chapter" style={{ color: theme.text }}>
          Chapter {chapter.chapter}
        </Text>
        <View style={styles.versesContainer}>
          {chapter.verses.map((verse) => {
            // Parse the verse text here, before using it
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

  // Remove the continuous scrolling useEffect and loadChapters useEffect
  // Only keep the initial chapter load
  useEffect(() => {
    handleChapterSelect(currentChapter);
  }, [currentBook, currentChapter]);

  // Update handleScroll with more logging
  const handleScroll = useCallback((event: any) => {
    if (!isScrolling) {
      setIsScrolling(true);
    }

    const scrollY = event.nativeEvent.contentOffset.y;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    const viewportTop = scrollY;
    const viewportBottom = scrollY + layoutHeight;

    // Find which chapters are visible in the viewport
    const visibleChapters = Object.entries(layouts.chapters)
      .map(([chapter, layout]) => {
        const visibleHeight = Math.min(layout.y + layout.height, viewportBottom) - 
                      Math.max(layout.y, viewportTop);
        const visibilityPercentage = visibleHeight / layout.height;
        
        return {
          chapter: parseInt(chapter),
          visibleHeight,
          visibilityPercentage,
          layout
        };
      })
      .filter(({ visibleHeight }) => visibleHeight > 0)
      .sort((a, b) => b.visibilityPercentage - a.visibilityPercentage);

    if (visibleChapters.length > 0) {
      const mostVisible = visibleChapters[0];
      
      // Update current chapter when more than 30% of a chapter is visible
      if (mostVisible.visibilityPercentage > 0.3 && mostVisible.chapter !== currentChapter) {
        setCurrentChapter(mostVisible.chapter);
        setVisibleChapter(mostVisible.chapter);
      }
    }
  }, [layouts.chapters, currentChapter, chapters]);

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
            const bookName = bibleService.getBibleData().find(b => b.abbrev === result.book)?.name || result.book;
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
  }, [searchTimeout]);

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

  // Update the book navigation handlers
  const handleNextBook = async () => {
    try {
      const nextBook = await bibleService.getNextBook(currentBook);
      if (nextBook) {
        // Always start with chapter 1 when switching books
        setCurrentBook(nextBook.abbrev);
        setCurrentChapter(1);  // Always reset to chapter 1
        setVisibleChapter(1);
        setChapters([]);
        setSelectedVerses([]);
        setLayouts(prev => ({ 
          ...prev, 
          chapters: {},
          showChapter: false,
          showBook: false
        }));
        
        // Load first chapter of the new book
        const chapterData = await fetchVerseContent(`${nextBook.abbrev} 1`);  // Always load chapter 1
        if (chapterData) {
          setChapters([{
            chapter: 1,
            verses: chapterData.verses
          }]);
        }
        
        // Reset scroll position
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        
        // Update total chapters for the new book
        const nextBookTotalChapters = await bibleService.getTotalChapters(nextBook.abbrev);
        setTotalChapters(nextBookTotalChapters);
      }
    } catch (error) {
      console.error('Error switching to next book:', error);
    }
  };

  const handlePrevBook = async () => {
    try {
      const prevBook = await bibleService.getPrevBook(currentBook);
      if (prevBook) {
        // Always start with chapter 1 when switching books
        setCurrentBook(prevBook.abbrev);
        setCurrentChapter(1);  // Always reset to chapter 1
        setVisibleChapter(1);
        setChapters([]);
        setSelectedVerses([]);
        setLayouts(prev => ({ 
          ...prev, 
          chapters: {},
          showChapter: false,
          showBook: false
        }));
        
        // Load first chapter of the new book
        const chapterData = await fetchVerseContent(`${prevBook.abbrev} 1`);  // Always load chapter 1
        if (chapterData) {
          setChapters([{
            chapter: 1,
            verses: chapterData.verses
          }]);
        }
        
        // Reset scroll position
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        
        // Update total chapters for the new book
        const prevBookTotalChapters = await bibleService.getTotalChapters(prevBook.abbrev);
        setTotalChapters(prevBookTotalChapters);
      }
    } catch (error) {
      console.error('Error switching to previous book:', error);
    }
  };

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
                  const book = bibleService.getBibleData().find(b => b.name === bookName);
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
                        setLayouts(prev => ({ ...prev, showBook: false }));
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

  const handleBackPress = () => {
    // Handle back press if needed
  };

  // Add this useEffect to update totalChapters when book changes
  useEffect(() => {
    const updateTotalChapters = async () => {
      const total = await bibleService.getTotalChapters(currentBook);
      setTotalChapters(total);
    };
    updateTotalChapters();
  }, [currentBook]);

  return (
    <Screen>
      <View style={[styles.appBar, { backgroundColor: theme.background }]}>
        {/* Previous Book Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.appBarButton,
            pressed && styles.buttonPressed
          ]}
          onPress={handlePrevBook}
        >
          <MaterialIcons name="chevron-left" size={24} color={theme.primary} />
          <Text style={[styles.appBarButtonText, { color: theme.text }]}>
            {bibleService.getBibleData().find(b => b.abbrev === currentBook)?.name}
          </Text>
        </Pressable>

        {/* Book and Chapter Title */}
        <Pressable 
          style={({ pressed }) => [
            styles.appBarTitle,
            pressed && { backgroundColor: theme.primary + '15' },
            { borderRadius: 8, paddingVertical: 4 }
          ]}
          onPress={() => {
            setLayouts(prev => ({ ...prev, showChapter: !prev.showChapter }));
          }}
        >
          <Text style={[styles.appBarTitleText, { color: theme.text }]}>
            {bibleService.getBibleData().find(b => b.abbrev === currentBook)?.name} {currentChapter}
          </Text>
          <MaterialIcons 
            name={layouts.showChapter ? "expand-less" : "expand-more"} 
            size={24} 
            color={theme.text} 
          />
        </Pressable>

        {/* Next Book Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.appBarButton,
            pressed && styles.buttonPressed
          ]}
          onPress={handleNextBook}
        >
          <Text style={[styles.appBarButtonText, { color: theme.text }]}>
            {bibleService.getBibleData().find((b, i, arr) => 
              arr[arr.findIndex(book => book.abbrev === currentBook) + 1]?.abbrev === b.abbrev
            )?.name}
          </Text>
          <MaterialIcons name="chevron-right" size={24} color={theme.primary} />
        </Pressable>

        {/* Menu Button */}
        <Pressable 
          style={styles.appBarButton}
          onPress={() => {/* Handle menu */}}
        >
          <MaterialIcons name="more-vert" size={24} color={theme.text} />
        </Pressable>
      </View>

      {/* Main Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Chapter Content - Only show current chapter */}
        {chapters.map((chapter) => (
          <View 
            key={chapter.chapter} 
            style={[styles.chapterContainer, { backgroundColor: theme.background }]}
          >
            <Text variant="chapter" style={{ color: theme.text }}>
              Chapter {chapter.chapter}
            </Text>
            <View style={styles.versesContainer}>
              {chapter.verses.map((verse) => {
                // Parse the verse text here, before using it
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

      {/* Bottom Book Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.background }]}>
        <View style={styles.chapterButtonsContainer}>
          {/* Previous Chapter button */}
          {currentChapter > 1 && (
            <Pressable 
              style={({ pressed }) => [
                styles.chapterNavButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => handleChapterSelect(currentChapter - 1)}
            >
              <MaterialIcons name="chevron-left" size={24} color={theme.primary} />
              <Text style={[styles.chapterNavText, { color: theme.text }]}>
                {currentChapter - 1}
              </Text>
            </Pressable>
          )}

          {/* Search Button */}
          <Pressable 
            style={({ pressed }) => [
              styles.searchButton,
              pressed && styles.buttonPressed
            ]}
            onPress={() => setShowSearch(true)}
          >
            <MaterialIcons name="search" size={24} color={theme.primary} />
          </Pressable>

          {/* Next Chapter button */}
          {currentChapter < totalChapters && (
            <Pressable 
              style={({ pressed }) => [
                styles.chapterNavButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => handleChapterSelect(currentChapter + 1)}
            >
              <Text style={[styles.chapterNavText, { color: theme.text }]}>
                {currentChapter + 1}
              </Text>
              <MaterialIcons name="chevron-right" size={24} color={theme.primary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Chapter Dropdown */}
      {layouts.showChapter && (
        <View style={[styles.chapterDropdown, { backgroundColor: theme.background }]}>
          {isChapterLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.text }]}>
                Loading Chapter...
              </Text>
            </View>
          )}
          <FlatList
            data={Array.from({ length: totalChapters }, (_, i) => i + 1)}
            numColumns={5}
            keyExtractor={item => item.toString()}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={5}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.chapterItem,
                  currentChapter === item && { backgroundColor: theme.primary },
                  pressed && { backgroundColor: theme.primary + '40' }
                ]}
                onPress={() => handleChapterSelect(item)}
              >
                <Text style={[
                  styles.chapterItemText,
                  { color: currentChapter === item ? '#fff' : theme.text }
                ]}>
                  {item}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}

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
              <FontAwesome name="times" size={24} color={theme.primary} />
            </Pressable>
          </View>

          {searchQuery.length >= 2 && (
            <View style={styles.searchStats}>
              {isSearching ? (
                <View style={styles.searchingContainer}>
                  <ActivityIndicator color={theme.primary} />
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
                    {bibleService.getBibleData().find(b => b.abbrev === result.book)?.name} {result.chapter}:{result.verse}
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
                  <FontAwesome name="arrow-left" size={20} color={theme.primary} />
                </Pressable>
              )}
              <Pressable onPress={() => setShowModal(false)}>
                <FontAwesome name="times" size={24} color={theme.primary} />
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  chapterNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.verseBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  chapterNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.verseBorder,
  },
  chapterNavText: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
    backgroundColor: Colors.primary + '10',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.verseBorder,
  },
  bookNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.verseBorder,
  },
  bookNavText: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 8,
  },
});

// Update the parseVerseText function definition
const parseVerseText = (text: string): VerseComment => {
  const commentRegex = /\{([^}]+)\}/g;
  const comments: string[] = [];
  let cleanText = text;
  
  let match;
  while ((match = commentRegex.exec(text)) !== null) {
    comments.push(match[1]);
    cleanText = cleanText.replace(match[0], '');
  }

  return {
    text: cleanText.trim(),
    comment: comments.length > 0 ? comments.join(' ') : undefined
  };
};
