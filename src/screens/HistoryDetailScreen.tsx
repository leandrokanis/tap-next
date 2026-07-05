import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { showAlert } from '../ui/dialogs';

import { deleteSession, getSession, updateSessionSet } from '../data/sessionRepository';
import { SessionRecord } from '../domain/session';
import { RootStackParamList } from '../navigation/types';
import { SmallButton, Stepper } from '../ui/components';
import { colors, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryDetail'>;

export default function HistoryDetailScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { sessionId } = route.params;
  const [session, setSession] = useState<SessionRecord | null>(null);

  useEffect(() => {
    getSession(sessionId).then(setSession);
  }, [sessionId]);

  const editSet = useCallback(
    (position: number, changes: { reps?: number; weight?: number }) => {
      setSession((current) => {
        if (!current) return current;
        const sets = current.sets.map((s, i) => (i === position ? { ...s, ...changes } : s));
        return { ...current, sets };
      });
      updateSessionSet(sessionId, position, changes).catch(() => {});
    },
    [sessionId],
  );

  const handleDelete = () => {
    showAlert(t('history.deleteTitle'), t('history.deleteBody'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('history.delete'),
        style: 'destructive',
        onPress: () => deleteSession(sessionId).then(() => navigation.goBack()),
      },
    ]);
  };

  if (!session) return <View style={styles.container} />;

  return (
    <View style={styles.container} testID="history-detail-screen">
      <View style={styles.header}>
        <Text style={styles.title}>{session.workoutName}</Text>
        <Text style={styles.subtitle}>
          {new Date(session.startedAt).toLocaleString(i18n.language)} ·{' '}
          {t('history.minutes', { count: Math.round(session.durationSeconds / 60) })} ·{' '}
          {t(`history.${session.status}`)} · {t(`history.${session.source}`)}
        </Text>
      </View>

      <FlatList
        data={session.sets}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={{ gap: spacing.s, paddingBottom: spacing.xl }}
        renderItem={({ item, index }) => (
          <View style={styles.setCard}>
            <Text style={styles.setTitle}>
              {item.exercise} — {t('history.setLabel', { set: item.setIndex })}
            </Text>
            {item.durationSeconds !== undefined && (
              <Text style={styles.duration}>{item.durationSeconds}s</Text>
            )}
            {item.reps !== undefined && (
              <Stepper
                label="reps"
                value={item.reps}
                step={1}
                min={0}
                onChange={(reps) => editSet(index, { reps })}
              />
            )}
            {item.weight !== undefined && (
              <Stepper
                label="kg"
                value={item.weight}
                step={2.5}
                min={0}
                onChange={(weight) => editSet(index, { weight })}
              />
            )}
          </View>
        )}
      />

      <SmallButton label={t('history.delete')} tone="danger" onPress={handleDelete} testID="delete-session" />
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
  header: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.textDim, fontSize: 14 },
  setCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    gap: spacing.s,
  },
  setTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  duration: { color: colors.textDim, fontSize: 15 },
});
