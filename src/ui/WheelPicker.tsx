import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fonts, radii } from './theme';

const ITEM_HEIGHT = 56;
/** Rows visible above/below the selected one. */
const SIDE_ROWS = 2;

interface Props {
  label: string;
  /** Ordered list of selectable values. */
  values: number[];
  value: number;
  onChange(value: number): void;
  /** Renders a value for display (default: String). */
  format?(value: number): string;
  testID?: string;
}

/**
 * Vertical wheel picker in the prototype's style: giant tabular number in a
 * bordered slot, neighbors fading out (RF-19/RF-06). Pure ScrollView with
 * snapping — no native picker dependency.
 */
export function WheelPicker({ label, values, value, onChange, format, testID }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, values.indexOf(value));
  const indexRef = useRef(selectedIndex);
  const show = format ?? String;

  // Keep the wheel aligned when the value changes from outside.
  useEffect(() => {
    if (indexRef.current === selectedIndex) return;
    indexRef.current = selectedIndex;
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.min(
        values.length - 1,
        Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT)),
      );
      if (index === indexRef.current) return;
      indexRef.current = index;
      onChange(values[index]);
    },
    [values, onChange],
  );

  const padding = useMemo(() => ({ height: SIDE_ROWS * ITEM_HEIGHT }), []);

  return (
    <View style={styles.column} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.wheel}>
        <View pointerEvents="none" style={styles.slot} />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
          onMomentumScrollEnd={handleMomentumEnd}
          nestedScrollEnabled
        >
          <View style={padding} />
          {values.map((v, i) => {
            const distance = Math.abs(i - selectedIndex);
            return (
              <View key={v} style={styles.item}>
                <Text
                  style={[
                    styles.value,
                    distance === 0 ? styles.valueSelected : distance === 1 ? styles.valueNear : styles.valueFar,
                  ]}
                >
                  {show(v)}
                </Text>
              </View>
            );
          })}
          <View style={padding} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    maxWidth: 170,
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textDim,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  wheel: {
    width: '100%',
    height: ITEM_HEIGHT * (SIDE_ROWS * 2 + 1),
  },
  slot: {
    position: 'absolute',
    top: SIDE_ROWS * ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accentSoftBorder,
    borderRadius: radii.card,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: fonts.heavy,
    fontVariant: ['tabular-nums'],
  },
  valueSelected: {
    fontSize: 44,
    color: colors.text,
  },
  valueNear: {
    fontSize: 32,
    color: 'rgba(255,255,255,0.3)',
  },
  valueFar: {
    fontSize: 26,
    color: 'rgba(255,255,255,0.14)',
  },
});
