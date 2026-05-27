import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Copy, Share2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { collection, doc, getDoc, onSnapshot } from '@react-native-firebase/firestore';
import { Button, Header, Toast } from '@/components';
import { colors, fonts, radii } from '@/theme';
import { firestore } from '@/services/firebase';

type GroupSnapshot = {
  nama: string;
  inviteCode: string;
  jumlahPeriode: number;
};

function formatCodeDisplay(code: string): string {
  // 7 char → "XXX-XXXX" untuk lebih mudah dibaca.
  if (code.length !== 7) return code;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

export default function InviteScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId = String(params.id ?? '');
  const [group, setGroup] = useState<GroupSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    const ref = doc(collection(firestore(), 'groups'), groupId);
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(ref);
        if (!active) return;
        if (snap.exists()) {
          const data = snap.data() as Partial<GroupSnapshot> | undefined;
          if (data?.nama && data.inviteCode && typeof data.jumlahPeriode === 'number') {
            setGroup({
              nama: data.nama,
              inviteCode: data.inviteCode,
              jumlahPeriode: data.jumlahPeriode,
            });
          }
        }
      } catch {
        // ignore — toast on action
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [groupId]);

  // Live member count
  useEffect(() => {
    if (!groupId) return;
    const membersCol = collection(doc(collection(firestore(), 'groups'), groupId), 'members');
    const unsub = onSnapshot(
      membersCol,
      (snap) => setMemberCount(snap.size),
      () => setMemberCount(null),
    );
    return unsub;
  }, [groupId]);

  const onCopy = async () => {
    if (!group) return;
    try {
      await Clipboard.setStringAsync(group.inviteCode);
      setToast('Kode disalin');
    } catch {
      setToast('Gagal menyalin');
    }
  };

  const onShare = async () => {
    if (!group) return;
    const message = `Yuk gabung arisan "${group.nama}"! Pakai kode ${group.inviteCode} atau klik: arisan://join/${group.inviteCode}`;
    try {
      await Share.share({ message });
    } catch {
      // user cancel — abaikan
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Header title="Bagikan Invite" onBack={() => router.back()} />
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Header title="Bagikan Invite" onBack={() => router.back()} />
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>Grup tidak ditemukan.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Header title="Bagikan Invite" onBack={() => router.back()} />
      <View style={styles.container}>
        <Text style={styles.subtitle}>{group.nama}</Text>
        <Text style={styles.hint}>
          Bagikan ke calon anggota. Mereka bisa join via kode atau tap link.
        </Text>

        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Kode Invite</Text>
          <Text style={styles.codeBig}>{formatCodeDisplay(group.inviteCode)}</Text>
          <Text style={styles.codeMeta}>
            {memberCount !== null
              ? `${memberCount}/${group.jumlahPeriode} anggota`
              : `Maks ${group.jumlahPeriode} anggota`}
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <Button
            full
            variant="secondary"
            onPress={onCopy}
            leading={<Copy size={16} color={colors.text} strokeWidth={1.75} />}
          >
            Copy Kode
          </Button>
          <Button
            full
            onPress={onShare}
            leading={<Share2 size={16} color="#FFF" strokeWidth={1.75} />}
          >
            Bagikan Link
          </Button>
          <Pressable
            onPress={() => router.replace(`/group/${groupId}`)}
            style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.linkBtnText}>Lanjut ke Grup</Text>
          </Pressable>
        </View>
      </View>
      <Toast message={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  container: { flex: 1, padding: 20 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  subtitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  hint: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSubtle,
    lineHeight: 18,
  },
  codeBox: {
    marginTop: 22,
    marginBottom: 22,
    backgroundColor: colors.primaryTint,
    borderRadius: radii.cardXl,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  codeLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.primaryDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  codeBig: {
    marginTop: 10,
    fontFamily: 'Menlo',
    fontSize: 32,
    color: colors.primaryDeep,
    letterSpacing: 4,
  },
  codeMeta: {
    marginTop: 10,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primaryDeep,
  },
  linkBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primary,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
});
