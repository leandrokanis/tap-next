/**
 * Design tokens do protótipo "Tap Next — Protótipo v1"
 * (docs/design/tap-next-prototipo-v1.dc.html, docs/REDESIGN.md §1).
 */
export const colors = {
  /** Fundo de tela. */
  background: '#0B0D11',
  /** Cards e linhas de lista. */
  card: '#141820',
  /** Botões redondos, botão secundário, controles elevados. */
  control: '#171B22',

  borderCard: 'rgba(255,255,255,0.06)',
  borderControl: 'rgba(255,255,255,0.08)',
  /** Segmento de progresso pendente, divisores. */
  borderPending: 'rgba(255,255,255,0.12)',

  text: '#FFFFFF',
  textMid: '#A7ADBA',
  textDim: '#8A919E',
  textDisabled: '#5A616E',

  /** Única cor de ação. */
  accent: '#4DA3FF',
  /** Texto sobre azul — nunca branco. */
  onAccent: '#06121F',
  accentSoftBg: 'rgba(77,163,255,0.08)',
  accentSoftBorder: 'rgba(77,163,255,0.25)',
  accentBadgeBg: 'rgba(77,163,255,0.12)',
  accentGlow: 'rgba(77,163,255,0.18)',

  /** Reservado ao overtime e a estados parciais. */
  warning: '#FFB020',
  warningSoftBg: 'rgba(255,176,32,0.12)',
  warningSoftBorder: 'rgba(255,176,32,0.35)',

  /** Verde do descanso (RF da v2) — distinto do verde de "completa". */
  rest: '#35D0A0',
  restSoftBg: 'rgba(53,208,160,0.10)',
  restSoftBorder: 'rgba(53,208,160,0.30)',

  /** Só "completa". */
  success: '#4ECB71',
  successSoftBg: 'rgba(78,203,113,0.12)',

  /** Só erro / descartar. */
  danger: '#FF5A3C',
  dangerSoftBg: 'rgba(255,90,60,0.10)',
  dangerSoftBorder: 'rgba(255,90,60,0.35)',
};

export const fonts = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  bold: 'Archivo_700Bold',
  heavy: 'Archivo_800ExtraBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemiBold: 'IBMPlexMono_600SemiBold',
  monoBold: 'IBMPlexMono_700Bold',
};

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 40,
};

export const radii = {
  /** Cards e linhas de lista. */
  card: 16,
  /** Cards grandes e CTAs. */
  big: 20,
  /** Pills, botões redondos. */
  pill: 999,
};
