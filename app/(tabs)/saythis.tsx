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
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ProtectedRoute already wraps in SafeAreaView — no need for useSafeAreaInsets here
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
  image_path?: string | null;
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
  const [childAvatars, setChildAvatars] = useState<Record<string, string | null>>({});
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
        .select('id,name,birthdate,image_path')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (data) {
        setChildren(data);
        if (data.length === 1) setSelectedChild(data[0]);
        // Build avatar URLs
        const avatarMap: Record<string, string | null> = {};
        for (const kid of data) {
          if (kid.image_path) {
            try {
              const { data: urlData, error } = await supabase.storage
                .from('child-images')
                .createSignedUrl(kid.image_path, 3600);
              avatarMap[kid.id] = error ? null : urlData?.signedUrl ?? null;
            } catch {
              avatarMap[kid.id] = null;
            }
          } else {
            avatarMap[kid.id] = null;
          }
        }
        setChildAvatars(avatarMap);
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

    let timeoutId: ReturnType<typeof setTimeout>;
    try {
      abortRef.current = new AbortController();
      timeoutId = setTimeout(() => abortRef.current?.abort(), 30000);

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
        content: `Something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}. Please check your connection and try again.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, errorMsg];
        saveMessages(next);
        return next;
      });
    } finally {
      clearTimeout(timeoutId!);
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
    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: '20%', alignItems: 'center' }}>
      {/* Logo mark — centered */}
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: isDark ? '#1f2937' : '#F5F0E8',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 48, height: 48 }}
          resizeMode="contain"
        />
      </View>

      {/* Header — centered */}
      <Text style={{ fontSize: 22, fontWeight: '600', color: isDark ? '#f3f4f6' : '#1B2838', marginBottom: 8, textAlign: 'center' }}>
        What's on your mind, Dad?
      </Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 20, textAlign: 'center' }}>
        Ask anything about being a dad. Get help with activities, tough moments, or just talk it out.
      </Text>

      {/* Suggestion pills — left aligned, warm tint */}
      <View style={{ gap: 10 }}>
        {[
          'What are fun rainy day activities for a 5 year old?',
          'How do I talk to my kid about a bully at school?',
          "My toddler won't eat vegetables. Help!",
        ].map((suggestion) => (
          <TouchableOpacity
            key={suggestion}
            onPress={() => setInput(suggestion)}
            activeOpacity={0.7}
            style={{
              backgroundColor: isDark ? '#1f2937' : '#FBF7F0',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderLeftWidth: 2,
              borderLeftColor: '#D4A853',
              borderWidth: 1,
              borderColor: isDark ? '#374151' : '#f0ebe3',
            }}
          >
            <Text style={{ fontSize: 14, color: isDark ? '#d1d5db' : '#1B2838' }}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [isDark]);

  return (
    <View className={`flex-1 ${bg}`}>
        {/* Header — no extra paddingTop since ProtectedRoute already wraps in SafeAreaView */}
        <View className={`flex-row items-center justify-between px-4 pb-2 border-b ${borderColor}`}>
          <View style={{ flexShrink: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: 28, fontWeight: '700', color: isDark ? '#f3f4f6' : '#1B2838' }}>Dad Chat</Text>
          </View>

          {/* Child selector — avatar chips */}
          {children.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, marginHorizontal: 8 }} contentContainerStyle={{ alignItems: 'center' }}>
              {children.map((child) => {
                const isSelected = selectedChild?.id === child.id;
                const avatarUrl = childAvatars[child.id];
                return (
                  <TouchableOpacity
                    key={child.id}
                    onPress={() => setSelectedChild(isSelected ? null : child)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginLeft: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#D4A853' : (isDark ? '#374151' : '#d1d5db'),
                      backgroundColor: isSelected ? (isDark ? 'rgba(212,168,83,0.15)' : 'rgba(212,168,83,0.08)') : 'transparent',
                    }}
                  >
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={{ width: 28, height: 28, borderRadius: 14, marginRight: 6 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: '#1B2838',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 6,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                          {child.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: isSelected ? '#D4A853' : (isDark ? '#9ca3af' : '#6b7280'),
                      }}
                    >
                      {child.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {messages.length > 0 ? (
            <TouchableOpacity onPress={clearChat} className="p-2">
              <Ionicons name="trash-outline" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Chat content — KeyboardAvoidingView wraps ONLY messages + input, NOT header */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
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
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: isDark ? '#374151' : '#e5e7eb',
              backgroundColor: isDark ? '#111827' : '#ffffff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View className={`flex-row items-end rounded-2xl border ${borderColor} ${inputBg}`} style={{ minHeight: 52 }}>
              <TextInput
                className={`flex-1 px-4 py-3 text-base max-h-24 ${textPrimary}`}
                style={{ textAlignVertical: 'center' }}
                placeholder="What's on your mind?"
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
                style={{
                  margin: 6,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: input.trim() && !loading
                    ? '#D4A853'
                    : isDark ? '#374151' : '#e5e7eb',
                }}
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={input.trim() && !loading ? '#fff' : isDark ? '#6b7280' : '#9ca3af'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
    </View>
  );
}
