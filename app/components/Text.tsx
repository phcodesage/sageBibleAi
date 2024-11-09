import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';

interface BibleTextProps extends TextProps {
  variant?: 'verse' | 'chapter' | 'book' | 'regular' | 'verseNumber';
}

export function Text({ style, variant = 'regular', children, ...props }: BibleTextProps) {
  const [fontsLoaded] = useFonts({
    'Crimson-Roman': require('../../assets/fonts/Crimson-Roman.ttf'),
    'Crimson-Italic': require('../../assets/fonts/Crimson-Italic.ttf'),
  });

  if (!fontsLoaded) {
    return <RNText {...props}>{children}</RNText>;
  }

  return (
    <RNText 
      style={[
        styles.base,
        variant === 'verse' && styles.verse,
        variant === 'chapter' && styles.chapter,
        variant === 'book' && styles.book,
        variant === 'verseNumber' && styles.verseNumber,
        style
      ]} 
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: 'Crimson-Roman',
    fontSize: 24,
    lineHeight: 36,
    color: '#2B2B2B',
  },
  verse: {
    fontSize: 24,
    lineHeight: 36,
  },
  verseNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B22222',
    marginRight: 8,
    marginLeft: 8,
  },
  chapter: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 16,
  },
  book: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
}); 