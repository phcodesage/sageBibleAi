import React, { createContext, useContext, useState } from 'react';
import { bibleBooks } from '../constants/bible-books';

interface BibleContextType {
  currentBook: string;
  currentChapter: number;
  setCurrentBook: (book: string) => void;
  setCurrentChapter: (chapter: number) => void;
  fetchVerseContent: (reference: string) => Promise<any>;
}

const BibleContext = createContext<BibleContextType | undefined>(undefined);

export function BibleProvider({ children }: { children: React.ReactNode }) {
  const [currentBook, setCurrentBook] = useState('Genesis');
  const [currentChapter, setCurrentChapter] = useState(1);

  async function fetchVerseContent(reference: string) {
    try {
      const response = await fetch(`https://bible-api.com/${reference}?translation=web`);
      const data = await response.json();
      return {
        verses: data.verses,
        reference: data.reference,
      };
    } catch (error) {
      console.error('Error fetching verse:', error);
      return null;
    }
  }

  const value = {
    currentBook,
    currentChapter,
    setCurrentBook,
    setCurrentChapter,
    fetchVerseContent,
  };

  return (
    <BibleContext.Provider value={value}>
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