import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { collection, doc, getDoc } from '@react-native-firebase/firestore';
import { Button, IconButton } from '@/components';
import { colors, fonts, money, radii, shadows } from '@/theme';
import { firestore } from '@/services/firebase';
import { useAuthStore } from '@/stores/auth';
import type { Group, Winner } from '@arisan/shared/types';

const CONFETTI_COLORS = ['#7F77DD', '#1D9E75', '#BA7517', '#993C1D', '#4A43A8', '#FFC857'];

type Confetto = {
  left: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  rot: number;
  shape: 'rect' | 'circle';
  drift: number;
};

const CONFETTI: Confetto[] = Array.from({ length: 28 }, (_, i) => ({
  left: Math.random() * 100,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: Math.random() * 2500,
  duration: 2600 + Math.random() * 1800,
  size: 6 + Math.random() * 6,
  rot: Math.random() * 360,
  shape: Math.random() > 0.5 ? 'rect' : 'circle',
  drift: (Math.random() - 0.5) * 80,
}));

export default function WinnerScreen() {
  const params = useLocalSearchParams<{ groupId?: string; periode?: string }>();
  const user = useAuthStore((s) => s.user);
  const [group, setGroup] = useState<Group | null>(null);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.groupId || !params.periode) {
      setError('Parameter tidak lengkap');
      setLoading(false);
      return;
    }
    const groupId = params.groupId;
    const periodeId = params.periode;

    (async () => {
      try {
        const db = firestore();
        const groupRef = doc(collection(db, 'groups'), groupId);
        const [groupSnap, winnerSnap] = await Promise.all([
          getDoc(groupRef),
          getDoc(doc(collection(groupRef, 'winners'), periodeId)),
        ]);
        if (!groupSnap.exists) {
          setError('Grup tidak ditemukan');
        } else if (!winnerSnap.exists) {
          setError('Data pemenang belum ada');
        } else {
          setGroup({ id: groupSnap.id, ...(groupSnap.data() as Omit<Group, 'id'>) });
          setWinner(winnerSnap.data() as Winner);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat data pemenang');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.groupId, params.periode]);

  const isMe = !!user && !!winner && user.uid === winner.userId;
  const total = useMemo(() => (group ? group.nominal * group.jumlahPeriode : 0), [group]);
  const periodeNum = winner ? parseInt(winner.periodeId, 10) : 0;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !group || !winner) {
    return (
      <SafeAreaView style={styles.errorWrap} edges={['top', 'bottom']}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }} />
          <IconButton bg="rgba(255,255,255,0.7)" onPress={() => router.back()}>
            <X size={18} color={colors.textBody} strokeWidth={1.75} />
          </IconButton>
        </View>
        <View style={styles.errorBody}>
          <Text style={styles.errorTitle}>Tidak bisa menampilkan pemenang</Text>
          <Text style={styles.errorMsg}>{error ?? 'Data tidak tersedia'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient
      colors={['#EFEDFB', '#F8F7FE', '#FFFFFF']}
      style={{ flex: 1 }}
      locations={[0, 0.45, 1]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Confetti — hanya untuk pemenang */}
        {isMe && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {CONFETTI.map((c, i) => (
              <ConfettoPiece key={i} c={c} />
            ))}
          </View>
        )}

        {/* Close button */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }} />
          <IconButton bg="rgba(255,255,255,0.7)" onPress={() => router.back()}>
            <X size={18} color={colors.textBody} strokeWidth={1.75} />
          </IconButton>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <TrophyCircle />

          <Text style={styles.title}>
            {isMe ? `Selamat, ${firstName(winner.nama)}!` : `Pemenang: ${winner.nama}`}
          </Text>
          <Text style={styles.subtitle}>
            {isMe
              ? `Kamu menang ${group.nama} periode ${periodeNum}`
              : `${winner.nama} menang ${group.nama} periode ${periodeNum}`}
          </Text>

          <View style={[styles.statCard, shadows.card]}>
            <Stat label="Total" value={money(total)} />
            <View style={styles.statDivider} />
            <Stat label="Anggota" value={String(group.jumlahPeriode)} />
            <View style={styles.statDivider} />
            <Stat label="Periode" value={`${periodeNum}/${group.jumlahPeriode}`} />
          </View>

          {isMe && (
            <View style={styles.warning}>
              <Text style={{ fontSize: 18 }}>⏰</Text>
              <Text style={styles.warningText}>Set tanggal dalam 3 hari</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isMe ? (
            <Button
              full
              onPress={() =>
                router.push({
                  pathname: '/set-date',
                  params: { groupId: group.id, periode: winner.periodeId },
                })
              }
            >
              Set Tanggal Pelaksanaan
            </Button>
          ) : (
            <Button full onPress={() => router.back()}>
              Kembali
            </Button>
          )}
          {isMe && (
            <Pressable style={styles.laterBtn} onPress={() => router.back()} hitSlop={4}>
              <Text style={styles.laterLabel}>Nanti saja</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function firstName(nama: string): string {
  return nama.split(' ')[0] ?? nama;
}

function ConfettoPiece({ c }: { c: Confetto }) {
  const fall = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = () =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(fall, {
            toValue: 1,
            duration: c.duration,
            delay: c.delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(fall, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    run();
    // Mount-only: animasi confetti satu loop tak terbatas; `fall` ref stabil
    // & nilai `c.*` tidak perlu re-trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 820],
  });
  const translateX = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [0, c.drift],
  });
  const rotate = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [`${c.rot}deg`, `${c.rot + 540}deg`],
  });
  const opacity = fall.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 0.7, 0],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: `${c.left}%`,
        width: c.size,
        height: c.shape === 'rect' ? c.size * 0.5 : c.size,
        backgroundColor: c.color,
        borderRadius: c.shape === 'circle' ? c.size : 2,
        transform: [{ translateY }, { translateX }, { rotate }],
        opacity,
      }}
    />
  );
}

function TrophyCircle() {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    // Mount-only: bob animation tak terbatas; `bob` ref stabil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const translateY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });
  const rotate = bob.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-3deg', '3deg', '-3deg'],
  });
  return (
    <LinearGradient colors={['#FFFFFF', '#EFEDFB']} style={styles.trophyCircle}>
      <Animated.Text
        style={{
          fontSize: 64,
          transform: [{ translateY }, { rotate }],
        }}
      >
        🏆
      </Animated.Text>
    </LinearGradient>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.page,
  },
  errorWrap: { flex: 1, backgroundColor: colors.page },
  errorBody: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  errorTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    textAlign: 'center',
  },
  errorMsg: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  topRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 12,
  },
  trophyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...shadows.purple,
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 22,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 6,
    maxWidth: 280,
    textAlign: 'center',
  },
  statCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.cardXl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 24,
    alignSelf: 'stretch',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    marginTop: 4,
  },

  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radii.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
    alignSelf: 'stretch',
  },
  warningText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.warningInk,
  },

  actions: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
  },
  laterBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  laterLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textSubtle,
  },
});
