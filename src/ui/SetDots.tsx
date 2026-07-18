import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii } from './theme';

interface Props {
  total: number;
  /** Sets already logged for this exercise. */
  done: number;
  /** 1-based set the session is currently at (prepare/work/rest). */
  current: number;
  testID?: string;
}

/**
 * Graphical set indicator (RF-01): filled blue = done, filled white with a
 * halo = current, outlined = upcoming. Replaces "série X de Y" text.
 */
export function SetDots({ total, done, current, testID }: Props) {
  return (
    <View style={styles.row} testID={testID}>
      {Array.from({ length: total }, (_, i) => {
        const setNumber = i + 1;
        if (setNumber <= done) return <View key={i} style={[styles.dot, styles.done]} />;
        if (setNumber === current) return <View key={i} style={[styles.dot, styles.current]} />;
        return <View key={i} style={[styles.dot, styles.upcoming]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radii.pill,
  },
  done: {
    backgroundColor: colors.accent,
  },
  current: {
    backgroundColor: colors.text,
    shadowColor: colors.text,
    shadowOpacity: 0.18,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  upcoming: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'transparent',
  },
});
