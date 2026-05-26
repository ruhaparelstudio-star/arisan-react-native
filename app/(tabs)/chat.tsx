import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Info } from 'lucide-react-native';
import { IconButton } from '@/components';
import { colors, fonts } from '@/theme';
import { ChatTab } from '@/screens/ChatTab';

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>RT</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>
            Arisan RT 03
          </Text>
          <Text style={styles.subtitle}>12 anggota · 4 online</Text>
        </View>
        <IconButton>
          <Info size={22} color={colors.textBody} strokeWidth={1.75} />
        </IconButton>
      </View>
      <ChatTab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.chatBg },
  header: {
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
  },
});
