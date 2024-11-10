import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

interface BibleBook {
  abbrev: string;
  name: string;
  chapters: string[][];  // Array of chapters, each chapter is an array of verses
}

class BibleService {
  private initialized: boolean;
  private bibleData: BibleBook[];

  constructor() {
    this.initialized = false;
    this.bibleData = [];
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const bibleDir = `${FileSystem.documentDirectory}bible`;
      const jsonPath = `${bibleDir}/en_kjv.json`;

      console.log('Initializing Bible Service...');
      
      // Check if file exists in document directory
      const fileInfo = await FileSystem.getInfoAsync(jsonPath);
      let rawData;
      
      if (!fileInfo.exists) {
        console.log('Loading Bible data from assets...');
        await FileSystem.makeDirectoryAsync(bibleDir, { intermediates: true });
        
        // Load the asset file directly
        rawData = require('../../bible/json/en_kjv.json');
        await FileSystem.writeAsStringAsync(jsonPath, JSON.stringify(rawData));
      } else {
        console.log('Loading Bible data from file system...');
        const jsonContent = await FileSystem.readAsStringAsync(jsonPath);
        rawData = JSON.parse(jsonContent);
      }

      // Ensure the data is in the correct format
      if (!Array.isArray(rawData) || !rawData[0]?.abbrev || !rawData[0]?.name || !Array.isArray(rawData[0]?.chapters)) {
        throw new Error('Invalid Bible data format');
      }

      this.bibleData = rawData;

      // Log the first book's structure to verify
      const firstBook = this.bibleData[0];
      console.log('First book loaded:', {
        abbrev: firstBook.abbrev,
        name: firstBook.name,
        chapterCount: firstBook.chapters.length,
        firstChapterVerseCount: firstBook.chapters[0]?.length,
        sampleVerses: firstBook.chapters[0]?.slice(0, 3)
      });

      this.initialized = true;
      console.log('Bible Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Bible service:', error);
      throw error;
    }
  }

  async getVerse(book: string, chapter: number, verse: number) {
    await this.initialize();

    try {
      if (chapter <= 0 || verse <= 0) {
        throw new Error('Invalid chapter or verse number');
      }

      const bookData = this.bibleData.find(b => 
        b.abbrev.toLowerCase() === book.toLowerCase()
      );
      
      if (!bookData) throw new Error('Book not found');
      if (!bookData.chapters[chapter - 1]) throw new Error('Chapter not found');
      if (!bookData.chapters[chapter - 1][verse - 1]) throw new Error('Verse not found');

      return {
        text: bookData.chapters[chapter - 1][verse - 1],
        verse: verse
      };
    } catch (error) {
      console.error('Error getting verse:', error);
      throw error;
    }
  }

  async getChapter(book: string, chapterNum: number) {
    await this.initialize();

    try {
      if (chapterNum <= 0) {
        throw new Error('Invalid chapter number');
      }

      console.log(`Getting chapter - Book: ${book}, Chapter: ${chapterNum}`);
      
      const bookData = this.bibleData.find(b => 
        b.abbrev.toLowerCase() === book.toLowerCase()
      );
      
      console.log('Found book:', bookData?.abbrev);
      
      if (!bookData) throw new Error('Book not found');
      
      const chapter = bookData.chapters[chapterNum - 1];
      if (!chapter) throw new Error('Chapter not found');

      console.log(`Chapter ${chapterNum} found with ${chapter.length} verses`);
      console.log('First 3 verses:', chapter.slice(0, 3));

      const verses = chapter.map((text, index) => ({
        verse: index + 1,
        text
      }));

      return {
        book,
        chapter: chapterNum,
        verses
      };
    } catch (error) {
      console.error('Error getting chapter:', error);
      throw error;
    }
  }

  async searchText(query: string) {
    await this.initialize();
    const results = [];

    try {
      this.bibleData.forEach(book => {
        book.chapters.forEach((chapter, chapterIndex) => {
          chapter.forEach((verse, verseIndex) => {
            if (verse.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                book: book.abbrev,
                chapter: chapterIndex + 1,
                verse: verseIndex + 1,
                text: verse
              });
            }
          });
        });
      });

      return results;
    } catch (error) {
      console.error('Error searching text:', error);
      throw error;
    }
  }

  // Helper method to get book abbreviation from full name
  getBookAbbrev(fullName: string): string {
    const bookMap: { [key: string]: string } = {
      'genesis': 'gn',
      'exodus': 'ex',
      'leviticus': 'lv',
      'numbers': 'nm',
      'deuteronomy': 'dt',
      // Add more mappings as needed
    };
    
    return bookMap[fullName.toLowerCase()] || fullName.toLowerCase();
  }
}

export const bibleService = new BibleService();