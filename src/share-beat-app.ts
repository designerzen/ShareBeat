import { LitElement, html, nothing } from 'lit';
import { PeerSession, type SessionInfo } from './peer-session';
import { createSignalLink, readSignalLink, type SignalLink } from './signal-links';
import { defaultWaveforms, waveforms, type Waveform } from './audio/waveforms';

import './share-beat';
import { GridAudioController } from './audio/grid-audio-controller';
import type { ShareBeat, NoteChangeDetail } from './share-beat';

type Flow = 'idle' | 'host' | 'waiting' | 'connecting' | 'delivered' | 'return';

export class ShareBeatApp extends LitElement {
    static properties = {
        tracks: { state: true }, user: { state: true }, clockOffset: { state: true },
        status: { state: true }, receivedLink: { state: true }, outputLink: { state: true },
        busy: { state: true }, flow: { state: true },
        session: { state: true }, error: { state: true }, copied: { state: true },
        trackWaveforms: { state: true }
    };
    declare private tracks: number[][];
    declare private user: number;
    declare private clockOffset: number;
    declare private status: string;
    declare private receivedLink: string;
    declare private outputLink: string;
    declare private busy: boolean;
    declare private flow: Flow;
    declare private session: SessionInfo;
    declare private error: string;
    declare private copied: boolean;
    declare private trackWaveforms: Waveform[];
    private peer = new PeerSession(
        (user, step, note) => this.setNote(user, step, note),
        user => { this.user = user; }
    );
    private onPageHide = () => this.peer.disconnect();
    private onHashChange = () => { void this.consumeLocation(); };
    private replyChannel: BroadcastChannel;
    private replyRequest = '';
    private replyTimer: ReturnType<typeof setTimeout>;


