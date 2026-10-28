import { LitElement, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { PeerSession, type SessionInfo } from './peer-session';
import { DrumMachine } from './audio/DrumMachine';
import { Sine } from './audio/instruments/sine';
import { Saw } from './audio/instruments/Saw';
import { Netronome } from './audio/netronome';

const instruments = ['Sine', 'Drums', 'Bass', 'Saw'];
type Flow = 'idle' | 'host' | 'join' | 'waiting' | 'connecting';

export class ShareBeat extends LitElement {
    static properties = {
        tracks: { state: true }, user: { state: true }, step: { state: true },
        status: { state: true }, receivedCode: { state: true }, outputCode: { state: true },
        busy: { state: true }, flow: { state: true },
        session: { state: true }, error: { state: true }, copied: { state: true }
    };
    declare private tracks: number[][];
    declare private user: number;
    declare private step: number;
    declare private status: string;
    declare private receivedCode: string;
    declare private outputCode: string;
    declare private busy: boolean;
    declare private flow: Flow;
    declare private session: SessionInfo;
    declare private error: string;
    declare private copied: boolean;
    private focusedCell = 128;
    private audioStarted = false;
    private drums: DrumMachine;
    private sine: Sine;
    private bass: Sine;
    private saw: Saw;
    private netronome = new Netronome(() => this.playBeat(), () => {}, this);
    private peer = new PeerSession(
        (user, step, note) => this.setNote(user, step, note),
        user => { this.user = user; }
    );
    private onPageHide = () => this.peer.disconnect();

    constructor() {
        super();
        this.tracks = Array.from({ length: 4 }, () => Array(16).fill(-1));
        this.user = 0;
        this.step = -1;
        this.status = '';
        this.receivedCode = '';
        this.outputCode = '';
        this.busy = false;
        this.flow = 'idle';
        this.session = { host: true, players: [0], pending: false, connected: false };
        this.error = '';
        this.copied = false;
    }
    protected createRenderRoot() { return this; }
    connectedCallback(): void {
        super.connectedCallback();
        this.peer.onStatus = message => {
            this.status = message.startsWith('Solo session') ? 'Your solo session is ready.' : message;
            if (message.includes('timed out') || message.includes('could not')) this.error = message;
        };
        this.peer.onSessionChange = session => {
            this.session = session;
            if ((!session.pending && this.flow === 'host') ||
                (session.connected && ['waiting', 'connecting'].includes(this.flow)) ||
                (session.host && this.flow === 'waiting')) this.resetFlow();
        };
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
    private resetFlow(): void {
        this.flow = 'idle';
        this.receivedCode = '';
        this.outputCode = '';
        this.copied = false;
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
            this.sine.durationFadeIn = 0.02;
            this.sine.durationFadeOut = 0.12;
            this.bass.durationFadeIn = 0.025;
            this.bass.durationFadeOut = 0.16;
            this.bass.glideTime = 0.012;
            this.saw.durationFadeIn = 0.02;
            this.saw.durationFadeOut = 0.12;
            // Leave headroom when all four instruments play together.
            this.drums.gain.gain.value = 0.154;
        }
        await this.drums.dsp.resume();
        this.audioStarted = true;
        this.netronome.start(200);
    }
    private selectCell(cell: number): void {
        if (!this.peer.canEdit) {
            this.error = 'Wait for your friend to finish connecting before adding notes.';
            return;
        }
        if (!this.audioStarted) this.enableAudio().catch(error => { this.error = 'Audio could not start: ' + error.message; });
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
            if (user === 1) this.drums.trigger(16 - row);
            else {
                // Equal temperament; bass sits two octaves below the lead.
                const midi = (user === 2 ? 48 : 72) - row;
                instrument.start(440 * 2 ** ((midi - 69) / 12));
            }
        });
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
    private async action(action: string): Promise<void> {
        this.error = '';
        if (action === 'join-mode') {
            this.flow = 'join';
            await this.updateComplete;
            this.querySelector<HTMLTextAreaElement>('#peer-input')?.focus();
            return;
        }
        this.busy = true;
        try {
            if (action === 'invite') {
                this.outputCode = await this.peer.createInvitation();
                this.flow = 'host';
                this.status = 'Invitation ready. Send the code to one friend.';
                this.receivedCode = '';
                this.copied = false;
            } else if (action === 'join') {
                this.outputCode = await this.peer.acceptInvitation(this.receivedCode);
                this.flow = 'waiting';
                this.status = 'Reply ready. Send it back to your friend.';
                this.copied = false;
            } else if (action === 'answer') {
                await this.peer.acceptAnswer(this.receivedCode);
                if (!this.session.connected || this.session.pending) this.flow = 'connecting';
                else this.resetFlow();
            } else if (action === 'copy') {
                try {
                    await navigator.clipboard.writeText(this.outputCode);
                    this.copied = true;
                } catch (_) {
                    const code = this.querySelector<HTMLTextAreaElement>('#peer-output');
                    if (code) { code.closest('details').open = true; code.select(); }
                    this.error = 'Copy is unavailable here. The code is selected; copy it using your keyboard.';
                }
            } else if (action === 'cancel') {
                if (this.flow === 'waiting' || this.flow === 'connecting' && !this.session.host) this.peer.disconnect();
                else this.peer.cancelInvitation();
                this.resetFlow();
                this.status = this.session.connected ? 'Invitation cancelled. Your session is still connected.' : 'Your solo session is ready.';
            } else if (action === 'leave') {
                this.peer.disconnect();
                this.resetFlow();
                this.status = 'Your solo session is ready.';
            }
        } catch (error) { this.error = error.message; }
        finally { this.busy = false; }
    }
    private control(action: string, label: string, primary = false, disabled = false) {
        return html`<button type="button" class=${primary ? 'btn primary' : 'btn secondary'} data-action=${action}
            ?disabled=${this.busy || disabled} @click=${() => this.action(action)}>
            ${this.busy && action === 'invite' ? 'Preparing…' : label}</button>`;
    }
    private input(label: string, placeholder: string) {
        return html`<label class="code-label" for="peer-input">${label}</label>
            <textarea id="peer-input" spellcheck="false" autocapitalize="off" autocomplete="off"
                .value=${this.receivedCode} placeholder=${placeholder} ?disabled=${this.busy}
                @input=${(event: InputEvent) => { this.receivedCode = (event.target as HTMLTextAreaElement).value; }}></textarea>`;
    }
    private codeToSend() {
        return html`${this.control('copy', this.copied ? 'Code copied' : 'Copy code', true)}
            <details class="code-details"><summary>View code / copy manually</summary>
                <textarea id="peer-output" aria-label="Your code to send" readonly spellcheck="false" .value=${this.outputCode}></textarea>
            </details>`;
    }
    private connectionFlow() {
        if (this.flow === 'idle') return html`
            ${this.session.connected ? html`<p>${this.session.players.length} players connected.</p>` : nothing}
            ${this.session.host ? this.control('invite', this.session.players.length === 4 ? 'Session full' : 'Invite a friend', true, this.session.players.length === 4) : nothing}
            ${!this.session.connected ? this.control('join-mode', 'Join a session') : nothing}
            ${this.session.connected ? this.control('leave', 'Leave session') : nothing}
            <p class="network-note">Works best on the same Wi-Fi.</p>`;
        if (this.flow === 'host') return html`
            <p>Send this invitation code to your friend.</p>
            ${this.codeToSend()}
            ${this.input('Their reply code', 'Paste the reply they send back')}
            ${this.control('answer', 'Connect', true, !this.receivedCode.trim())}
            ${this.control('cancel', 'Cancel invitation')}`;
        if (this.flow === 'join') return html`
            ${this.input('Invitation code', 'Paste your friend’s invitation')}
            <p class="small-note">Joining replaces your solo pattern.</p>
            ${this.control('join', 'Create reply code', true, !this.receivedCode.trim())}
            ${this.control('cancel', 'Back')}`;
        if (this.flow === 'waiting') return html`
            <p>Send this reply code back to your friend.</p>
            ${this.codeToSend()}
            ${this.control('cancel', 'Cancel')}`;
        return html`<p>Connecting… Keep both pages open.</p>${this.control('cancel', 'Cancel')}`;
    }
    private async openShare(): Promise<void> {
        await this.updateComplete;
        this.querySelector<HTMLDialogElement>('#share-dialog').showModal();
    }
    private closeShare(): void {
        this.querySelector<HTMLDialogElement>('#share-dialog').close();
        this.querySelector<HTMLButtonElement>('[data-action="share"]').focus();
    }
    protected render() {
        return html`
            <main class=${'surface instrument-' + this.user} aria-label="ShareBeat synthesizer">
                <div id="matrix" aria-label="16 step synthesizer">
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
                <footer class="grid-tools">
                    <span class="instrument-name">${instruments[this.user]}</span>
                    <button type="button" data-action="share" @click=${this.openShare}>Share</button>
                </footer>
                <dialog id="share-dialog" aria-labelledby="share-title" @click=${(event: MouseEvent) => {
                    const dialog = event.currentTarget as HTMLDialogElement;
                    const box = dialog.getBoundingClientRect();
                    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) this.closeShare();
                }}>
                    <div class="dialog-heading"><h1 id="share-title">Share</h1>
                        <button class="close-dialog" type="button" aria-label="Close share dialog" @click=${this.closeShare}>×</button></div>
                    <section id="peer-controls" aria-busy=${this.busy}>${this.connectionFlow()}</section>
                    <p id="peer-status" role="status" aria-live="polite" ?hidden=${!this.error && !['waiting', 'connecting'].includes(this.flow)}>
                        ${this.error || (this.flow === 'waiting' ? 'Waiting for your friend to connect…' : this.status)}</p>
                </dialog>
            </main>`;
    }
}
customElements.define('share-beat', ShareBeat);
