import React, { useState } from 'react';
import { View, Pressable, StyleSheet, LayoutAnimation } from 'react-native';
import { Text } from './Text';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '../constants/Colors';

interface CollapsibleProps {
  title?: string;
  children?: React.ReactNode;
}

export function Collapsible({ title = 'Section', children }: CollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={toggleExpand} style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <FontAwesome
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.primary}
        />
      </Pressable>
      {isExpanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    backgroundColor: '#fff',
    marginVertical: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
}); 