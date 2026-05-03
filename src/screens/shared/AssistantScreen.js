import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Button, Card } from '../../components/UI';
import { requestJson } from '../../config/api';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

const STARTER_PROMPTS = {
  CUSTOMER: [
    'Show my upcoming bookings',
    'What ritual types are available?',
    'Summarize my recent orders',
  ],
  PERFORMER: [
    'Show my latest bookings',
    'Summarize my availability',
    'Which rituals am I scheduled for?',
  ],
  SUPPLIER: [
    'Show pending purchase orders',
    'Summarize stock requests',
    'What supplied products do we have?',
  ],
  DRIVER: [
    'Show my current assignments',
    'Summarize vehicle status',
    'What maintenance records exist?',
  ],
  INVENTORY_MANAGER: [
    'What items are low in stock?',
    'Summarize stock requests',
    'Show product and category counts',
  ],
  ADMIN: [
    'Give me a system summary',
    'How many bookings and orders exist?',
    'Summarize inventory and suppliers',
  ],
};

export default function AssistantScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hi ${user?.name || 'there'}, I can answer questions using your Thowil app data.`,
    },
  ]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const starters = useMemo(() => {
    const role = `${user?.roleName || 'CUSTOMER'}`.toUpperCase();
    return STARTER_PROMPTS[role] || STARTER_PROMPTS.CUSTOMER;
  }, [user?.roleName]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  const sendMessage = async (prefilledText) => {
    const nextText = `${prefilledText ?? draft}`.trim();
    if (!nextText || sending) return;

    const nextUserMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: nextText,
    };

    const historyForApi = messages
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .map((item) => ({ role: item.role, text: item.text }));

    setMessages((current) => [...current, nextUserMessage]);
    setDraft('');
    setSending(true);
    scrollToBottom();

    try {
      const response = await requestJson('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: nextText,
          history: historyForApi,
          user,
        }),
        timeoutMs: 30000,
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: response.reply,
        },
      ]);
      scrollToBottom();
    } catch (error) {
      Alert.alert('Assistant Unavailable', error.message);
      setMessages((current) => current.filter((item) => item.id !== nextUserMessage.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>AI Assistant</Text>
        <Text style={styles.heroSub}>Ask about bookings, stock, products, suppliers, or your role-specific data.</Text>
      </View>

      <View style={styles.starterWrap}>
        {starters.map((prompt) => (
          <TouchableOpacity key={prompt} style={styles.starterChip} onPress={() => sendMessage(prompt)} disabled={sending}>
            <Text style={styles.starterText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContent}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant]}>
            <Card style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.messageLabel, item.role === 'user' ? styles.userLabel : styles.assistantLabel]}>
                {item.role === 'user' ? 'You' : 'Assistant'}
              </Text>
              <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
                {item.text}
              </Text>
            </Card>
          </View>
        )}
        onContentSizeChange={scrollToBottom}
      />

      <View style={styles.composerWrap}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask anything about the app data..."
          placeholderTextColor={COLORS.gray400}
          style={styles.input}
          multiline
        />
        <Button
          title={sending ? 'Sending...' : 'Send'}
          onPress={() => sendMessage()}
          disabled={sending || !draft.trim()}
          style={styles.sendButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  hero: {
    backgroundColor: COLORS.maroon,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  heroTitle: { fontSize: 24, ...FONTS.bold, color: COLORS.white },
  heroSub: { marginTop: 4, fontSize: 13, color: COLORS.lightGold, lineHeight: 18 },
  starterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  starterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOW.sm,
  },
  starterText: { fontSize: 12, color: COLORS.maroon, ...FONTS.medium },
  chatContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  messageRow: { width: '100%', marginBottom: SPACING.sm },
  messageRowUser: { alignItems: 'flex-end' },
  messageRowAssistant: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '88%', padding: SPACING.md },
  userBubble: { backgroundColor: COLORS.maroon },
  assistantBubble: { backgroundColor: COLORS.white },
  messageLabel: { fontSize: 12, ...FONTS.semibold, marginBottom: 6 },
  userLabel: { color: COLORS.lightGold },
  assistantLabel: { color: COLORS.maroon },
  messageText: { fontSize: 14, lineHeight: 20 },
  userText: { color: COLORS.white },
  assistantText: { color: COLORS.dark },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  input: {
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark,
    backgroundColor: COLORS.white,
    textAlignVertical: 'top',
  },
  sendButton: { alignSelf: 'flex-end', minWidth: 120 },
});
