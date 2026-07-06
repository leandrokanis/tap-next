import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { colors, fonts, radii, spacing } from './theme';

/** Rótulo IBM Plex Mono uppercase com letter-spacing — a voz "de máquina" da UI. */
export function MonoLabel({
  children,
  tone = 'dim',
  size = 11,
  tracking = 2,
  weight = 'medium',
  style,
  testID,
}: {
  children: React.ReactNode;
  tone?: 'dim' | 'mid' | 'accent' | 'warning' | 'danger' | 'onAccent' | 'success' | 'rest';
  size?: number;
  tracking?: number;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  style?: TextStyle | TextStyle[];
  testID?: string;
}) {
  const color = {
    dim: colors.textDim,
    mid: colors.textMid,
    accent: colors.accent,
    warning: colors.warning,
    danger: colors.danger,
    onAccent: colors.onAccent,
    success: colors.success,
    rest: colors.rest,
  }[tone];
  const fontFamily = {
    regular: fonts.mono,
    medium: fonts.monoMedium,
    semibold: fonts.monoSemiBold,
    bold: fonts.monoBold,
  }[weight];
  return (
    <Text
      testID={testID}
      style={[
        { fontFamily, fontSize: size, letterSpacing: tracking, color, textTransform: 'uppercase' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Superfície padrão: card #141820 + borda 6% + raio 16/20. */
export function Card({
  children,
  big = false,
  style,
  testID,
}: {
  children: React.ReactNode;
  big?: boolean;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.borderCard,
          borderRadius: big ? radii.big : radii.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Círculo 40/44px com glifo de texto (‹ ✕ ❚❚ + ↑). */
export function RoundIconButton({
  glyph,
  onPress,
  size = 40,
  accent = false,
  bordered = false,
  testID,
  accessibilityLabel,
}: {
  glyph: string;
  onPress: () => void;
  size?: number;
  accent?: boolean;
  bordered?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radii.pill,
          backgroundColor: colors.control,
          alignItems: 'center',
          justifyContent: 'center',
        },
        bordered && { borderWidth: 1, borderColor: colors.borderControl },
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={{
          color: accent ? colors.accent : colors.textMid,
          fontSize: size >= 44 ? 22 : 16,
          fontFamily: fonts.medium,
        }}
      >
        {glyph}
      </Text>
    </Pressable>
  );
}

/** CTA gigante do rodapé. Um por tela. */
export function BigCTA({
  label,
  onPress,
  variant = 'primary',
  height = 88,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'disabled' | 'glow';
  height?: number;
  testID?: string;
}) {
  const primaryLike = variant === 'primary' || variant === 'glow';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={variant === 'disabled'}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radii.big,
          alignItems: 'center',
          justifyContent: 'center',
        },
        primaryLike && { backgroundColor: colors.accent },
        // RN não tem box-shadow spread; anel de glow via borda externa.
        variant === 'glow' && { borderWidth: 6, borderColor: colors.accentGlow },
        (variant === 'secondary' || variant === 'disabled') && {
          backgroundColor: colors.control,
          borderWidth: 1,
          borderColor: colors.borderControl,
        },
        pressed && variant !== 'disabled' && styles.pressed,
      ]}
    >
      <Text
        style={{
          fontFamily: variant === 'secondary' ? fonts.bold : fonts.heavy,
          fontSize: height >= 88 ? 24 : height >= 76 ? 21 : height >= 68 ? 19 : 16,
          letterSpacing: 1,
          color:
            variant === 'disabled'
              ? colors.textDisabled
              : variant === 'secondary'
                ? colors.textMid
                : colors.onAccent,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Pill mono 10px: HOJE, TEMPO, COMPLETA, PARCIAL n/m… */
export function Badge({
  label,
  tone = 'accent',
  filled = false,
  testID,
}: {
  label: string;
  tone?: 'accent' | 'warning' | 'success' | 'danger';
  filled?: boolean;
  testID?: string;
}) {
  const toneColor = {
    accent: colors.accent,
    warning: colors.warning,
    success: colors.success,
    danger: colors.danger,
  }[tone];
  const softBg = {
    accent: colors.accentBadgeBg,
    warning: colors.warningSoftBg,
    success: colors.successSoftBg,
    danger: colors.dangerSoftBg,
  }[tone];
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: filled ? toneColor : softBg,
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.monoSemiBold,
          fontSize: 10,
          letterSpacing: 1,
          color: filled ? colors.onAccent : toneColor,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Número grande + rótulo mono (grid do resumo). */
export function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center' }}>
      <Text
        style={{
          fontFamily: fonts.heavy,
          fontSize: 26,
          color: colors.text,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      <MonoLabel size={10} tracking={1} style={{ marginTop: 4 }}>
        {label}
      </MonoLabel>
    </Card>
  );
}

/** `− valor +` sobre fundo de tela, raio 14 (REPS / KG do descanso). */
export function StepperField({
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
    <View style={styles.stepperField} testID={testID}>
      <Pressable
        accessibilityRole="button"
        testID={testID ? `${testID}-minus` : undefined}
        onPress={() => onChange(Math.max(min, roundTo(value - step, decimals)))}
        hitSlop={6}
        style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
      >
        <Text style={styles.stepperSign}>−</Text>
      </Pressable>
      <View style={{ alignItems: 'center' }}>
        <Text
          testID={testID ? `${testID}-value` : undefined}
          style={{
            fontFamily: fonts.heavy,
            fontSize: 24,
            color: colors.text,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value.toFixed(decimals)}
        </Text>
        <MonoLabel size={10} tracking={1}>
          {label}
        </MonoLabel>
      </View>
      <Pressable
        accessibilityRole="button"
        testID={testID ? `${testID}-plus` : undefined}
        onPress={() => onChange(roundTo(value + step, decimals))}
        hitSlop={6}
        style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
      >
        <Text style={styles.stepperSign}>+</Text>
      </Pressable>
    </View>
  );
}

function roundTo(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

/** Pill dupla Treinos/Histórico no rodapé. */
export function SegmentedTabs({
  tabs,
  activeIndex,
  onPress,
}: {
  tabs: { label: string; testID?: string }[];
  activeIndex: number;
  onPress: (index: number) => void;
}) {
  return (
    <View style={styles.tabs}>
      {tabs.map((tab, i) => {
        const active = i === activeIndex;
        return (
          <Pressable
            key={tab.label}
            testID={tab.testID}
            accessibilityRole="tab"
            onPress={() => onPress(i)}
            style={({ pressed }) => [
              styles.tab,
              active && { backgroundColor: colors.accent },
              pressed && !active && styles.pressed,
            ]}
          >
            <Text
              style={{
                fontFamily: active ? fonts.bold : fonts.medium,
                fontSize: 14,
                color: active ? colors.onAccent : colors.textDim,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Fileira de segmentos 4px — um por série do exercício atual (v2): feitas
 * em azul, a atual em branco (destaque), pendentes apagadas.
 */
export function ProgressSegments({
  total,
  done,
  current,
}: {
  total: number;
  done: number;
  /** Índice 0-based do segmento ativo (a série em curso/preparação). */
  current?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor:
              i < done ? colors.accent : i === current ? colors.text : colors.borderPending,
          }}
        />
      ))}
    </View>
  );
}

/** Barra "A SEGUIR" — presente em TODA fase da sessão. */
export function NextUpBar({
  label,
  title,
  detail,
  testID,
}: {
  label: string;
  title: string;
  detail?: string;
  testID?: string;
}) {
  return (
    <Card testID={testID} style={styles.nextUp}>
      <MonoLabel tone="accent" size={10} tracking={2} weight="semibold">
        {label}
      </MonoLabel>
      <Text
        style={{ fontFamily: fonts.monoSemiBold, fontSize: 14, color: colors.text, flex: 1 }}
        numberOfLines={1}
      >
        {title}
      </Text>
      {detail ? (
        <Text style={{ fontFamily: fonts.monoMedium, fontSize: 12, color: colors.textDim }}>
          {detail}
        </Text>
      ) : null}
    </Card>
  );
}

/** Número gigante tabular dos cronômetros. */
export function TimerText({
  children,
  size = 'l',
  tone = 'text',
  testID,
}: {
  children: React.ReactNode;
  size?: 'm' | 'l' | 'xl';
  tone?: 'text' | 'accent' | 'warning' | 'rest';
  testID?: string;
}) {
  const fontSize = { m: 92, l: 104, xl: 128 }[size];
  const color = {
    text: colors.text,
    accent: colors.accent,
    warning: colors.warning,
    rest: colors.rest,
  }[tone];
  return (
    <Text
      testID={testID}
      style={{
        fontFamily: fonts.heavy,
        fontSize,
        lineHeight: fontSize,
        letterSpacing: size === 'xl' ? -4 : -3,
        color,
        fontVariant: ['tabular-nums'],
      }}
    >
      {children}
    </Text>
  );
}

export interface ModalAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text-danger';
  testID?: string;
}

/**
 * Modal card do design (retomada, encerrar sessão): overlay escuro,
 * card #171B22 raio 24, botões empilhados.
 */
export function AppModal({
  visible,
  icon,
  iconTone = 'warning',
  title,
  body,
  actions,
  testID,
}: {
  visible: boolean;
  icon?: string;
  iconTone?: 'warning' | 'accent';
  title: string;
  body?: React.ReactNode;
  actions: ModalAction[];
  testID?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View testID={testID} style={styles.modalCard}>
          {icon ? (
            <View
              style={[
                styles.modalIcon,
                {
                  backgroundColor:
                    iconTone === 'warning' ? 'rgba(255,176,32,0.15)' : colors.accentSoftBg,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: fonts.heavy,
                  fontSize: 20,
                  color: iconTone === 'warning' ? colors.warning : colors.accent,
                }}
              >
                {icon}
              </Text>
            </View>
          ) : null}
          <Text style={styles.modalTitle}>{title}</Text>
          {body ? <Text style={styles.modalBody}>{body}</Text> : null}
          <View style={{ marginTop: 22, gap: 10 }}>
            {actions.map((action) => {
              if (action.variant === 'text-danger') {
                return (
                  <Pressable
                    key={action.label}
                    testID={action.testID}
                    accessibilityRole="button"
                    onPress={action.onPress}
                    style={({ pressed }) => [styles.modalTextButton, pressed && styles.pressed]}
                  >
                    <Text
                      style={{ fontFamily: fonts.monoSemiBold, fontSize: 14, color: colors.danger }}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                );
              }
              const primary = action.variant !== 'secondary';
              return (
                <Pressable
                  key={action.label}
                  testID={action.testID}
                  accessibilityRole="button"
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    styles.modalButton,
                    primary
                      ? { backgroundColor: colors.accent }
                      : {
                          backgroundColor: colors.background,
                          borderWidth: 1,
                          borderColor: colors.borderControl,
                        },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: primary ? fonts.heavy : fonts.bold,
                      fontSize: primary ? 17 : 15,
                      letterSpacing: primary ? 1 : 0,
                      color: primary ? colors.onAccent : colors.text,
                      textTransform: primary ? 'uppercase' : 'none',
                    }}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
  stepperField: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSign: {
    color: colors.textMid,
    fontSize: 18,
    fontFamily: fonts.medium,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.s,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radii.pill,
    padding: 6,
  },
  tab: {
    flex: 1,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextUp: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.l,
  },
  modalCard: {
    backgroundColor: colors.control,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: '100%',
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: fonts.heavy,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.text,
  },
  modalBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMid,
    marginTop: 10,
  },
  modalButton: {
    height: 56,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTextButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
