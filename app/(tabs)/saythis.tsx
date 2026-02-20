import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from 'hooks/useAuth';
import { supabase } from 'utils/supabase';
import { useTheme } from '../../providers/ThemeProvider';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

type ChildInfo = {
  id: string;
  name: string;
  birthdate?: string;
  image_path?: string | null;
};

const STORAGE_KEY = 'dadchat:messages';

const DAD_MENTOR_PROMPT = `You are a dad mentor talking to a FATHER — an adult man — who needs advice about his kids. You are NOT talking to the child. Never address the child directly. Never say "Hey [child name], let's..." — the child is not in this conversation.

When the dad mentions a child's name or selects a child, use that name to personalize YOUR ADVICE TO THE DAD. Example: if the dad selects Walker and asks about rainy days, say something like "Walker's at a great age for fort building — grab every blanket in the house and let him be the architect. He'll be busy for an hour." Do NOT say "Hey Walker, let's make art together!"

Keep responses to 2-4 sentences. Be conversational, direct, and practical. No bullet points. No headers. Talk like a real dad friend, not a parenting encyclopedia.`;

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
  const insets = useSafeAreaInsets();
  // Tab bar height (60px from _layout.tsx) + bottom safe area inset
  const TAB_BAR_HEIGHT = 60;
  const keyboardOffset = TAB_BAR_HEIGHT + insets.bottom;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildInfo | null>(null);
  const [childAvatars, setChildAvatars] = useState<Record<string, string | null>>({});
  const flatListRef = useRef<FlatList>(null);

  // Scroll to bottom when keyboard opens so user sees latest messages + input
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      if (messages.length > 0) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
    return () => sub.remove();
  }, [messages.length]);

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
      const childPayload = selectedChild
        ? {
            name: selectedChild.name,
            age_years: selectedChild.birthdate
              ? calculateAge(selectedChild.birthdate)
              : null,
          }
        : null;

      // Build child context for the system prompt
      let systemPrompt = DAD_MENTOR_PROMPT;
      if (selectedChild) {
        const agePart = selectedChild.birthdate
          ? ` who is ${calculateAge(selectedChild.birthdate)} years old`
          : '';
        systemPrompt += `\n\nThe dad is asking about his child named ${selectedChild.name}${agePart}. Use ${selectedChild.name}'s name when giving advice TO THE DAD. Remember: you are coaching the dad — never address ${selectedChild.name} directly.`;
      }

      // Build recent conversation history for context (last 10 messages)
      const recentMessages = [...messages, userMsg].slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const requestBody = {
        prompt: trimmed,
        child: childPayload,
        tone: 'conversational',
        user_id: user?.id || null,
        child_id: selectedChild?.id || null,
        system_prompt: systemPrompt,
        conversation_history: recentMessages,
        format: 'plain_text',
      };

      // Debug: log the full request payload sent to the AI
      console.log('=== [DadChat] FULL REQUEST TO pocket-dad ===');
      console.log('[DadChat] system_prompt:', systemPrompt);
      console.log('[DadChat] conversation_history:', JSON.stringify(recentMessages, null, 2));
      console.log('[DadChat] child:', JSON.stringify(childPayload));
      console.log('[DadChat] prompt:', trimmed);
      console.log('[DadChat] full requestBody:', JSON.stringify(requestBody, null, 2));
      console.log('=== [DadChat] END REQUEST ===');

      const invokePromise = supabase.functions.invoke('pocket-dad', {
        body: requestBody,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Request timed out. Please try again.')),
          30000
        );
      });

      const { data, error: invokeError } = await Promise.race([
        invokePromise,
        timeoutPromise,
      ]);

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to get response');
      }

      // Debug: log the full response from the Edge Function
      console.log('=== [DadChat] RESPONSE FROM pocket-dad ===');
      console.log('[DadChat] raw data:', JSON.stringify(data));
      if (data?.message && /hey\s+\w+,?\s+let/i.test(data.message)) {
        console.warn('[DadChat] WARNING: Response appears to address the CHILD directly! The pocket-dad Edge Function may be ignoring the system_prompt field. Check the Edge Function code in Supabase.');
      }
      console.log('=== [DadChat] END RESPONSE ===');

      // Extract plain text response — handle both plain text and legacy JSON formats
      let textContent = '';
      if (data?.message) {
        const raw = data.message;
        // If the response is JSON (legacy edge function), extract the conversational bits
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            // Legacy structured response — extract primary action content only
            const primary = parsed.primaryAction || parsed.primary_action || parsed.primary;
            if (primary) {
              const parts: string[] = [];
              if (primary.script) parts.push(primary.script);
              else if (primary.title) parts.push(primary.title);
              if (primary.content && Array.isArray(primary.content) && primary.content.length) {
                parts.push(primary.content[0]);
              }
              textContent = parts.join(' ');
            }
            if (!textContent) {
              // Fallback: just grab any string value
              textContent = raw;
            }
          }
        } catch {
          // Not JSON — it's plain text, which is what we want
          textContent = raw;
        }
      }

      const assistantMsg: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: textContent || "Sorry, I couldn't generate a response. Please try again.",
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const next = [...prev, assistantMsg];
        saveMessages(next);
        return next;
      });
    } catch (err: unknown) {
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
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [input, loading, selectedChild, user?.id, messages, saveMessages]);

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
        {(selectedChild
          ? [
              `What should I do with ${selectedChild.name} on a rainy day?`,
              `${selectedChild.name} won't listen to me lately. What do I do?`,
              `What's a good bedtime routine for ${selectedChild.name}?`,
            ]
          : [
              'My kid had a meltdown at the store. What do I do next time?',
              'Rainy day — need something fun to do with the kids.',
              "My toddler won't eat vegetables. Help!",
            ]
        ).map((suggestion) => (
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
  ), [isDark, selectedChild]);

  return (
    <View className={`flex-1 ${bg}`}>
        {/* Header — title row + children chips row */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb' }}>
          {/* Top row: Title + Clear button */}
          <View style={{ position: 'relative', paddingHorizontal: 16, paddingBottom: 6 }}>
            <Text numberOfLines={1} style={{ fontSize: 28, fontWeight: '700', color: isDark ? '#f3f4f6' : '#1B2838', textAlign: 'center' }}>Dad Chat</Text>
            {messages.length > 0 ? (
              <TouchableOpacity onPress={clearChat} style={{ position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center', padding: 8 }}>
                <Ionicons name="trash-outline" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Children chips row — horizontal scroll below title */}
          {children.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ paddingBottom: 10 }}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
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
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#D4A853' : (isDark ? '#374151' : '#d1d5db'),
                      backgroundColor: isSelected ? (isDark ? 'rgba(212,168,83,0.15)' : 'rgba(212,168,83,0.08)') : 'transparent',
                    }}
                  >
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }}
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
                          marginRight: 8,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                          {child.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={{
                        fontSize: 14,
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
        </View>

        {/* Chat content — KeyboardAvoidingView wraps ONLY messages + input, NOT header */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardOffset}
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
                style={{ textAlignVertical: 'center', textAlign: 'center' }}
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
