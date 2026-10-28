import { LitElement, html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { PeerSession } from './peer-session';
import { DrumMachine } from './audio/DrumMachine';
import { Sine } from './audio/instruments/sine';
import { Saw } from './audio/instruments/Saw';
import { Netronome } from './audio/netronome';

const players = ['A', 'B', 'C', 'D'];
const instruments = ['sine', 'drums', 'bass', 'saw'];

export class ShareBeat extends LitElement {
    static properties = {
        tracks: { state: true }, user: { state: true }, step: { state: true },
        status: { state: true }, receivedCode: { state: true }, outputCode: { state: true },
        busy: { state: true }, audioEnabled: { state: true }
    };
    declare private tracks: number[][];
    declare private user: number;
    declare private step: number;
    declare private status: string;
    declare private receivedCode: string;
    declare private outputCode: string;
    declare private busy: boolean;
    declare private audioEnabled: boolean;
    constructor() {
        super();
        this.tracks = Array.from({ length: 4 }, () => Array(16).fill(-1));
        this.user = 0;
        this.step = 0;
        this.status = '';
        this.receivedCode = '';
        this.outputCode = '';
        this.busy = false;
        this.audioEnabled = false;
    }
    private drums: DrumMachine;
    private sine: Sine;
    private bass: Sine;
    private saw: Saw;
    private netronome = new Netronome(() => this.playBeat(), () => {}, this);
    private peer = new PeerSession(
        (user, step, note) => this.setNote(user, step, note),
        user => { this.user = user; this.updateInstrument(); }
    );
    private onPageHide = () => this.peer.disconnect();
    // Keep the existing app styles while Lit owns all rendering and events.
    protected createRenderRoot() { return this; }
    connectedCallback(): void {
        super.connectedCallback();
        this.peer.onStatus = message => { this.status = message; };
        this.peer.onClock = offset => { this.netronome.clockOffset = offset; };
        this.peer.connect();
        window.addEventListener('pagehide', this.onPageHide);
    }
    disconnectedCallback(): void {
        window.removeEventListener('pagehide', this.onPageHide);
        this.peer.disconnect();
        this.netronome.stop();
        this.drums?.dsp.close();
        super.disconnectedCallback();
    }
    private updateInstrument(): void {
        document.body.classList.remove(...instruments, 'loading');
        document.body.classList.add(instruments[this.user]);
    }
    private setNote(user: number, step: number, note: number): void {
        this.tracks = this.tracks.map((row, index) =>
            index === user ? row.map((value, column) => column === step ? note : value) : row);
    }
    private async enableAudio(): Promise<void> {
        if (!this.drums) {
            this.drums = new DrumMachine();
            this.sine = new Sine(this.drums.dsp, this.drums.gain);
            this.bass = new Sine(this.drums.dsp, this.drums.gain);
            this.saw = new Saw(this.drums.dsp, this.drums.gain);
        }
        await this.drums.dsp.resume();
        this.audioEnabled = true;
        this.netronome.start(200);
    }
    private selectCell(cell: number): void {
        if (!this.peer.canEdit) {
            this.status = "Wait for the host to apply your answer before editing notes.";
            return;
        }
        this.enableAudio().catch(error => { this.status = 'Audio could not start: ' + error.message; });
        const step = cell % 16;
        const row = Math.floor(cell / 16);
        const note = this.tracks[this.user][step] === row ? -1 : row;
        this.setNote(this.user, step, note);
        this.peer.sendData(step, note);
    }
    private playBeat(): void {
        this.step = this.netronome.stepIndex(16);
        if (!this.drums) return;
        [this.sine, null, this.bass, this.saw].forEach((instrument, user) => {
            const row = this.tracks[user][this.step];
            if (row < 0) { instrument?.stop(); return; }
            const key = 16 - row;
            if (user === 1) this.drums.trigger(key);
            else {
                const note = key - 10 - (user === 2 ? 12 : 0);
                instrument.start(440 * (note / 12) ** 2);
            }
        });
    }
    private async action(action: string): Promise<void> {
        this.busy = true;
        try {
            if (action === 'invite') {
                this.status = 'Preparing invitation…';
                this.outputCode = await this.peer.createInvitation();
                this.status = 'Send your code to one friend. Ask them to join and send their answer back.';
            } else if (action === 'join') {
                this.status = 'Preparing answer…';
                this.outputCode = await this.peer.acceptInvitation(this.receivedCode);
                this.status = 'Send your answer code back to the host. Waiting for them to apply it.';
            } else if (action === 'answer') {
                await this.peer.acceptAnswer(this.receivedCode);
                this.outputCode = '';
                this.receivedCode = '';
                this.status = 'Answer applied. Connecting directly…';
            } else if (action === 'copy') {
                if (navigator.clipboard) await navigator.clipboard.writeText(this.outputCode);
                else {
                    this.querySelector<HTMLTextAreaElement>('#peer-output').select();
                    this.status = 'Code selected. Copy it using your keyboard.';
                }
            } else if (action === 'cancel') {
                this.peer.cancelInvitation();
                this.outputCode = '';
            } else if (action === 'leave') {
                this.peer.disconnect();
                this.outputCode = '';
                this.receivedCode = '';
                this.status = 'Solo session. Create an invitation to add a player.';
            }
        } catch (error) { this.status = error.message; }
        finally { this.busy = false; }
    }
    private control(action: string, label: string) {
        return html`<button type="button" data-action=${action} ?disabled=${this.busy}
            @click=${() => this.action(action)}>${label}</button>`;
    }
    protected render() {
        return html`
            <header><h1>ShareBeat</h1><h2>Synchronized Synthesizer</h2></header>
            <div id="content">
                <div id="matrix" aria-label="16 step synthesizer">
                    ${Array.from({ length: 256 }, (_, cell) => {
                        const step = cell % 16;
                        const row = Math.floor(cell / 16);
                        const active = this.tracks.map(track => track[step] === row);
                        return html`<article role="button" tabindex="0"
                            aria-label=${'Step ' + (step + 1) + ', note ' + (16 - row)}
                            aria-pressed=${active[this.user] ? 'true' : 'false'}
                            class=${classMap({ button: true, selected: active.some(Boolean),
                                userA: active[0], userB: active[1], userC: active[2], userD: active[3] })}
                            @pointerdown=${(event: PointerEvent) => {
                                if (event.button === 0) { event.preventDefault(); this.selectCell(cell); }
                            }}
                            @pointerover=${(event: PointerEvent) => {
                                if (event.buttons === 1 && event.pointerType === 'mouse') this.selectCell(cell);
                            }}
                            @keydown=${(event: KeyboardEvent) => {
                                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.selectCell(cell); }
                            }}></article>`;
                    })}
                    <div class="progress" style=${'left:' + this.step * 6.25 + '%'}></div>
                </div>
            </div>
            <footer>${instruments[this.user]}</footer>
            <details id="peer-controls" open>
                <summary>Play with friends</summary>
                <p>Click the grid to ${this.audioEnabled ? 'edit notes' : 'enable audio and add notes'}.
                    The host invites each friend separately. Direct connections work best on the same network.</p>
                <p id="peer-status" role="status" aria-live="polite">${this.status}</p>
                ${this.control('invite', '1. Create invitation')}
                <label>Received code<textarea id="peer-input" spellcheck="false" .value=${this.receivedCode}
                    @input=${(event: InputEvent) => { this.receivedCode = (event.target as HTMLTextAreaElement).value; }}
                    placeholder="Paste an invitation or answer here"></textarea></label>
                ${this.control('join', '2. Join invitation')}
                ${this.control('answer', '3. Host: apply answer')}
                <label>Your code to send<textarea id="peer-output" readonly spellcheck="false" .value=${this.outputCode}></textarea></label>
                ${this.control('copy', 'Copy code')}
                ${this.control('cancel', 'Cancel invitation')}
                ${this.control('leave', 'Leave session')}
            </details>`;
    }
}
customElements.define('share-beat', ShareBeat);
