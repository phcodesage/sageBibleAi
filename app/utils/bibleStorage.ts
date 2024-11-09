import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { bibleBooks } from '../constants/bible-books';

const BIBLE_DIR = `${FileSystem.documentDirectory}bible/`;
const LAST_UPDATE_KEY = 'bible_last_update';

interface BibleChapter {
  book: string;
  chapter: number;
  verses: any[];
}

export const BibleStorage = {
  async init() {
    try {
      // Create bible directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(BIBLE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(BIBLE_DIR);
      }

      const lastUpdate = await AsyncStorage.getItem(LAST_UPDATE_KEY);
      const shouldUpdate = !lastUpdate || 
        Date.now() - parseInt(lastUpdate) > 7 * 24 * 60 * 60 * 1000; // 1 week

      if (shouldUpdate) {
        await this.downloadFullBible();
      }
    } catch (error) {
      console.error('Error initializing bible storage:', error);
    }
  },

  async downloadFullBible() {
    try {
      for (const book of bibleBooks) {
        // Assuming each book has maximum 150 chapters
        for (let chapter = 1; chapter <= 150; chapter++) {
          try {
            const response = await fetch(
              `https://bible-api.com/${book} ${chapter}?translation=web`
            );
            const data = await response.json();
            
            if (data.verses && data.verses.length > 0) {
              await this.saveChapter(book, chapter, data);
            } else {
              // No more chapters in this book
              break;
            }
          } catch (error) {
            // Skip failed chapters
            console.error(`Error downloading ${book} ${chapter}:`, error);
            break;
          }
        }
      }
      await AsyncStorage.setItem(LAST_UPDATE_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error downloading bible:', error);
    }
  },

  async saveChapter(book: string, chapter: number, data: any) {
    const filename = `${book}_${chapter}.json`;
    const path = BIBLE_DIR + filename;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data));
  },

  async getChapter(book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      const filename = `${book}_${chapter}.json`;
      const path = BIBLE_DIR + filename;
      const content = await FileSystem.readAsStringAsync(path);
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading chapter ${book} ${chapter}:`, error);
      return null;
    }
  },

  async searchOffline(query: string): Promise<any[]> {
    const results = [];
    const files = await FileSystem.readDirectoryAsync(BIBLE_DIR);
    
    for (const file of files) {
      const content = await FileSystem.readAsStringAsync(BIBLE_DIR + file);
      const data = JSON.parse(content);
      
      if (data.text.toLowerCase().includes(query.toLowerCase())) {
        results.push(data);
      }
    }
    
    return results;
  }
}; 