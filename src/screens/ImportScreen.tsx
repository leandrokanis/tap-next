import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { showAlert } from '../ui/dialogs';

import { listWorkouts, saveWorkout } from '../data/workoutRepository';
import { pushWorkoutsToWatch } from '../data/watchSync';
import { parseWorkout, ValidationError } from '../domain/workout';
import { RootStackParamList } from '../navigation/types';
import { SmallButton } from '../ui/components';
import { colors, spacing } from '../ui/theme';

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

export default function ImportScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const handleImport = async () => {
    setJsonError(null);
    setErrors([]);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      setJsonError(t('import.invalidJson', { message: (error as Error).message }));
      return;
    }
    const result = parseWorkout(parsed);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    await saveWorkout(result.workout);
    const all = await listWorkouts();
    pushWorkoutsToWatch(all.map((w) => w.workout));
    showAlert(t('import.success', { name: result.workout.name }));
    navigation.goBack();
  };

  return (
    <View style={styles.container} testID="import-screen">
      <TextInput
        testID="import-input"
        style={styles.input}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={t('import.placeholder')}
        placeholderTextColor={colors.textDim}
        value={text}
        onChangeText={setText}
      />

      {(jsonError || errors.length > 0) && (
        <ScrollView style={styles.errors} testID="import-errors">
          {jsonError && <Text style={styles.errorText}>⚠ {jsonError}</Text>}
          {errors.map((e) => (
            <Text key={e.path + e.code} style={styles.errorText}>
              ⚠ {e.path ? `${e.path}: ` : ''}
              {t(`validation.${e.code}`)}
            </Text>
          ))}
        </ScrollView>
      )}

      <View style={styles.row}>
        <SmallButton label={t('import.loadSample')} onPress={() => setText(SAMPLE)} testID="load-sample" />
        <SmallButton label={t('import.action')} tone="accent" onPress={handleImport} testID="do-import" />
      </View>
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
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    color: colors.text,
    padding: spacing.m,
    fontSize: 14,
    fontFamily: 'Menlo',
    textAlignVertical: 'top',
  },
  errors: { maxHeight: 140 },
  errorText: { color: colors.danger, fontSize: 14, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.s, justifyContent: 'center' },
});
