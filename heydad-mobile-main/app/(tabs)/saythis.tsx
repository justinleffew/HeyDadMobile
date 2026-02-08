import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'hooks/useAuth';
import { supabase } from 'utils/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { parsePocketDad, PocketDadAnswer } from 'utils/parsePocketDad';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  answer?: PocketDadAnswer | null;
  timestamp: number;
};

type ChildInfo = {
  id: string;
  name: string;
  birthdate?: string;
};

const STORAGE_KEY = 'dadchat:messages';
const API_URL = 'https://heydad.pro/api/pocket-dad';

function calculateAge(birthdate: string): number {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

export default function DadChatScreen() {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildInfo | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-gray-100' : 'text-slate-800';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-white';

  // Load children on mount
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('children')
        .select('id,name,birthdate')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (data) {
        setChildren(data);
        if (data.length === 1) setSelectedChild(data[0]);
      }
    })();
  }, [user?.id]);

  // Load saved messages on mount
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(`${STORAGE_KEY}:${user.id}`);
        if (saved) setMessages(JSON.parse(saved));
      } catch {
        // ignore load errors
      }
    })();
  }, [user?.id]);

  // Save messages when they change
  const saveMessages = useCallback(
    async (msgs: ChatMessage[]) => {
      if (!user?.id) return;
      try {
        // Keep last 50 messages to avoid bloating storage
        const toSave = msgs.slice(-50);
        await AsyncStorage.setItem(`${STORAGE_KEY}:${user.id}`, JSON.stringify(toSave));
      } catch {
        // ignore save errors
      }
    },
    [user?.id],
  );

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => {
      const next = [...prev, userMsg];
      saveMessages(next);
      return next;
    });
    setInput('');
    setLoading(true);

    // Scroll to bottom after adding user message
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      abortRef.current = new AbortController();

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const childPayload = selectedChild
        ? {
            name: selectedChild.name,
            age_years: selectedChild.birthdate
              ? calculateAge(selectedChild.birthdate)
              : null,
          }
        : null;

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: trimmed,
          prompt_details: { raw: trimmed, trimmed },
          tone: 'direct',
          tone_intensity: 'baseline',
          child: childPayload,
          situation: null,
          context: {
            location: null,
            urgency: null,
            tried_strategies: [],
            recent_topics: [],
            parenting_style: null,
          },
          user_id: user?.id || null,
          persona: null,
          child_id: selectedChild?.id || null,
          metadata: {},
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }

      const data = await res.json();
      let answer: PocketDadAnswer | null = null;
      let textContent = '';

      try {
        if (data?.message) {
          answer = parsePocketDad(data.message);
          // Build readable text from the structured answer
          const parts: string[] = [];
          if (answer.primaryAction) {
            parts.push(answer.primaryAction.title);
            if (answer.primaryAction.script) {
              parts.push(`\nSay this: "${answer.primaryAction.script}"`);
            }
            if (answer.primaryAction.content.length) {
              parts.push('\n' + answer.primaryAction.content.map((c) => `  - ${c}`).join('\n'));
            }
          }
          if (answer.alternatives.length) {
            parts.push('\nAlternatives:');
            answer.alternatives.forEach((alt) => {
              parts.push(`\n${alt.title}`);
              if (alt.script) parts.push(`  Say: "${alt.script}"`);
              if (alt.content.length) {
                parts.push(alt.content.map((c) => `  - ${c}`).join('\n'));
              }
            });
          }
          if (answer.insights.length) {
            parts.push('\nWhy this works:');
            answer.insights.forEach((i) => parts.push(`  - ${i}`));
          }
          textContent = parts.join('\n');
        }
      } catch {
        textContent = data?.message || 'Sorry, I had trouble understanding the response. Please try again.';
      }

      const assistantMsg: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: textContent || 'Sorry, I couldn\'t generate a response. Please try again.',
        answer,
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const next = [...prev, assistantMsg];
        saveMessages(next);
        return next;
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const errorMsg: ChatMessage = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: 'Something went wrong. Please check your connection and try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, errorMsg];
        saveMessages(next);
        return next;
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [input, loading, selectedChild, user?.id, saveMessages]);

  const clearChat = useCallback(() => {
    Alert.alert('Clear Chat', 'Are you sure you want to clear all messages?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMessages([]);
          if (user?.id) {
            AsyncStorage.removeItem(`${STORAGE_KEY}:${user.id}`);
          }
        },
      },
    ]);
  }, [user?.id]);

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === 'user';
      return (
        <View className={`mx-4 mb-3 ${isUser ? 'items-end' : 'items-start'}`}>
          <View
            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-slate-700 rounded-br-md'
                : `${cardBg} border ${borderColor} rounded-bl-md`
            }`}
          >
            <Text
              className={`text-base leading-6 ${isUser ? 'text-white' : textPrimary}`}
              selectable
            >
              {item.content}
            </Text>
          </View>
          <Text className={`text-xs mt-1 mx-1 ${textSecondary}`}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
      );
    },
    [cardBg, borderColor, textPrimary, textSecondary],
  );

  const renderEmptyState = useCallback(() => (
    <View className="flex-1 items-center justify-center px-8 pt-20">
      <View
        className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${
          isDark ? 'bg-gray-800' : 'bg-slate-100'
        }`}
      >
        <Ionicons name="chatbubbles-outline" size={36} color="#c4a471" />
      </View>
      <Text className={`text-2xl font-merriweather text-center mb-3 ${textPrimary}`}>
        Dad Chat
      </Text>
      <Text className={`text-base text-center leading-6 mb-8 ${textSecondary}`}>
        Ask anything about being a dad. Get help with activities, tough moments, or just talk it out.
      </Text>
      <View className="w-full gap-3">
        {[
          'What are fun rainy day activities for a 5 year old?',
          'How do I talk to my kid about a bully at school?',
          "My toddler won't eat vegetables. Help!",
        ].map((suggestion) => (
          <TouchableOpacity
            key={suggestion}
            onPress={() => setInput(suggestion)}
            className={`rounded-xl border px-4 py-3 ${borderColor} ${cardBg}`}
            activeOpacity={0.7}
          >
            <Text className={`text-sm ${textSecondary}`}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [isDark, textPrimary, textSecondary, borderColor, cardBg]);

  return (
    <SafeAreaView className={`flex-1 ${bg}`} edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className={`flex-row items-center justify-between px-4 py-3 border-b ${borderColor}`}>
          <View className="flex-1">
            <Text className={`text-xl font-merriweather ${textPrimary}`}>Dad Chat</Text>
            {selectedChild ? (
              <Text className={`text-xs ${textSecondary}`}>
                Chatting about {selectedChild.name}
              </Text>
            ) : null}
          </View>

          {/* Child selector */}
          {children.length > 0 ? (
            <View className="flex-row items-center mr-2">
              {children.map((child) => {
                const isSelected = selectedChild?.id === child.id;
                return (
                  <TouchableOpacity
                    key={child.id}
                    onPress={() => setSelectedChild(isSelected ? null : child)}
                    className={`ml-1 px-3 py-1.5 rounded-full border ${
                      isSelected ? 'bg-[#c59a5f] border-[#c59a5f]' : borderColor
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${isSelected ? 'text-white' : textSecondary}`}
                    >
                      {child.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {messages.length > 0 ? (
            <TouchableOpacity onPress={clearChat} className="p-2">
              <Ionicons name="trash-outline" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingVertical: 16,
            flexGrow: messages.length === 0 ? 1 : undefined,
          }}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          keyboardShouldPersistTaps="handled"
        />

        {/* Loading indicator */}
        {loading ? (
          <View className="flex-row items-center px-6 py-2">
            <ActivityIndicator size="small" color="#c4a471" />
            <Text className={`ml-2 text-sm ${textSecondary}`}>Thinking...</Text>
          </View>
        ) : null}

        {/* Input */}
        <View className={`px-4 py-3 border-t ${borderColor} ${bg}`}>
          <View className={`flex-row items-end rounded-2xl border ${borderColor} ${inputBg}`}>
            <TextInput
              className={`flex-1 px-4 py-3 text-base max-h-24 ${textPrimary}`}
              placeholder="Ask me anything about being a dad..."
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              value={input}
              onChangeText={setInput}
              multiline
              returnKeyType="default"
              editable={!loading}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!input.trim() || loading}
              className={`m-1.5 w-10 h-10 rounded-full items-center justify-center ${
                input.trim() && !loading ? 'bg-slate-700' : isDark ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={input.trim() && !loading ? 'white' : isDark ? '#6b7280' : '#9ca3af'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
