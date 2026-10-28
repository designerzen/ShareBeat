import type { ReactiveController } from 'lit';
import type { ShareBeat } from '../share-beat';
import { BeatPlayer } from './beat-player';

// Opt-in adapter: attaching this controller adds playback to an otherwise
// visual grid. Lit calls its lifecycle methods for removal and reconnection.
export class GridAudioController implements ReactiveController {
    private player?: BeatPlayer;
    private starting?: Promise<void>;

    constructor(private grid: ShareBeat) { grid.addController(this); }

    hostConnected(): void { this.grid.addEventListener('note-change', this.onNote); }
    hostUpdated(): void {
        if (!this.player) return;
        this.player.tracks = this.grid.tracks;
        const waveforms: string[] = [...this.grid.trackWaveforms];
        waveforms[this.grid.user] = this.grid.oscillatorType;
        this.player.configure(waveforms, this.grid.bpm, this.grid.clockOffset);
    }
    hostDisconnected(): void {
        this.grid.removeEventListener('note-change', this.onNote);
        const player = this.player;
        this.player = undefined;
        this.starting = undefined;
        this.grid.step = -1;
        void player?.close();
    }
    private onNote = (): void => {
        void this.start().catch(error => this.grid.dispatchEvent(new CustomEvent('audio-error', {
            detail: error, bubbles: true, composed: true
        })));
    };
    public async start(): Promise<void> {
        if (!this.grid.isConnected) return;
        if (this.starting) return this.starting;
        if (!this.player) this.player = new BeatPlayer(step => { this.grid.step = step; });
        this.hostUpdated();
        const player = this.player;
        const starting = player.start();
        this.starting = starting;
        try { await starting; }
        finally { if (this.starting === starting) this.starting = undefined; }
    }
}
