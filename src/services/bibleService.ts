import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

interface BibleVerse {
  text: string;
  verse: number;
}

interface BibleChapter {
  verses: BibleVerse[];
}

interface BibleBook {
  book: string;
  abbrev: string;
  chapters: string[][];
}

class BibleService {
  private initialized: boolean;
  private bibleData: BibleBook[] | null;

  constructor() {
    this.initialized = false;
    this.bibleData = null;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // First, ensure the directory exists
      const bibleDir = `${FileSystem.documentDirectory}bible`;
      const jsonPath = `${bibleDir}/en_kjv.json`;

      console.log('Initializing Bible Service...');
      console.log('Bible Directory:', bibleDir);
      console.log('JSON Path:', jsonPath);

      // Check if file exists in document directory
      const fileInfo = await FileSystem.getInfoAsync(jsonPath);
      console.log('File exists?', fileInfo.exists);
      
      if (!fileInfo.exists) {
        console.log('Loading Bible data from assets...');
        // Create directory if it doesn't exist
        await FileSystem.makeDirectoryAsync(bibleDir, { intermediates: true });
        
        // Copy the asset file to document directory
        const asset = require('../../bible/json/en_kjv.json');
        this.bibleData = asset;
        
        // Log first few verses of Genesis to verify data
        console.log('Sample from loaded data:');
        if (asset && asset[0] && asset[0].chapters && asset[0].chapters[0]) {
          console.log('First book:', asset[0].book);
          console.log('First 3 verses of Genesis:');
          console.log(asset[0].chapters[0].slice(0, 3));
        } else {
          console.log('WARNING: Unexpected data structure in asset:', asset);
        }

        await FileSystem.writeAsStringAsync(jsonPath, JSON.stringify(asset));
      } else {
        console.log('Loading Bible data from file system...');
        // Read the JSON file
        const jsonContent = await FileSystem.readAsStringAsync(jsonPath);
        this.bibleData = JSON.parse(jsonContent);
        
        // Log first few verses to verify data
        console.log('Sample from loaded data:');
        if (this.bibleData && this.bibleData[0] && this.bibleData[0].chapters) {
          console.log('First book:', this.bibleData[0].book);
          console.log('First 3 verses of Genesis:');
          console.log(this.bibleData[0].chapters[0].slice(0, 3));
        } else {
          console.log('WARNING: Unexpected data structure in loaded file:', this.bibleData);
        }
      }

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
      if (!this.bibleData) {
        throw new Error('Bible data not initialized');
      }

      console.log(`Getting verse - Book: ${book}, Chapter: ${chapter}, Verse: ${verse}`);
      
      const bookData = this.bibleData.find(b => 
        b.book.toLowerCase() === book.toLowerCase() || 
        b.abbrev.toLowerCase() === book.toLowerCase()
      );
      
      console.log('Found book:', bookData?.book);
      
      if (!bookData) throw new Error('Book not found');
      if (!bookData.chapters[chapter - 1]) throw new Error('Chapter not found');
      if (!bookData.chapters[chapter - 1][verse - 1]) throw new Error('Verse not found');

      const verseText = bookData.chapters[chapter - 1][verse - 1];
      console.log('Retrieved verse:', verseText);

      return {
        text: verseText,
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
      if (!this.bibleData) {
        throw new Error('Bible data not initialized');
      }

      console.log(`Getting chapter - Book: ${book}, Chapter: ${chapterNum}`);
      
      const bookData = this.bibleData.find(b => 
        b.book.toLowerCase() === book.toLowerCase() || 
        b.abbrev.toLowerCase() === book.toLowerCase()
      );
      
      console.log('Found book:', bookData?.book);
      
      if (!bookData) throw new Error('Book not found');
      
      const chapter = bookData.chapters[chapterNum - 1];
      if (!chapter) throw new Error('Chapter not found');

      console.log(`Chapter ${chapterNum} length:`, chapter.length);
      console.log('First 3 verses of chapter:', chapter.slice(0, 3));

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

    if (!this.bibleData) {
      throw new Error('Bible data not initialized');
    }

    const results: Array<{
      book: string;
      chapter: number;
      verse: number;
      text: string;
    }> = [];

    try {
      console.log('Searching for:', query);
      
      this.bibleData.forEach(book => {
        book.chapters.forEach((chapter, chapterIndex) => {
          chapter.forEach((verse, verseIndex) => {
            if (verse.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                book: book.book,
                chapter: chapterIndex + 1,
                verse: verseIndex + 1,
                text: verse
              });
            }
          });
        });
      });

      console.log(`Found ${results.length} matches`);
      if (results.length > 0) {
        console.log('First match:', results[0]);
      }

      return results;
    } catch (error) {
      console.error('Error searching text:', error);
      throw error;
    }
  }

  async getBooks() {
    await this.initialize();
    if (!this.bibleData) {
      throw new Error('Bible data not initialized');
    }
    return this.bibleData;
  }

  async getBookByIndex(index: number) {
    await this.initialize();
    if (!this.bibleData) {
      throw new Error('Bible data not initialized');
    }
    return this.bibleData[index];
  }
}

export const bibleService = new BibleService(); 