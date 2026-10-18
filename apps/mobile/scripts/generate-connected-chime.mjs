// Generates Perspective's own "connected" chime: two soft bell tones rising a major third.
import { writeFileSync } from 'node:fs';
const rate = 44100, seconds = 1.1, n = Math.floor(rate * seconds);
const notes = [ { f: 784.0, start: 0.0, amp: 0.42 }, { f: 987.77, start: 0.14, amp: 0.38 } ]; // G5 then B5
const data = new Float32Array(n);
for (const { f, start, amp } of notes) {
  const s0 = Math.floor(start * rate);
  for (let i = s0; i < n; i++) {
    const t = (i - s0) / rate;
    const attack = Math.min(1, t / 0.008);
    const env = attack * Math.exp(-t * 4.2);
    const tone = Math.sin(2 * Math.PI * f * t) + 0.22 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 7) + 0.08 * Math.sin(2 * Math.PI * f * 3 * t) * Math.exp(-t * 10);
    data[i] += amp * env * tone;
  }
}
// gentle fade-out at the end
for (let i = n - 2205; i < n; i++) data[i] *= (n - i) / 2205;
const buf = Buffer.alloc(44 + n * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
let peak = 0; for (const v of data) peak = Math.max(peak, Math.abs(v));
const gain = 0.7 / peak;
for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i] * gain)) * 32767), 44 + i * 2);
writeFileSync(process.argv[2], buf);
console.log('wrote', process.argv[2], buf.length, 'bytes');
