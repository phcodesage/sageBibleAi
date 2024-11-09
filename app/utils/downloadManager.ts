import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { bibleBooks } from '../constants/bible-books';

const BIBLE_STORAGE_KEY = 'bible_data_downloaded';
const BIBLE_DIR = `${FileSystem.documentDirectory}bible/`;

interface DownloadProgress {
  totalBooks: number;
  currentBook: string;
  currentChapter: number;
  processedBooks: number;
  percent: number;
}

export const DownloadManager = {
  async checkPermissions(): Promise<boolean> {
    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      return permissions.granted;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  },

  async checkIfBibleDownloaded(): Promise<boolean> {
    try {
      const downloaded = await AsyncStorage.getItem(BIBLE_STORAGE_KEY);
      if (downloaded === 'true') {
        const dirInfo = await FileSystem.getInfoAsync(BIBLE_DIR);
        return dirInfo.exists;
      }
      return false;
    } catch (error) {
      console.error('Error checking Bible data:', error);
      return false;
    }
  },

  async downloadBible(
    onProgress?: (progress: DownloadProgress) => void,
    onComplete?: () => void
  ): Promise<void> {
    try {
      // Create bible directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(BIBLE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(BIBLE_DIR);
      }

      const totalBooks = bibleBooks.length;
      let processedBooks = 0;

      for (const book of bibleBooks) {
        let chapter = 1;
        let hasMoreChapters = true;

        while (hasMoreChapters) {
          try {
            const response = await fetch(
              `https://bible-api.com/${book} ${chapter}?translation=web`
            );
            const data = await response.json();

            if (data.verses && data.verses.length > 0) {
              // Save chapter data
              const filename = `${book}_${chapter}.json`;
              const path = BIBLE_DIR + filename;
              await FileSystem.writeAsStringAsync(path, JSON.stringify(data));
              chapter++;

              // Update progress
              onProgress?.({
                totalBooks,
                currentBook: book,
                currentChapter: chapter,
                processedBooks,
                percent: (processedBooks / totalBooks) * 100
              });
            } else {
              hasMoreChapters = false;
            }
          } catch (error) {
            console.error(`Error downloading ${book} ${chapter}:`, error);
            hasMoreChapters = false;
          }

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        processedBooks++;
      }

      await AsyncStorage.setItem(BIBLE_STORAGE_KEY, 'true');
      onComplete?.();
    } catch (error) {
      console.error('Error downloading Bible:', error);
      Alert.alert(
        'Download Error',
        'Failed to download Bible data. Please check your internet connection and try again.'
      );
    }
  },

  async loadChapter(book: string, chapter: number): Promise<any> {
    try {
      const filename = `${book}_${chapter}.json`;
      const path = BIBLE_DIR + filename;
      const content = await FileSystem.readAsStringAsync(path);
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error loading chapter ${book} ${chapter}:`, error);
      return null;
    }
  }
}; 