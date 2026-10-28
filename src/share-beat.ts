import { LitElement, html, nothing, svg } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { PeerSession, type SessionInfo } from './peer-session';
import { DrumMachine } from './audio/DrumMachine';
import { Sine } from './audio/instruments/sine';
import { Saw } from './audio/instruments/Saw';
import { Netronome } from './audio/netronome';

const instruments = ['Sine', 'Drums', 'Bass', 'Saw'];
const descriptions = ['Soft & rounded', 'Rhythm & percussion', 'Low & warm', 'Bright & textured'];
const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
type Flow = 'idle' | 'host' | 'join' | 'waiting' | 'connecting';
const paths = {
    play: 'm9 5 11 7-11 7Z', pause: 'M9 5v14M15 5v14',
    plus: 'M12 5v14M5 12h14', arrow: 'M5 12h14m-6-6 6 6-6 6',
    copy: 'M9 9h11v11H9zM15 5V3H3v12h2', check: 'm5 12 4 4L19 6',
    volume: 'M11 5 6 9H3v6h3l5 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
    clear: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5',
    people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m11 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
};
function icon(name: keyof typeof paths) {
    return svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${paths[name]} /></svg>`;
}

export class ShareBeat extends LitElement {
    static properties = {
        tracks: { state: true }, user: { state: true }, step: { state: true },
        status: { state: true }, receivedCode: { state: true }, outputCode: { state: true },
        busy: { state: true }, playing: { state: true }, flow: { state: true },
        session: { state: true }, error: { state: true }, copied: { state: true }, volume: { state: true }
    };
    declare private tracks: number[][];
    declare private user: number;
    declare private step: number;
    declare private status: string;
    declare private receivedCode: string;
    declare private outputCode: string;
    declare private busy: boolean;
    declare private playing: boolean;
    declare private flow: Flow;
    declare private session: SessionInfo;
    declare private error: string;
    declare private copied: boolean;
    declare private volume: number;
    private focusedCell = 128;
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
        this.playing = false;
        this.flow = 'idle';
        this.session = { host: true, players: [0], pending: false, connected: false };
        this.error = '';
        this.copied = false;
        this.volume = 70;
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
            this.drums.gain.gain.value = this.volume / 100 * 0.22;
        }
        await this.drums.dsp.resume();
        this.playing = true;
        this.netronome.start(200);
    }
    private async togglePlayback(): Promise<void> {
        if (!this.playing) {
            try { await this.enableAudio(); }
            catch (error) { this.error = 'Audio could not start: ' + error.message; }
            return;
        }
        this.playing = false;
        this.netronome.stop();
        this.step = -1;
        this.sine?.stop();
        this.bass?.stop();
        this.saw?.stop();
    }
    private selectCell(cell: number): void {
        if (!this.peer.canEdit) {
            this.error = 'Wait for your friend to finish connecting before adding notes.';
            return;
        }
        if (!this.playing) this.enableAudio().catch(error => { this.error = 'Audio could not start: ' + error.message; });
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
    private fillPattern(demo: boolean): void {
        if (!this.peer.canEdit) return;
        const pattern = demo ? [12, -1, 9, -1, 5, -1, 9, 7, 12, -1, 9, -1, 3, 5, 7, -1] : Array(16).fill(-1);
        pattern.forEach((note, step) => { this.setNote(this.user, step, note); this.peer.sendData(step, note); });
        if (demo && !this.playing) this.enableAudio().catch(error => { this.error = error.message; });
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
            ${action === 'invite' ? icon('plus') : action === 'copy' ? icon(this.copied ? 'check' : 'copy') : nothing}
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
            <h3>Better together.</h3>
            <p>Build a loop with up to three friends. Each player gets their own instrument.</p>
            ${this.session.host ? this.control('invite', this.session.players.length === 4 ? 'Session full' : 'Invite a friend', true, this.session.players.length === 4) : nothing}
            ${!this.session.connected ? this.control('join-mode', 'Join a session') : nothing}
            <p class="network-note">Connecting works best on the same Wi-Fi. No account needed.</p>`;
        if (this.flow === 'host') return html`
            <div class="flow-kicker">INVITE A FRIEND <span>1 → 2</span></div>
            <h3>Send an invitation.</h3>
            <p>Copy this code and send it to one friend. Keep this page open.</p>
            ${this.codeToSend()}
            <div class="flow-divider"></div>
            <h4>Have their reply?</h4>
            ${this.input('Paste their reply code', 'Your friend will send a reply code…')}
            ${this.control('answer', 'Connect with friend', true, !this.receivedCode.trim())}
            ${this.control('cancel', 'Cancel invitation')}`;
        if (this.flow === 'join') return html`
            <div class="flow-kicker">JOIN A SESSION <span>1 → 2</span></div>
            <h3>Got an invitation?</h3>
            <p>Ask your friend for an invitation code, then paste it below.</p>
            ${this.input('Invitation code', 'Paste your friend’s invitation code…')}
            <p class="small-note">Joining replaces your solo pattern with your friend’s session.</p>
            ${this.control('join', 'Create reply code', true, !this.receivedCode.trim())}
            ${this.control('cancel', 'Back')}`;
        if (this.flow === 'waiting') return html`
            <div class="flow-kicker">JOIN A SESSION <span>2 OF 2</span></div>
            <h3>Send your reply.</h3>
            <p>Send this code back to your friend. You’ll join as soon as they connect.</p>
            ${this.codeToSend()}
            <div class="waiting"><span class="status-dot"></span> Waiting for your friend…</div>
            ${this.control('cancel', 'Cancel')}`;
        return html`<div class="waiting"><span class="status-dot"></span> Connecting…</div>
            <p>Keep both pages open while your browsers connect.</p>${this.control('cancel', 'Cancel')}`;
    }
    protected render() {
        const ownNotes = this.tracks[this.user].filter(note => note >= 0).length;
        return html`
            <div class="app-shell">
                <header class="masthead">
                    <a class="brand" href="./" aria-label="ShareBeat home"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>sharebeat<span class="brand-period">.</span></a>
                    <span class="masthead-tag">A LITTLE STUDIO. A SHARED GROOVE.</span>
                    <span class="session-badge"><span class="status-dot"></span>${this.session.connected ? 'Live session' : 'Your own little studio'}</span>
                </header>
                <main>
                    <section class="intro" aria-labelledby="page-title">
                        <p class="eyebrow">MAKE SOMETHING TOGETHER</p>
                        <h1 id="page-title">A few notes. <span>Endless possibilities.</span></h1>
                        <p>Find your rhythm. Add a friend. See where the loop takes you.</p>
                    </section>
                    <div class="studio-layout">
                        <section class="sequencer" aria-labelledby="sequence-title">
                            <div class="sequencer-heading"><div><span class="eyebrow">THE SEQUENCER</span><h2 id="sequence-title">Your playground</h2></div>
                                <span class=${'instrument-pill player-' + this.user}><span class="instrument-dot"></span>${instruments[this.user]} <span>· you</span></span>
                            </div>
                            <div class="transport">
                                <button class="btn play-btn" data-action="play" @click=${this.togglePlayback} aria-label=${this.playing ? 'Pause playback' : 'Start playback'}>
                                    ${icon(this.playing ? 'pause' : 'play')}${this.playing ? 'Pause' : 'Play loop'}</button>
                                <div class="tempo"><strong>200</strong><span>BPM</span></div>
                                <div class="transport-separator"></div>
                                <span class="loop-length">16 <span>steps</span></span>
                                <label class="volume-control">${icon('volume')}<span class="sr-only">Volume</span>
                                    <input type="range" min="0" max="100" .value=${String(this.volume)} aria-label="Volume"
                                        @input=${(event: InputEvent) => {
                                            this.volume = Number((event.target as HTMLInputElement).value);
                                            if (this.drums) this.drums.gain.gain.setTargetAtTime(this.volume / 100 * 0.22, this.drums.dsp.currentTime, 0.015);
                                        }}></label>
                            </div>
                            <div class="grid-area">
                                <div class="step-ruler" aria-hidden="true">${Array.from({ length: 16 }, (_, step) => html`<span class=${this.step === step ? 'current' : ''}>${String(step + 1).padStart(2, '0')}</span>`)}</div>
                                <div class="grid-with-labels">
                                    <div class="pitch-ruler" aria-hidden="true">${Array.from({ length: 16 }, (_, row) => {
                                        const midi = (this.user === 2 ? 48 : 72) - row;
                                        return html`<span>${noteNames[midi % 12]}${Math.floor(midi / 12) - 1}</span>`;
                                    })}</div>
                                    <div id="matrix" class=${'player-' + this.user} aria-label="16 step synthesizer">
                                        ${Array.from({ length: 256 }, (_, cell) => {
                                            const step = cell % 16, row = Math.floor(cell / 16);
                                            const active = this.tracks.map(track => track[step] === row);
                                            return html`<button type="button" tabindex=${cell === this.focusedCell ? 0 : -1}
                                                aria-label=${'Step ' + (step + 1) + ', ' + noteNames[(72 - row) % 12] + ', note ' + (16 - row)}
                                                aria-pressed=${active[this.user] ? 'true' : 'false'}
                                                class=${classMap({ pad: true, selected: active.some(Boolean), current: this.step === step,
                                                    'beat-start': step % 4 === 0, 'row-shade': row % 2 === 0, userA: active[0], userB: active[1], userC: active[2], userD: active[3] })}
                                                @pointerdown=${(event: PointerEvent) => { if (event.button === 0) {
                                                    event.preventDefault(); this.focusedCell = cell; (event.currentTarget as HTMLElement).focus(); this.selectCell(cell);
                                                } }}
                                                @pointerover=${(event: PointerEvent) => { if (event.buttons === 1 && event.pointerType === 'mouse') this.selectCell(cell); }}
                                                @click=${(event: MouseEvent) => { if (event.detail === 0) this.selectCell(cell); }}
                                                @keydown=${(event: KeyboardEvent) => this.keyCell(event, cell)}>
                                                <span class="note-owners" aria-hidden="true">${active.map((on, user) => on ? html`<i class=${'player-' + user}></i>` : nothing)}</span>
                                            </button>`;
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div class="grid-footer"><p><span class="hint-dot"></span>Click to add a note. Click again to remove it.</p>
                                <button class="text-btn" data-action="clear" ?disabled=${ownNotes === 0 || !this.peer.canEdit} @click=${() => this.fillPattern(false)}>${icon('clear')}Clear my notes</button></div>
                            <div class="starter"><span>${ownNotes ? `${ownNotes} notes in your loop. Make it yours.` : 'A blank canvas. Not sure where to start?'}</span>
                                <button class="text-btn accent" data-action="demo" ?disabled=${!this.peer.canEdit} @click=${() => this.fillPattern(true)}>Try a melody ${icon('arrow')}</button></div>
                        </section>
                        <aside class="session-panel" aria-labelledby="session-title">
                            <div class="panel-heading">${icon('people')}<h2 id="session-title">The session</h2><span class="player-count">${this.session.players.length}<span>/4</span></span></div>
                            <ul class="player-list">${instruments.map((name, user) => {
                                const present = this.session.players.includes(user);
                                return html`<li class=${classMap({ 'player-row': true, present, yours: user === this.user })}>
                                    <span class=${'player-symbol player-' + user}>${['∿', '⠿', '≋', '⋀'][user]}</span>
                                    <div><strong>${name}${user === this.user ? html`<span class="you-tag">YOU</span>` : nothing}</strong><span>${present ? user === this.user ? descriptions[user] : 'Connected' : 'Waiting for a player'}</span></div>
                                    <span class=${present ? 'presence online' : 'presence'} aria-label=${present ? 'Connected' : 'Available'}></span>
                                </li>`;
                            })}</ul>
                            <section class="connection-flow" id="peer-controls" aria-busy=${this.busy}>${this.connectionFlow()}</section>
                            <p id="peer-status" class=${this.error ? 'connection-status error' : 'connection-status'} role="status" aria-live="polite">${this.error || this.status}</p>
                            ${this.session.connected ? html`<button class="text-btn leave-btn" data-action="leave" @click=${() => this.action('leave')}>Leave session</button>` : nothing}
                        </aside>
                    </div>
                </main>
                <footer class="app-footer"><span>Made for the joy of making music.</span><span>Browser instruments. Human connection.</span></footer>
            </div>`;
    }
}
customElements.define('share-beat', ShareBeat);
