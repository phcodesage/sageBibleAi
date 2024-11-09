import { useState, useRef } from 'react';
import { StyleSheet, TextInput, FlatList, Pressable, View } from 'react-native';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '../constants/Colors';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  references?: string[];
}

export default function AIChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // TODO: Implement AI response logic here
    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      text: "I'm processing your question about the Bible...",
      isUser: false,
      references: ['John 3:16', 'Romans 8:28'],
    };

    setMessages((prev) => [...prev, aiResponse]);
    flatListRef.current?.scrollToEnd();
  };

  return (
    <Screen>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.message, item.isUser ? styles.userMessage : styles.aiMessage]}>
            <Text style={styles.messageText}>{item.text}</Text>
            {item.references && (
              <View style={styles.references}>
                {item.references.map((ref: string) => (
                  <Text key={ref} style={styles.reference}>{ref}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about the Bible..."
          multiline
        />
        <Pressable onPress={handleSend} style={styles.sendButton}>
          <FontAwesome name="send" size={20} color={Colors.primary} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  message: {
    margin: 8,
    padding: 12,
    borderRadius: 8,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
  },
  references: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reference: {
    fontSize: 12,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
}); 