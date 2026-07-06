#!/usr/bin/env node
/**
 * Gera a paleta de sons da sessão (RF-18) — um WAV por evento, sintetizado
 * offline sem dependências. Rode `npm run sounds` após mudar um timbre; os
 * arquivos em assets/sounds/ são versionados.
 *
 * Paleta: cada evento tem um contorno próprio para ser reconhecível de
 * olhos fechados — tick curto e seco, "vai" brilhante ascendente, fim de
 * isometria em bipe duplo, descanso desce (relaxa), fim de descanso sobe
 * (prepara), sessão concluída em arpejo.
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

/** Um tom senoidal com envelope de ataque/queda exponencial. */
function tone({ freq, duration, gain = 0.9, attack = 0.005, harmonics = [1] }) {
  const samples = Math.round(duration * SAMPLE_RATE);
  const data = new Float64Array(samples);
  for (let i = 0; i < samples; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t / attack) * Math.exp(-4 * (t / duration));
    let s = 0;
    harmonics.forEach((h, k) => {
      s += Math.sin(2 * Math.PI * freq * h * t) / (k + 1);
    });
    data[i] = gain * env * s;
  }
  return data;
}

function silence(duration) {
  return new Float64Array(Math.round(duration * SAMPLE_RATE));
}

function concat(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Float64Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function toWav(data) {
  const pcm = Buffer.alloc(data.length * 2);
  for (let i = 0; i < data.length; i++) {
    const clamped = Math.max(-1, Math.min(1, data[i]));
    pcm.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const sounds = {
  // Tick do count-in: curto e seco, não assusta.
  'countin-tick.wav': concat([tone({ freq: 1000, duration: 0.06, gain: 0.6 })]),
  // "Vai": brilhante e ascendente — o único que manda começar.
  'go.wav': concat([
    tone({ freq: 880, duration: 0.09, gain: 0.85 }),
    tone({ freq: 1320, duration: 0.22, gain: 0.9, harmonics: [1, 2] }),
  ]),
  // Fim de isometria: bipe duplo médio — "pode soltar".
  'isometry-end.wav': concat([
    tone({ freq: 880, duration: 0.12, gain: 0.85 }),
    silence(0.06),
    tone({ freq: 880, duration: 0.18, gain: 0.85 }),
  ]),
  // Início do descanso: desce — relaxa.
  'rest-start.wav': concat([
    tone({ freq: 660, duration: 0.12, gain: 0.7 }),
    tone({ freq: 440, duration: 0.25, gain: 0.7 }),
  ]),
  // Fim do descanso: sobe — prepara, sem urgência.
  'rest-end.wav': concat([
    tone({ freq: 440, duration: 0.12, gain: 0.75 }),
    tone({ freq: 660, duration: 0.28, gain: 0.8 }),
  ]),
  // Sessão concluída: arpejo maior (C5–E5–G5) — celebração curta.
  'session-done.wav': concat([
    tone({ freq: 523.25, duration: 0.14, gain: 0.8 }),
    tone({ freq: 659.25, duration: 0.14, gain: 0.8 }),
    tone({ freq: 783.99, duration: 0.34, gain: 0.85, harmonics: [1, 2] }),
  ]),
};

const outDir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });
for (const [name, data] of Object.entries(sounds)) {
  const file = path.join(outDir, name);
  fs.writeFileSync(file, toWav(data));
  console.log(`${name} — ${(data.length / SAMPLE_RATE).toFixed(2)}s`);
}
