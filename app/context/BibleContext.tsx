import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { bibleService } from '../services/bibleService';
import { View, ActivityIndicator, Text, Pressable, StyleSheet, useColorScheme } from 'react-native';
import Colors from '../constants/Colors';

interface BibleContextType {
  currentBook: string;
  currentChapter: number;
  setCurrentBook: (book: string) => void;
  setCurrentChapter: (chapter: number) => void;
  fetchVerseContent: (reference: string) => Promise<any>;
}

const BibleContext = createContext<BibleContextType | undefined>(undefined);

export function BibleProvider({ children }: { children: React.ReactNode }) {
  const [currentBook, setCurrentBook] = useState('gn');
  const [currentChapter, setCurrentChapter] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const fetchVerseContent = useCallback(async (reference: string) => {
    console.log('Fetching verse content for reference:', reference);
    
    try {
      const [book, chapter] = reference.split(' ');
      const bookAbbrev = bibleService.getBookAbbrev(book);
      
      console.log('Parsed reference - Book:', bookAbbrev, 'Chapter:', chapter);

      if (parseInt(chapter) <= 0) {
        console.log('Invalid chapter number:', chapter);
        return null;
      }

      const chapterData = await bibleService.getChapter(bookAbbrev, parseInt(chapter));
      return chapterData;
    } catch (error) {
      console.error('Error fetching verse content:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    async function initializeBible() {
      try {
        console.log('Initializing Bible data...');
        await bibleService.initialize();
        console.log('Bible initialization complete');
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize Bible:', err);
        setError(err instanceof Error ? err.message : 'Failed to load Bible data');
        setIsLoading(false);
      }
    }

    initializeBible();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading Bible data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Pressable 
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <BibleContext.Provider
      value={{
        currentBook,
        currentChapter,
        setCurrentBook,
        setCurrentChapter,
        fetchVerseContent,
      }}
    >
      {children}
    </BibleContext.Provider>
  );
}

export function useBible() {
  const context = useContext(BibleContext);
  if (context === undefined) {
    throw new Error('useBible must be used within a BibleProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
}); 