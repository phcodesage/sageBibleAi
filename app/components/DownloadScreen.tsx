import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from './Text';
import { Screen } from './Screen';
import Colors from '../constants/Colors';
import { DownloadManager } from '../utils/downloadManager';

interface DownloadScreenProps {
  onComplete: () => void;
}

export function DownloadScreen({ onComplete }: DownloadScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentBook, setCurrentBook] = useState('');
  const [currentChapter, setCurrentChapter] = useState(0);
  const [status, setStatus] = useState('Checking permissions...');

  React.useEffect(() => {
    initializeDownload();
  }, []);

  async function initializeDownload() {
    const hasPermission = await DownloadManager.checkPermissions();
    if (!hasPermission) {
      setStatus('Storage permission denied');
      return;
    }

    setStatus('Downloading Bible data...');
    await DownloadManager.downloadBible(
      (progress) => {
        setProgress(progress.percent);
        setCurrentBook(progress.currentBook);
        setCurrentChapter(progress.currentChapter);
        setStatus(`Downloading ${progress.currentBook} chapter ${progress.currentChapter}`);
      },
      () => {
        setStatus('Download complete!');
        onComplete();
      }
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.status}>{status}</Text>
        {progress > 0 && (
          <>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {progress.toFixed(1)}% Complete
            </Text>
            <Text style={styles.bookInfo}>
              {currentBook} - Chapter {currentChapter}
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  status: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  progressContainer: {
    width: '80%',
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.light.primary,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.light.primary,
  },
  bookInfo: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
}); 