    constructor() {
        super();
        this.trackWaveforms = [...defaultWaveforms];
        this.tracks = Array.from({ length: 4 }, () => Array(16).fill(-1));
        this.user = 0;
        this.clockOffset = 0;
        this.status = '';
        this.receivedLink = '';
        this.outputLink = '';
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
            if (/timed out|could not|host disconnected/i.test(message)) this.error = message;
        };
        this.peer.onSessionChange = session => {
            this.session = session;
            if ((!session.pending && this.flow === 'host') ||
                (session.connected && ['waiting', 'connecting'].includes(this.flow)) ||
                (session.host && this.flow === 'waiting')) this.resetFlow();
        };
        this.peer.onClock = offset => { this.clockOffset = offset; };
        this.peer.onWaveform = (user, waveform) => {
            this.trackWaveforms = this.trackWaveforms.map((value, index) => index === user ? waveform : value);
        };
        this.peer.connect();
        window.addEventListener('pagehide', this.onPageHide);
        window.addEventListener('hashchange', this.onHashChange);
        if (typeof BroadcastChannel !== 'undefined') {
            this.replyChannel = new BroadcastChannel('sharebeat-replies-v1');
            this.replyChannel.onmessage = event => { void this.routeReply(event.data); };
        }
    }
    disconnectedCallback(): void {
        window.removeEventListener('pagehide', this.onPageHide);
        window.removeEventListener('hashchange', this.onHashChange);
        this.replyChannel?.close();
        clearTimeout(this.replyTimer);
        this.peer.disconnect();
        super.disconnectedCallback();
    }
    protected firstUpdated(): void {
        new GridAudioController(this.querySelector<ShareBeat>('share-beat'));
        void this.consumeLocation();
    }

    private async consumeLocation(): Promise<void> {
        if (!/^#(?:invite|reply)=/.test(location.hash)) return;
        const link = location.href;
        // Remove connection details from the address bar without reloading this tab.
        history.replaceState(history.state, '', location.pathname + location.search);
        await this.consumeLink(link);
    }
    private async applyReply(signal: SignalLink): Promise<void> {
        await this.peer.acceptAnswer(signal.code);
        this.flow = 'connecting';
        this.status = 'Reply received. Connecting to your friend…';
    }
    private async consumeLink(link: string): Promise<void> {
        if (this.busy) return;
        this.busy = true;
        this.error = '';
        await this.showShare();
        try {
            const signal = await readSignalLink(link);
            if (signal.kind === 'invite') {
                if (this.session.connected || this.session.pending || this.tracks.some(row => row.some(note => note >= 0))) {
                    throw new Error('Open the invitation in a new tab so your current session stays open.');
                }
                this.flow = 'connecting';
                this.status = 'Opening your friend’s invitation…';
                this.outputLink = await createSignalLink(await this.peer.acceptInvitation(signal.code));
                this.flow = 'waiting';
                this.copied = false;
            } else if (signal.token === this.peer.invitationToken) {
                await this.applyReply(signal);
            } else {
                this.outputLink = link;
                this.flow = 'connecting';
                this.status = 'Finding your original ShareBeat tab…';
                this.replyRequest = crypto.randomUUID();
                this.replyChannel?.postMessage({ type: 'reply', request: this.replyRequest, token: signal.token, link });
                clearTimeout(this.replyTimer);
                this.replyTimer = setTimeout(() => {
                    this.flow = 'return';
                    this.error = 'Your original tab was not found in this browser. Keep it open, then paste this reply link into Share → Paste a link in that tab.';
                }, 2500);
            }
            this.receivedLink = '';
        } catch (error) { this.error = error.message; }
        finally { this.busy = false; }
    }
    private async routeReply(message: any): Promise<void> {
        if (!message || typeof message.request !== 'string' || message.request.length > 100) return;
        if (message.type === 'reply-result' && message.request === this.replyRequest) {
            clearTimeout(this.replyTimer);
            this.replyRequest = '';
            this.flow = message.accepted ? 'delivered' : 'return';
            this.error = message.accepted ? '' : String(message.error).slice(0, 300);
        } else if (message.type === 'reply' && message.token === this.peer.invitationToken &&
                   typeof message.link === 'string' && message.link.length <= 22000) {
            try {
                const signal = await readSignalLink(message.link);
                if (signal.kind !== 'reply' || signal.token !== this.peer.invitationToken) return;
                await this.applyReply(signal);
                this.replyChannel?.postMessage({ type: 'reply-result', request: message.request, accepted: true });
                await this.showShare();
            } catch (error) {
                this.replyChannel?.postMessage({ type: 'reply-result', request: message.request, accepted: false, error: error.message });
            }
        }
    }
    private resetFlow(): void {
        this.flow = 'idle';
        this.receivedLink = '';
        this.outputLink = '';
        this.copied = false;
    }
    private setNote(user: number, step: number, note: number): void {
        this.tracks = this.tracks.map((row, index) =>
            index === user ? row.map((value, column) => column === step ? note : value) : row);
    }
    private cycleWaveform(): void {
        if (!this.peer.canEdit) return;
        const current = waveforms.indexOf(this.trackWaveforms[this.user]);
        this.peer.sendWaveform(waveforms[(current + 1) % waveforms.length]);
    }
    private noteChanged(event: CustomEvent<NoteChangeDetail>): void {
        const { user, step, note } = event.detail;
        this.setNote(user, step, note);
        this.peer.sendData(step, note);
    }
    private async action(action: string): Promise<void> {
        this.error = '';
        if (action === 'open-link') { await this.consumeLink(this.receivedLink); return; }
        this.busy = true;
        try {
            if (action === 'invite') {
                this.peer.cancelInvitation();
                this.status = 'Preparing your invitation link…';
                this.outputLink = await createSignalLink(await this.peer.createInvitation());
                this.flow = 'host';
                this.receivedLink = '';
                this.copied = false;
            } else if (action === 'copy') {
                try {
                    await navigator.clipboard.writeText(this.outputLink);
                    this.copied = true;
                } catch (_) {
                    this.querySelector<HTMLInputElement>('#peer-output')?.select();
                    this.error = 'Link selected. Copy it using your keyboard or the selection menu.';
                }
            } else if (action === 'cancel') {
                clearTimeout(this.replyTimer);
                this.replyRequest = '';
                if (!this.session.host) this.peer.disconnect();
                else this.peer.cancelInvitation();
                this.resetFlow();
            } else if (action === 'leave') {
                this.peer.disconnect();
                this.resetFlow();
            }
        } catch (error) { this.error = error.message; }
        finally { this.busy = false; }
    }
    private control(action: string, label: string, primary = false, disabled = false) {
        return html`<button type="button" class=${primary ? 'btn primary' : 'btn secondary'} data-action=${action}
            ?disabled=${this.busy || disabled} @click=${() => this.action(action)}>${label}</button>`;
    }
    private linkToSend(kind: 'invitation' | 'reply') {
        return html`<label class="link-label" for="peer-output">${kind === 'invitation' ? 'Invitation link' : 'Reply link'}</label>
            <input type="text" id="peer-output" readonly .value=${this.outputLink} @click=${(event: Event) => (event.target as HTMLInputElement).select()}>
            ${this.control('copy', this.copied ? 'Link copied' : 'Copy ' + kind + ' link', true)}`;
    }
    private connectionFlow() {
        if (this.busy && !this.outputLink) return html`<p role="status">Preparing your link…</p>`;
        if (this.flow === 'host') return html`
            <p>Send this link to your friend. Keep this tab open.</p>
            ${this.linkToSend('invitation')}
            <p class="next-step">Next: open the reply link they send back. You’ll connect automatically.</p>`;
        if (this.flow === 'waiting') return html`
            <p>Send this link back to your friend.</p>
            ${this.linkToSend('reply')}
            <p class="next-step">Keep this tab open. Your friend opens the reply link to finish connecting.</p>`;
        if (this.flow === 'delivered') return html`<p class="reply-delivered">Reply delivered. Switch back to your original ShareBeat tab to play.</p>`;
        if (this.flow === 'return') return html`${this.linkToSend('reply')}`;
        if (this.flow === 'connecting') return html`<p role="status">${this.status}</p>`;
        return html`
            ${this.session.connected ? html`<p class="connected-message">Connected · ${this.session.players.length} players. Click the grid to play.</p>` : nothing}
            ${this.session.host ? this.control('invite', this.session.players.length === 4 ? 'Session full' : this.session.connected ? 'Invite another friend' : 'Create invitation link', true, this.session.players.length === 4) : nothing}`;
    }
    private troubleshooting() {
        return html`<details class="link-help"><summary>Paste a link / connection help</summary>
            <form @submit=${(event: SubmitEvent) => { event.preventDefault(); void this.action('open-link'); }}>
                <label class="link-label" for="peer-input">Invitation or reply link</label>
                <input id="peer-input" type="url" placeholder="https://…" required .value=${this.receivedLink}
                    @input=${(event: Event) => { this.receivedLink = (event.target as HTMLInputElement).value; }}>
                <button class="btn secondary" type="submit" ?disabled=${this.busy || !this.receivedLink.trim()}>Open link</button>
            </form>
            <p class="network-note">Keep the original tabs open. Direct connections work best on the same Wi-Fi; some networks require a relay, which this app does not use.</p>
            ${this.session.pending || this.flow === 'waiting' ? this.control('cancel', 'Cancel invitation') : nothing}
            ${this.session.connected ? this.control('leave', 'Leave session') : nothing}
        </details>`;
    }
    private async showShare(): Promise<void> {
        await this.updateComplete;
        const dialog = this.querySelector<HTMLDialogElement>('#share-dialog');
        if (!dialog.open) dialog.showModal();
    }
    private async openShare(): Promise<void> {
        await this.showShare();
        if (this.flow === 'idle' && this.session.host && !this.session.connected && !this.session.pending && !this.busy) await this.action('invite');
    }
    private closeShare(): void {
        this.querySelector<HTMLDialogElement>('#share-dialog').close();
        this.querySelector<HTMLButtonElement>('[data-action="share"]').focus();
    }
    protected render() {
        return html`
            <main class=${'surface instrument-' + this.user} aria-label="ShareBeat synthesizer">
                <share-beat .tracks=${this.tracks} .user=${this.user} .trackWaveforms=${this.trackWaveforms}
                    oscillator-type=${this.trackWaveforms[this.user]} clock-offset=${this.clockOffset}
                    ?readonly=${!this.peer.canEdit} @note-change=${this.noteChanged}
                    @audio-error=${(event: CustomEvent<Error>) => { this.error = 'Audio could not start: ' + event.detail.message; }}></share-beat>
                <footer class="grid-tools">
                    ${this.user === 1 ? html`<span class="instrument-name">Drums</span>` : html`
                        <button type="button" class="instrument-name" data-action="waveform"
                            aria-label=${'Change oscillator waveform, current: ' + this.trackWaveforms[this.user]}
                            title="Click to change waveform" @click=${this.cycleWaveform}>
                            ${this.user === 2 ? 'Bass · ' : ''}${({ sine: 'Sine', triangle: 'Triangle', square: 'Square', sawtooth: 'Saw' })[this.trackWaveforms[this.user]]}
                        </button>`}
                    <button type="button" data-action="share" @click=${this.openShare}>Share</button>
                </footer>
                <dialog id="share-dialog" aria-labelledby="share-title" @click=${(event: MouseEvent) => {
                    const dialog = event.currentTarget as HTMLDialogElement;
                    const box = dialog.getBoundingClientRect();
                    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) this.closeShare();
                }}>
                    <div class="dialog-heading"><h1 id="share-title">${this.flow === 'host' ? 'Invite a friend' : this.flow === 'waiting' ? 'Send your reply' : this.flow === 'delivered' ? 'Reply delivered' : this.flow === 'connecting' ? 'Connecting' : this.session.connected ? 'Connected' : 'Share'}</h1>
                        <button class="close-dialog" type="button" aria-label="Close share dialog" @click=${this.closeShare}>×</button></div>
                    <section id="peer-controls" aria-busy=${this.busy}>${this.connectionFlow()}${this.troubleshooting()}</section>
                    <p id="peer-status" role="status" aria-live="polite" ?hidden=${!this.error}>
                        ${this.error}</p>
                </dialog>
            </main>`;
    }
}
customElements.define('share-beat-app', ShareBeatApp);
