import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Plus, Send, Smile } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { avatarColor, colors, fonts, initials, radii } from '@/theme';
import { SEED_MESSAGES, ChatMessage } from '@/data/mock';

const ME = 'Kamu';

type Props = {
  embedded?: boolean;
};

export function ChatTab({ embedded }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  // embedded=true (inside group/[id]) → no tab bar below, need safe area
  // embedded=false (inside (tabs)/chat) → tab bar handles safe area
  const bottomPad = embedded ? Math.max(insets.bottom, 12) : 12;

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    const now = new Date();
    const time =
      String(now.getHours()).padStart(2, '0') +
      ':' +
      String(now.getMinutes()).padStart(2, '0');
    setMessages((m) => [
      ...m,
      { id: Date.now(), kind: 'msg', who: ME, mine: true, text: t, time },
    ]);
    setDraft('');
  };

  // Group consecutive messages from the same sender
  const rows: (ChatMessage & { showHeader: boolean })[] = [];
  let prev: ChatMessage | null = null;
  for (const m of messages) {
    if (m.kind === 'system') {
      rows.push({ ...m, showHeader: true });
      prev = null;
    } else {
      const sameSender = prev && prev.kind === 'msg' && prev.who === m.who;
      rows.push({ ...m, showHeader: !sameSender });
      prev = m;
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.chatBg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={embedded ? 100 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, gap: 4 }}
      >
        {rows.map((r) =>
          r.kind === 'system' ? (
            <SystemRow key={r.id} text={r.text} />
          ) : (
            <MessageRow key={r.id} m={r} />
          )
        )}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: bottomPad }]}>
        <Pressable style={styles.actionBtn}>
          <Plus size={20} color={colors.textMuted} strokeWidth={1.75} />
        </Pressable>
        <View
          style={[
            styles.inputWrap,
            focused && { borderColor: colors.primary },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Tulis pesan..."
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            multiline
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Smile size={20} color={colors.textSubtle} strokeWidth={1.75} />
        </View>
        <Pressable
          onPress={send}
          disabled={!draft.trim()}
          style={[
            styles.sendBtn,
            {
              backgroundColor: draft.trim() ? colors.primary : '#E0DED6',
            },
          ]}
        >
          <Send
            size={18}
            color={draft.trim() ? '#FFF' : '#A8A8A2'}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function SystemRow({ text }: { text: string }) {
  return (
    <View style={styles.systemWrap}>
      <View style={styles.systemPill}>
        <Text style={styles.systemText}>{text}</Text>
      </View>
    </View>
  );
}

function MessageRow({
  m,
}: {
  m: ChatMessage & { showHeader: boolean };
}) {
  const mine = !!m.mine;
  const c = avatarColor(m.who || 'A');
  const accent = m.accent;
  const bubbleBg = mine || accent ? colors.primary : '#FFF';
  const fg = mine || accent ? '#FFF' : colors.text;

  return (
    <View
      style={[
        styles.msgRow,
        {
          flexDirection: mine ? 'row-reverse' : 'row',
          marginTop: m.showHeader ? 6 : 1,
        },
      ]}
    >
      <View style={{ width: 28 }}>
        {!mine && m.showHeader && (
          <View style={[styles.msgAvatar, { backgroundColor: c.bg }]}>
            <Text style={[styles.msgAvatarText, { color: c.ink }]}>
              {initials(m.who || '')}
            </Text>
          </View>
        )}
      </View>

      <View style={{ maxWidth: '72%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
        {!mine && m.showHeader && (
          <View style={styles.msgNameRow}>
            <Text style={[styles.msgName, { color: c.ink }]}>{m.who}</Text>
            {m.ketua && (
              <View style={styles.ketuaBadge}>
                <Text style={styles.ketuaText}>KETUA</Text>
              </View>
            )}
          </View>
        )}
        <View
          style={[
            styles.bubble,
            { backgroundColor: bubbleBg },
            mine && m.showHeader && { borderTopRightRadius: 4 },
            !mine && m.showHeader && { borderTopLeftRadius: 4 },
          ]}
        >
          <Text style={[styles.bubbleText, { color: fg }]}>{m.text}</Text>
          <View style={styles.bubbleMeta}>
            <Text
              style={[
                styles.bubbleTime,
                {
                  color:
                    mine || accent
                      ? 'rgba(255,255,255,0.75)'
                      : '#A8A8A2',
                },
              ]}
            >
              {m.time}
              {mine ? '  ✓✓' : ''}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  systemWrap: { alignItems: 'center', marginVertical: 8 },
  systemPill: {
    maxWidth: '80%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  systemText: {
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: 'center',
  },

  msgRow: { alignItems: 'flex-end', gap: 6 },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarText: { fontFamily: fonts.bold, fontSize: 11 },
  msgNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    paddingLeft: 4,
  },
  msgName: { fontFamily: fonts.semibold, fontSize: 12 },
  ketuaBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  ketuaText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: '#FFF',
    letterSpacing: 0.4,
  },

  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleText: {
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 20,
  },
  bubbleMeta: { marginTop: 4, alignItems: 'flex-end' },
  bubbleTime: {
    fontFamily: fonts.medium,
    fontSize: 10,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.chatBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.chatBg,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 6,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
