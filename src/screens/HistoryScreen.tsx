import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { buildExportBundle } from '../data/export';
import { listSessions } from '../data/sessionRepository';
import { listWorkouts } from '../data/workoutRepository';
import { SessionRecord } from '../domain/session';
import { RootStackParamList } from '../navigation/types';
import { SmallButton } from '../ui/components';
import { colors, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export default function HistoryScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      listSessions().then(setSessions).catch(() => {});
    }, []),
  );

  const handleExport = async () => {
    const workouts = await listWorkouts();
    const bundle = buildExportBundle(
      workouts.map((w) => w.workout),
      await listSessions(),
      new Date(),
    );
    await Share.share({ message: JSON.stringify(bundle, null, 2) });
  };

  return (
    <View style={styles.container} testID="history-screen">
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.s, paddingBottom: spacing.xl }}
        ListEmptyComponent={<Text style={styles.empty}>{t('history.empty')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            testID={`session-${item.id}`}
            accessibilityRole="button"
            onPress={() => navigation.navigate('HistoryDetail', { sessionId: item.id })}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.workoutName}</Text>
              <Text style={styles.cardSubtitle}>
                {new Date(item.startedAt).toLocaleString(i18n.language)} ·{' '}
                {t('history.minutes', { count: Math.round(item.durationSeconds / 60) })} ·{' '}
                {t('history.sets', { count: item.sets.length })}
              </Text>
            </View>
            <View style={styles.badges}>
              <Text style={[styles.badge, item.status === 'completed' ? styles.badgeDone : styles.badgePartial]}>
                {t(`history.${item.status}`)}
              </Text>
              <Text style={styles.source}>{t(`history.${item.source}`)}</Text>
            </View>
          </Pressable>
        )}
      />
      <SmallButton label={t('history.export')} onPress={handleExport} testID="export-button" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.m,
    gap: spacing.m,
  },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing.xl, fontSize: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  cardSubtitle: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  badges: { alignItems: 'flex-end', gap: spacing.xs },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeDone: { backgroundColor: colors.accentDark, color: colors.text },
  badgePartial: { backgroundColor: colors.warning, color: '#231A00' },
  source: { color: colors.textDim, fontSize: 12 },
});
