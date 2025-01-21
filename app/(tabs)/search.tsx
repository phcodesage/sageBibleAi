import React, { useState, useCallback } from 'react';
import { StyleSheet, TextInput, FlatList, Pressable } from 'react-native';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { useBible } from '../context/BibleContext';
import { useRouter } from 'expo-router';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { SearchResult } from '../types/bible';
import { debounce } from 'lodash';

export default function SearchScreen() {
  const router = useRouter();
  const { search } = useBible();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (text: string) => {
      if (text.length >= 2) {
        const searchResults = await search(text);
        setResults(searchResults);
      } else {
        setResults([]);
      }
    }, 300),
    []
  );

  const handleSearch = (text: string) => {
    setQuery(text);
    debouncedSearch(text);
  };

  // ... rest of the component remains the same
} 