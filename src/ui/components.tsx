import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from './theme';

export function BigButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.big, pressed && styles.pressed]}
    >
      <Text style={styles.bigLabel}>{label}</Text>
    </Pressable>
  );
}

export function SmallButton({
  label,
  onPress,
  tone = 'neutral',
  testID,
}: {
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'danger' | 'accent';
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.small, pressed && styles.pressed]}
    >
      <Text style={[styles.smallLabel, tone === 'danger' && { color: colors.danger }, tone === 'accent' && { color: colors.accent }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Stepper({
  label,
  value,
  step,
  min,
  onChange,
  testID,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  onChange: (value: number) => void;
  testID?: string;
}) {
  const decimals = step % 1 === 0 ? 0 : 1;
  return (
    <View style={styles.stepperRow} testID={testID}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        testID={testID ? `${testID}-minus` : undefined}
        onPress={() => onChange(Math.max(min, round(value - step, decimals)))}
        style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
      >
        <Text style={styles.stepperSign}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue} testID={testID ? `${testID}-value` : undefined}>
        {value.toFixed(decimals)}
      </Text>
      <Pressable
        accessibilityRole="button"
        testID={testID ? `${testID}-plus` : undefined}
        onPress={() => onChange(round(value + step, decimals))}
        style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
      >
        <Text style={styles.stepperSign}>+</Text>
      </Pressable>
    </View>
  );
}

const round = (v: number, decimals: number) => Number(v.toFixed(decimals));

const styles = StyleSheet.create({
  big: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingVertical: spacing.l,
    alignItems: 'center',
  },
  bigLabel: {
    color: '#06130B',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  small: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  smallLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: { opacity: 0.6 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  stepperLabel: {
    color: colors.textDim,
    fontSize: 16,
    width: 48,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSign: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  stepperValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'center',
  },
});
