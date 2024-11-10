import React, { createContext, useContext, useState, useCallback } from 'react';
import { bibleService } from '../services/bibleService';

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

  const fetchVerseContent = useCallback(async (reference: string) => {
    console.log('Fetching verse content for reference:', reference);
    
    try {
      // Parse reference (e.g., "Genesis 1" or "John 3")
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