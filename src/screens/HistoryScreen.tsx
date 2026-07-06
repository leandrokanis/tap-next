import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { buildExportBundle } from '../data/export';
import { listSessions } from '../data/sessionRepository';
import { listWorkouts } from '../data/workoutRepository';
import { SessionRecord } from '../domain/session';
import { RootStackParamList } from '../navigation/types';
import { Badge, Card, MonoLabel, RoundIconButton, SegmentedTabs } from '../ui/components';
import { formatClock, relativeDay } from '../ui/format';
import { colors, fonts, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

/** Histórico (mock 2.2): sessões agrupadas por mês, badges de status. */
export default function HistoryScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      listSessions().then(setSessions).catch(() => {});
    }, []),
  );

  const byMonth = useMemo(() => {
    const groups: { label: string; sessions: SessionRecord[] }[] = [];
    for (const session of sessions) {
      const label = new Date(session.startedAt)
        .toLocaleDateString(i18n.language, { month: 'long' })
        .toUpperCase();
      const current = groups[groups.length - 1];
      if (current && current.label === label) current.sessions.push(session);
      else groups.push({ label, sessions: [session] });
    }
    return groups;
  }, [sessions, i18n.language]);

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
      <View style={styles.header}>
        <Text style={styles.title}>{t('history.title')}</Text>
        <RoundIconButton
          glyph="↑"
          size={44}
          bordered
          onPress={handleExport}
          testID="export-button"
          accessibilityLabel={t('history.export')}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.s, paddingBottom: spacing.m }}>
        {sessions.length === 0 ? <Text style={styles.empty}>{t('history.empty')}</Text> : null}
        {byMonth.map((group) => (
          <View key={group.label} style={{ gap: spacing.s }}>
            <MonoLabel style={{ marginBottom: 2 }}>{group.label}</MonoLabel>
            {group.sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                locale={i18n.language}
                onPress={() => navigation.navigate('HistoryDetail', { sessionId: session.id })}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <SegmentedTabs
        tabs={[
          { label: t('home.tabWorkouts'), testID: 'go-workouts' },
          { label: t('home.tabHistory') },
        ]}
        activeIndex={1}
        onPress={(i) => {
          if (i === 0) navigation.navigate('Home');
        }}
      />
    </View>
  );
}

function SessionCard({
  session,
  locale,
  onPress,
}: {
  session: SessionRecord;
  locale: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const rel = relativeDay(session.startedAt, new Date());
  const started = new Date(session.startedAt);
  const day = rel
    ? t(rel.key, { count: rel.count })
    : started.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const time = started.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const statusLabel =
    session.status === 'completed'
      ? t('history.completed')
      : session.plannedSets
        ? t('history.partialCount', { done: session.sets.length, total: session.plannedSets })
        : t('history.partial');

  return (
    <Pressable
      testID={`session-${session.id}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{session.workoutName}</Text>
          <Badge
            label={statusLabel}
            tone={session.status === 'completed' ? 'success' : 'warning'}
          />
        </View>
        <View style={styles.metaRow}>
          <MonoLabel size={12} tracking={0.5}>{`${day} ${time}`}</MonoLabel>
          <MonoLabel size={12} tracking={0.5}>
            {formatClock(session.durationSeconds)}
          </MonoLabel>
          <MonoLabel size={12} tracking={0.5}>
            {t('history.sets', { count: session.sets.length })}
          </MonoLabel>
          <MonoLabel size={12} tracking={0.5}>
            {t(`history.${session.source}`)}
          </MonoLabel>
        </View>
      </Card>
    </Pressable>
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
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.heavy,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1,
    color: colors.text,
  },
  empty: {
    fontFamily: fonts.regular,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 15,
  },
  card: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    flexWrap: 'wrap',
  },
});
