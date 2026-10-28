export const waveforms = ['sine', 'triangle', 'square', 'sawtooth'] as const;
export type Waveform = typeof waveforms[number];
export const defaultWaveforms: Waveform[] = ['sine', 'sine', 'sine', 'sawtooth'];
export function isWaveform(value: unknown): value is Waveform {
    return waveforms.some(waveform => waveform === value);
}
