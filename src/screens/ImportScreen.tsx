import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { saveWorkout } from '../data/workoutRepository';
import { JsonPosition, locateJsonPath, parseWorkout, ValidationError } from '../domain/workout';
import { RootStackParamList } from '../navigation/types';
import { BigCTA, Card, MonoLabel, RoundIconButton } from '../ui/components';
import { showAlert } from '../ui/dialogs';
import { colors, fonts, radii, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Import'>;

const SAMPLE = `{
  "version": 1,
  "name": "Pernas A",
  "exercises": [
    { "name": "Agachamento", "mode": "reps", "sets": 3, "reps": 10, "weight": 60, "restBetweenSets": 90 },
    { "name": "Leg press", "mode": "reps", "sets": 3, "reps": 12, "weight": 120, "restBetweenSets": 90 },
    { "name": "Prancha", "mode": "time", "sets": 3, "duration": 30, "restBetweenSets": 15 }
  ]
}`;

/**
 * Importar JSON (mock 2.3): o usuário cola do clipboard — não edita no
 * celular. O JSON entra como preview read-only; validação aponta campo,
 * erro de sintaxe aponta posição.
 */
interface LocatedError extends ValidationError {
  position: JsonPosition | null;
}

export default function ImportScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [jsonError, setJsonError] = useState<{ message: string; line?: number; col?: number } | null>(
    null,
  );
  const [errors, setErrors] = useState<LocatedError[]>([]);
  const [workout, setWorkout] = useState<ReturnType<typeof parseWorkout> | null>(null);

  /** Valida ao colar (RF-13): erro aparece inline, Importar só habilita limpo. */
  const setContent = (value: string) => {
    setJsonError(null);
    setErrors([]);
    setWorkout(null);
    setText(value);
    if (value.trim() === '') return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      const message = (error as Error).message;
      setJsonError({ message, ...positionFrom(message, value) });
      return;
    }
    const result = parseWorkout(parsed);
    if (!result.ok) {
      setErrors(result.errors.map((e) => ({ ...e, position: locateJsonPath(value, e.path) })));
      return;
    }
    setWorkout(result);
  };

  // A leitura programática do clipboard só existe em contexto seguro
  // (HTTPS); sem ela, abre um campo que captura o Colar manual do usuário —
  // segue paste-only: o campo não edita, só recebe.
  const [manualPaste, setManualPaste] = useState(false);
  const handlePaste = async () => {
    try {
      const clip = await Clipboard.getStringAsync();
      if (clip.trim() !== '') {
        setContent(clip);
        setManualPaste(false);
        return;
      }
    } catch {
      // API indisponível — cai no campo manual
    }
    setManualPaste(true);
  };

  const handleManualPaste = (value: string) => {
    if (value.trim() === '') return;
    setManualPaste(false);
    setContent(value);
  };

  const handleImport = async () => {
    if (!workout || !workout.ok) return;
    await saveWorkout(workout.workout);
    showAlert(t('import.success', { name: workout.workout.name }));
    navigation.goBack();
  };

  const errorCount = errors.length + (jsonError ? 1 : 0);
  const empty = text.trim() === '';
  const errorLines = new Set(
    [
      jsonError?.line,
      ...errors.map((e) => e.position?.line),
    ].filter((l): l is number => l !== undefined),
  );

  return (
    <View style={styles.container} testID="import-screen">
      <View style={styles.header}>
        <RoundIconButton glyph="‹" onPress={navigation.goBack} testID="back-button" />
        <MonoLabel>{t('import.title')}</MonoLabel>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.hint}>{t('import.hint')}</Text>

      {manualPaste ? (
        <TextInput
          autoFocus
          multiline
          value=""
          onChangeText={handleManualPaste}
          placeholder={t('import.manualPaste')}
          placeholderTextColor={colors.textDim}
          style={styles.manualPaste}
          testID="manual-paste"
        />
      ) : null}

      <Card style={styles.preview} testID="import-input">
        {empty ? (
          <View style={styles.previewEmpty}>
            <Text style={styles.pasteHint}>{t('import.placeholder')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: spacing.m }}>
            <Text style={styles.previewText}>
              {text.split('\n').map((line, i) => (
                <Text
                  key={i}
                  style={errorLines.has(i + 1) ? styles.previewErrorLine : undefined}
                >
                  {(i > 0 ? '\n' : '') + line}
                </Text>
              ))}
            </Text>
          </ScrollView>
        )}
      </Card>

      {errorCount > 0 && (
        <View style={styles.errorCard}>
          <MonoLabel tone="danger" size={11} tracking={1} weight="semibold">
            {t('import.errorsFound', { count: errorCount })}
          </MonoLabel>
          <ScrollView style={{ maxHeight: 120 }} testID="import-errors">
            {jsonError && (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.errorText}>{t('import.invalidJson', { message: jsonError.message })}</Text>
                {jsonError.line !== undefined && (
                  <MonoLabel size={11} style={{ marginTop: 4 }}>
                    {t('import.lineCol', { line: jsonError.line, col: jsonError.col })}
                  </MonoLabel>
                )}
              </View>
            )}
            {errors.map((e) => (
              <View key={e.path + e.code} style={{ marginTop: 6 }}>
                <Text style={styles.errorText}>
                  {e.path ? `${e.path} — ` : ''}
                  {t(`validation.${e.code}`)}
                </Text>
                {e.position ? (
                  <MonoLabel size={11} style={{ marginTop: 2 }}>
                    {t('import.lineCol', { line: e.position.line, col: e.position.column })}
                  </MonoLabel>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <BigCTA
        label={empty ? t('import.paste') : t('import.repaste')}
        variant="secondary"
        height={64}
        onPress={handlePaste}
        testID="paste-button"
      />

      <Pressable
        testID="load-sample"
        accessibilityRole="button"
        onPress={() => setContent(SAMPLE)}
        style={({ pressed }) => [styles.sampleLink, pressed && { opacity: 0.6 }]}
      >
        <MonoLabel tone="accent" size={12} weight="semibold">
          {t('import.loadSample')}
        </MonoLabel>
      </Pressable>

      <BigCTA
        label={t('import.action')}
        height={68}
        variant={empty || errorCount > 0 ? 'disabled' : 'primary'}
        onPress={handleImport}
        testID="do-import"
      />
    </View>
  );
}

/** Extrai linha/coluna da mensagem do JSON.parse (best-effort, por engine). */
function positionFrom(message: string, text: string): { line?: number; col?: number } {
  const lineCol = message.match(/line (\d+) column (\d+)/i);
  if (lineCol) return { line: Number(lineCol[1]), col: Number(lineCol[2]) };
  const pos = message.match(/position (\d+)/i);
  if (pos) {
    const index = Math.min(Number(pos[1]), text.length);
    const before = text.slice(0, index);
    const line = before.split('\n').length;
    const col = index - before.lastIndexOf('\n');
    return { line, col };
  }
  return {};
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
  hint: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMid,
    marginBottom: 14,
  },
  preview: {
    flex: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  previewEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.l,
  },
  pasteHint: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
  },
  previewText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 20,
    color: colors.textMid,
  },
  previewErrorLine: {
    backgroundColor: colors.dangerSoftBg,
    color: colors.text,
  },
  errorCard: {
    backgroundColor: colors.dangerSoftBg,
    borderWidth: 1,
    borderColor: colors.dangerSoftBorder,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },
  manualPaste: {
    minHeight: 52,
    maxHeight: 52,
    borderWidth: 1,
    borderColor: colors.accentSoftBorder,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  sampleLink: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});
