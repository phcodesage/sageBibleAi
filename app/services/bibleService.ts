import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

interface BibleBook {
  abbrev: string;
  name: string;
  chapters: string[][];  // Array of chapters, each chapter is an array of verses
}

interface SearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  matchIndex: number;
  keyword: string;
}

class BibleService {
  private initialized: boolean;
  private bibleData: any;
  private initializationError: Error | null;
  private searchIndex: Map<string, Set<string>> = new Map();

  private readonly wordRelations: { [key: string]: string[] } = {
    'pig': ['swine', 'hog', 'sow'],
    'swine': ['pig', 'hog', 'sow'],
    'god': ['lord', 'almighty', 'creator', 'father'],
    'jesus': ['christ', 'messiah', 'savior', 'son'],
    // Add more word relations as needed
  };

  constructor() {
    this.initialized = false;
    this.bibleData = null;
    this.initializationError = null;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('Starting Bible Service initialization...');
      const bibleDir = `${FileSystem.documentDirectory}bible`;
      const jsonPath = `${bibleDir}/en_kjv.json`;

      console.log('Checking for Bible data at:', jsonPath);
      const fileInfo = await FileSystem.getInfoAsync(jsonPath);
      
      if (!fileInfo.exists) {
        console.log('Bible data not found, loading from assets...');
        await FileSystem.makeDirectoryAsync(bibleDir, { intermediates: true });
        
        const asset = require('../../bible/json/en_kjv.json');
        console.log('Asset loaded, first book:', asset[0]?.abbrev);
        
        this.bibleData = asset;
        await FileSystem.writeAsStringAsync(jsonPath, JSON.stringify(asset));
        console.log('Bible data written to file system');
      } else {
        console.log('Loading Bible data from file system...');
        const jsonContent = await FileSystem.readAsStringAsync(jsonPath);
        this.bibleData = JSON.parse(jsonContent);
        console.log('Bible data loaded from file system');
      }

      if (!this.bibleData || !Array.isArray(this.bibleData) || this.bibleData.length === 0) {
        throw new Error('Invalid Bible data format');
      }

      console.log('Bible data loaded successfully:', {
        bookCount: this.bibleData.length,
        firstBook: this.bibleData[0]?.abbrev,
        lastBook: this.bibleData[this.bibleData.length - 1]?.abbrev
      });

      // Build search index during initialization
      await this.buildSearchIndex();

      this.initialized = true;
      this.initializationError = null;
    } catch (error) {
      console.error('Failed to initialize Bible service:', error);
      this.initializationError = error as Error;
      throw error;
    }
  }

  private async buildSearchIndex() {
    console.log('Building search index...');
    
    this.bibleData.forEach((book: any) => {
      book.chapters.forEach((chapter: any, chapterIndex: number) => {
        chapter.forEach((verse: any, verseIndex: number) => {
          // Create tokens from the verse
          const tokens = verse.toLowerCase().split(/\s+/);
          
          // Add each word to the search index
          tokens.forEach(token => {
            if (token.length > 2) { // Skip very short words
              const references = this.searchIndex.get(token) || new Set();
              references.add(`${book.abbrev}|${chapterIndex + 1}|${verseIndex + 1}|${verse}`);
              this.searchIndex.set(token, references);
            }
          });
        });
      });
    });
    
    console.log('Search index built');
  }

  // Add method to check initialization status
  getInitializationStatus() {
    return {
      initialized: this.initialized,
      error: this.initializationError
    };
  }

  async getVerse(book: string, chapter: number, verse: number) {
    await this.initialize();

    try {
      if (chapter <= 0 || verse <= 0) {
        throw new Error('Invalid chapter or verse number');
      }

      const bookData = this.bibleData.find((b: any) => 
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
      
      const bookData = this.bibleData.find((b: any) => 
        b.abbrev.toLowerCase() === book.toLowerCase()
      );
      
      console.log('Found book:', bookData?.abbrev);
      
      if (!bookData) throw new Error('Book not found');
      
      const chapter = bookData.chapters[chapterNum - 1];
      if (!chapter) throw new Error('Chapter not found');

      console.log(`Chapter ${chapterNum} found with ${chapter.length} verses`);
      console.log('First 3 verses:', chapter.slice(0, 3));

      const verses = chapter.map((text: any, index: number) => ({
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

  async searchText(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    if (searchWords.length === 0) return results;

    // Get matching references for the first word
    const firstWordMatches = this.searchIndex.get(searchWords[0]) || new Set();
    
    // Convert to array for processing
    const potentialMatches = Array.from(firstWordMatches);
    
    for (const reference of potentialMatches) {
      const [book, chapter, verse, text] = reference.split('|');
      
      // Check if all search words are present in the verse
      const matchesAllWords = searchWords.every(word => 
        text.toLowerCase().includes(word)
      );
      
      if (matchesAllWords) {
        results.push({
          book,
          chapter: parseInt(chapter),
          verse: parseInt(verse),
          text,
          matchIndex: text.toLowerCase().indexOf(searchWords[0]),
          keyword: query
        });
      }
      
      // Limit results for better performance
      if (results.length >= 100) break;
    }

    return results;
  }

  async findRelatedWords(keyword: string): Promise<string[]> {
    const lowercaseKeyword = keyword.toLowerCase();
    return this.wordRelations[lowercaseKeyword] || [];
  }

  // Helper method to get book abbreviation from full name
  getBookAbbrev(fullName: string): string {
    const bookMap: { [key: string]: string } = {
      // Old Testament
      'genesis': 'gn',
      'exodus': 'ex',
      'leviticus': 'lv',
      'numbers': 'nm',
      'deuteronomy': 'dt',
      'joshua': 'js',
      'judges': 'jg',
      'ruth': 'rt',
      '1 samuel': '1sm',
      '2 samuel': '2sm',
      '1 kings': '1kg',
      '2 kings': '2kg',
      '1 chronicles': '1ch',
      '2 chronicles': '2ch',
      'ezra': 'ez',
      'nehemiah': 'nh',
      'esther': 'et',
      'job': 'jb',
      'psalms': 'ps',
      'proverbs': 'pr',
      'ecclesiastes': 'ec',
      'song of solomon': 'ss',
      'isaiah': 'is',
      'jeremiah': 'jr',
      'lamentations': 'lm',
      'ezekiel': 'ez',
      'daniel': 'dn',
      'hosea': 'hs',
      'joel': 'jl',
      'amos': 'am',
      'obadiah': 'ob',
      'jonah': 'jn',
      'micah': 'mc',
      'nahum': 'nm',
      'habakkuk': 'hb',
      'zephaniah': 'zp',
      'haggai': 'hg',
      'zechariah': 'zc',
      'malachi': 'ml',
      
      // New Testament
      'matthew': 'mt',
      'mark': 'mk',
      'luke': 'lk',
      'john': 'jn',
      'acts': 'ac',
      'romans': 'rm',
      '1 corinthians': '1cr',
      '2 corinthians': '2cr',
      'galatians': 'gl',
      'ephesians': 'ep',
      'philippians': 'ph',
      'colossians': 'cl',
      '1 thessalonians': '1th',
      '2 thessalonians': '2th',
      '1 timothy': '1tm',
      '2 timothy': '2tm',
      'titus': 'tt',
      'philemon': 'pm',
      'hebrews': 'hb',
      'james': 'jm',
      '1 peter': '1pt',
      '2 peter': '2pt',
      '1 john': '1jn',
      '2 john': '2jn',
      '3 john': '3jn',
      'jude': 'jd',
      'revelation': 'rv'
    };
    
    return bookMap[fullName.toLowerCase()] || fullName.toLowerCase();
  }

  // Add this method to BibleService class
  async getTotalChapters(book: string): Promise<number> {
    await this.initialize();
    const bookData = this.bibleData.find((b: any) => 
      b.abbrev.toLowerCase() === book.toLowerCase()
    );
    return bookData?.chapters.length || 0;
  }

  // Add these methods to BibleService class
  async getNextBook(currentAbbrev: string): Promise<BibleBook | undefined> {
    await this.initialize();
    const currentIndex = this.bibleData.findIndex(b => b.abbrev === currentAbbrev);
    return this.bibleData[currentIndex + 1];
  }

  async getPrevBook(currentAbbrev: string): Promise<BibleBook | undefined> {
    await this.initialize();
    const currentIndex = this.bibleData.findIndex(b => b.abbrev === currentAbbrev);
    return this.bibleData[currentIndex - 1];
  }

  getBibleData() {
    return this.bibleData;
  }
}

export const bibleService = new BibleService();