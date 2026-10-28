import { LitElement, html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { defaultWaveforms, type Waveform } from './audio/waveforms';
import './grid.css';

export interface NoteChangeDetail { user: number; step: number; note: number; }

// The grid owns note editing and rendering. Playback and sharing are supplied
// by consumers, so a page can use any number of independent grids.
export class ShareBeat extends LitElement {
    static properties = {
        tracks: { attribute: false }, user: { type: Number }, step: { state: true },
        trackWaveforms: { attribute: false },
        oscillatorType: { attribute: 'oscillator-type', reflect: true },
        clockOffset: { type: Number, attribute: 'clock-offset' },
        bpm: { type: Number }, readOnly: { type: Boolean, attribute: 'readonly' }
    };
    declare public tracks: number[][];
    declare public user: number;
    declare public step: number;
    declare public trackWaveforms: Waveform[];
    declare public oscillatorType: string;
    declare public clockOffset: number;
    declare public bpm: number;
    declare public readOnly: boolean;
    private focusedCell = 128;

    constructor() {
        super();
        this.tracks = Array.from({ length: 4 }, () => Array(16).fill(-1));
        this.trackWaveforms = [...defaultWaveforms];
        this.user = 0;
        this.step = -1;
        this.oscillatorType = 'sine';
        this.clockOffset = 0;
        this.bpm = 200;
        this.readOnly = false;
    }
    protected createRenderRoot() { return this; }
    private selectCell(cell: number): void {
        if (this.readOnly || !this.tracks[this.user]) return;
        const step = cell % 16;
        const row = Math.floor(cell / 16);
        const note = this.tracks[this.user][step] === row ? -1 : row;
        this.tracks = this.tracks.map((track, index) =>
            index === this.user ? track.map((value, column) => column === step ? note : value) : track);
        this.dispatchEvent(new CustomEvent<NoteChangeDetail>('note-change', {
            detail: { user: this.user, step, note }, bubbles: true, composed: true
        }));
    }
    private keyCell(event: KeyboardEvent, cell: number): void {
        const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -16, ArrowDown: 16 }[event.key];
        if (offset === undefined) return;
        event.preventDefault();
        const next = Math.max(0, Math.min(255, cell + offset));
        this.focusedCell = next;
        this.requestUpdate();
        this.updateComplete.then(() => this.querySelectorAll<HTMLButtonElement>('.pad')[next].focus());
    }
    protected render() {
        return html`
                <div class="matrix" aria-label="16 step synthesizer">
                    ${Array.from({ length: 256 }, (_, cell) => {
                        const step = cell % 16, row = Math.floor(cell / 16);
                        const active = this.tracks.map(track => track[step] === row);
                        return html`<button type="button" tabindex=${cell === this.focusedCell ? 0 : -1}
                            aria-label=${'Step ' + (step + 1) + ', note ' + (16 - row)}
                            aria-pressed=${active[this.user] ? 'true' : 'false'}
                            class=${classMap({ pad: true, selected: active.some(Boolean), current: this.step === step,
                                alternate: step % 2 === 0, userA: active[0], userB: active[1], userC: active[2], userD: active[3] })}
                            @pointerdown=${(event: PointerEvent) => { if (event.button === 0) {
                                event.preventDefault(); this.focusedCell = cell; (event.currentTarget as HTMLElement).focus(); this.selectCell(cell);
                            } }}
                            @pointerover=${(event: PointerEvent) => { if (event.buttons === 1 && event.pointerType === 'mouse') this.selectCell(cell); }}
                            @click=${(event: MouseEvent) => { if (event.detail === 0) this.selectCell(cell); }}
                            @keydown=${(event: KeyboardEvent) => this.keyCell(event, cell)}></button>`;
                    })}
                </div>
        `;
    }
}
customElements.define('share-beat', ShareBeat);
