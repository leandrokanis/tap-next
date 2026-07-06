import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { deleteSession, getSession, updateSessionSet } from '../data/sessionRepository';
import { SessionRecord } from '../domain/session';
import { RootStackParamList } from '../navigation/types';
import {
  Badge,
  BigCTA,
  Card,
  MonoLabel,
  RoundIconButton,
  StatCard,
  StepperField,
} from '../ui/components';
import { showAlert } from '../ui/dialogs';
import { formatClock, formatInt, tonnageKg } from '../ui/format';
import { colors, fonts, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryDetail'>;

/** Detalhe de sessão — mesma linguagem do resumo (1.6), com edição por set. */
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

  const started = new Date(session.startedAt);
  const statusLabel =
    session.status === 'completed'
      ? t('history.completed')
      : session.plannedSets
        ? t('history.partialCount', { done: session.sets.length, total: session.plannedSets })
        : t('history.partial');

  return (
    <View style={styles.container} testID="history-detail-screen">
      <View style={styles.header}>
        <RoundIconButton glyph="‹" onPress={navigation.goBack} testID="back-button" />
        <MonoLabel>{t('history.title')}</MonoLabel>
        <RoundIconButton
          glyph="✕"
          onPress={handleDelete}
          testID="delete-session"
          accessibilityLabel={t('history.delete')}
        />
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{session.workoutName}</Text>
        <Badge label={statusLabel} tone={session.status === 'completed' ? 'success' : 'warning'} />
      </View>
      <MonoLabel size={12} style={{ marginTop: 8, marginBottom: 20 }}>
        {`${started.toLocaleDateString(i18n.language)} ${started.toLocaleTimeString(i18n.language, {
          hour: '2-digit',
          minute: '2-digit',
        })} · ${t(`history.${session.source}`)}`}
      </MonoLabel>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <StatCard value={formatClock(session.durationSeconds)} label={t('session.duration')} />
        <StatCard value={String(session.sets.length)} label={t('session.setsLabel')} />
        <StatCard value={formatInt(tonnageKg(session.sets), i18n.language)} label={t('session.kgTotal')} />
      </View>

      <FlatList
        data={session.sets}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={{ gap: spacing.s, paddingBottom: spacing.m }}
        renderItem={({ item, index }) => (
          <Card style={styles.setCard}>
            <View style={styles.setHeader}>
              <Text style={styles.setTitle}>
                {item.exercise}{' '}
                <Text style={{ color: colors.textDim, fontFamily: fonts.medium }}>
                  — {t('history.setLabel', { set: item.setIndex })}
                </Text>
              </Text>
              {item.adjusted ? <Badge label={t('history.adjusted')} tone="accent" /> : null}
              {item.durationSeconds !== undefined ? (
                <MonoLabel size={12} tone="mid">
                  {t('detail.seconds', { count: item.durationSeconds })}
                </MonoLabel>
              ) : null}
            </View>
            {(item.reps !== undefined || item.weight !== undefined) && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                {item.reps !== undefined && (
                  <StepperField
                    label={t('session.repsShort')}
                    value={item.reps}
                    step={1}
                    min={0}
                    onChange={(reps) => editSet(index, { reps })}
                  />
                )}
                {item.weight !== undefined && (
                  <StepperField
                    label={t('session.kgShort')}
                    value={item.weight}
                    step={2.5}
                    min={0}
                    onChange={(weight) => editSet(index, { weight })}
                  />
                )}
              </View>
            )}
          </Card>
        )}
      />

      <BigCTA
        label={t('history.delete')}
        variant="secondary"
        height={56}
        onPress={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 74,
    paddingHorizontal: 20,
    paddingBottom: 46,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontFamily: fonts.heavy,
    fontSize: 30,
    letterSpacing: -0.5,
    color: colors.text,
    flexShrink: 1,
  },
  setCard: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  setTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    flexShrink: 1,
  },
});
