
// Native WebRTC data channels. Invitations carry complete SDP/ICE descriptions;
// no database, signaling endpoint, STUN, or TURN service is contacted.
export interface SessionInfo {
    host: boolean;
    players: number[];
    pending: boolean;
    connected: boolean;
}

export class PeerSession {
    public userid = 0;
    public onStatus: (message: string) => void = () => {};
    public onClock: (offset: number) => void = () => {};
    public onSessionChange: (session: SessionInfo) => void = () => {};
    private sessionPlayers = [0];
    private host = true;
    private peers = new Map<number, any>();
    private tracks: number[][] = this.emptyTracks();
    private pending: any = null;
    private clockTimer: any;
    private clockSamples: number[] = [];

    constructor(private callback: (user: number, step: number, note: number) => any,
                private callbackID: (user: number) => any) {}

    private emptyTracks(): number[][] {
        return Array.from({ length: 4 }, () => Array(16).fill(-1));
    }

    public connect(): void {
        this.callbackID(this.userid);
        this.status('Solo session. Create an invitation to add a player.');
    }

    public get session(): SessionInfo {
        const players = this.host
            ? [0, ...Array.from(this.peers.values()).filter(peer => peer.channel?.readyState === 'open').map(peer => peer.slot)]
            : this.sessionPlayers;
        return { host: this.host, players, pending: !!this.pending, connected: this.host ? players.length > 1 : this.userid > 0 };
    }
    private status(message: string): void {
        this.onSessionChange(this.session);
        this.onStatus(message);
    }
    private validNote(step: any, note: any): boolean {
        return Number.isInteger(step) && step >= 0 && step < 16 &&
            Number.isInteger(note) && note >= -1 && note < 16;
    }
    private send(peer: any, message: any): void {
        if (peer.channel && peer.channel.readyState === 'open') {
            if (peer.channel.bufferedAmount > 65536) {
                this.drop(peer);
                this.status('A slow connection was closed. Invite that player again.');
                return;
            }
            try { peer.channel.send(JSON.stringify(message)); }
            catch (_) { this.drop(peer); }
        }
    }
    private broadcast(message: any): void {
        this.peers.forEach(peer => this.send(peer, message));
    }
    private snapshot(): any { return { type: 'state', tracks: this.tracks, players: this.session.players }; }
    private updatePlayers(players: any): void {
        if (Array.isArray(players) && players.length <= 4 &&
            players.every(user => Number.isInteger(user) && user >= 0 && user < 4)) {
            this.sessionPlayers = [...new Set<number>(players)];
            this.onSessionChange(this.session);
        }
    }
    private renderState(tracks: any): void {
        if (!Array.isArray(tracks) || tracks.length !== 4 ||
            tracks.some(row => !Array.isArray(row) || row.length !== 16 ||
                row.some((note, step) => !this.validNote(step, note)))) return;
        this.tracks = tracks.map(row => row.slice());
        this.tracks.forEach((row, user) => row.forEach((note, step) => this.callback(user, step, note)));
    }
    public get canEdit(): boolean { return this.host || this.userid > 0; }
    public sendData(step: number, note: number): void {
        if (!this.canEdit || !this.validNote(step, note)) return;
        this.tracks[this.userid][step] = note;
        if (this.host) this.broadcast({ type: 'note', user: this.userid, step, note });
        else this.peers.forEach(peer => this.send(peer, { type: 'note', step, note }));
    }

    private receive(peer: any, raw: any): void {
        if (typeof raw !== 'string' || raw.length > 8192) return;
        let message: any;
        try { message = JSON.parse(raw); } catch (_) { return; }
        if (!message || typeof message !== 'object') return;
        if (this.host) {
            if (message.type === 'ping' && Number.isFinite(message.sent)) {
                this.send(peer, { type: 'pong', sent: message.sent, time: Date.now() });
            }
            if (message.type !== 'note' || !this.validNote(message.step, message.note)) return;
            // The connection determines the instrument, never a client supplied ID.
            this.tracks[peer.slot][message.step] = message.note;
            this.callback(peer.slot, message.step, message.note);
            this.broadcast({ type: 'note', user: peer.slot, step: message.step, note: message.note });
        } else {
            if (message.type === 'welcome' && Number.isInteger(message.user) && message.user > 0 && message.user < 4) {
                this.userid = message.user;
                this.callbackID(this.userid);
                this.renderState(message.tracks);
                this.updatePlayers(message.players);
                this.status('Connected as player ' + (this.userid + 1) + '.');
            } else if (message.type === 'state') {
                this.renderState(message.tracks);
                this.updatePlayers(message.players);
            }
            else if (message.type === 'note' && Number.isInteger(message.user) && message.user >= 0 && message.user < 4 &&
                     this.validNote(message.step, message.note)) {
                this.tracks[message.user][message.step] = message.note;
                this.callback(message.user, message.step, message.note);
            } else if (message.type === 'pong' && Number.isFinite(message.sent) && Number.isFinite(message.time)) {
                const rtt = Date.now() - message.sent;
                if (rtt < 0 || rtt > 2000) return;
                this.clockSamples.push(message.time + rtt / 2 - Date.now());
                if (this.clockSamples.length > 5) this.clockSamples.shift();
                const sorted = this.clockSamples.slice().sort((a, b) => a - b);
                this.onClock(sorted[Math.floor(sorted.length / 2)]);
            }
        }
    }

    private attach(peer: any, channel: RTCDataChannel): void {
        peer.channel = channel;
        channel.onmessage = event => this.receive(peer, event.data);
        channel.onclose = () => this.drop(peer);
        channel.onerror = () => this.drop(peer);
        channel.onopen = () => {
            clearTimeout(peer.timer);
            if (this.pending === peer) this.pending = null;
            if (this.host) {
                this.send(peer, { type: 'welcome', user: peer.slot, tracks: this.tracks, players: this.session.players });
                this.broadcast(this.snapshot());
                this.status(this.session.players.length + ' players in this session.');
            } else {
                const ping = () => this.send(peer, { type: 'ping', sent: Date.now() });
                ping();
                this.clockTimer = setInterval(ping, 3000);
            }
        };
    }
    private createPeer(slot: number): any {
        if (typeof RTCPeerConnection === 'undefined') throw new Error('This browser does not support WebRTC. Solo play is available.');
        const peer: any = { slot, pc: new RTCPeerConnection({ iceServers: [] }) };
        this.peers.set(slot, peer);
        peer.pc.onconnectionstatechange = () => {
            if (peer.pc.connectionState === 'failed' || peer.pc.connectionState === 'closed') this.drop(peer);
        };
        peer.timer = setTimeout(() => {
            this.drop(peer);
            this.status('Connection timed out. Create a new invitation; these networks may need a relay service.');
        }, 120000);
        return peer;
    }
    private drop(peer: any): void {
        if (this.peers.get(peer.slot) !== peer) return;
        this.peers.delete(peer.slot);
        clearTimeout(peer.timer);
        if (this.pending === peer) this.pending = null;
        peer.pc.close();
        if (this.host) {
            this.tracks[peer.slot].fill(-1);
            for (let step = 0; step < 16; step++) this.callback(peer.slot, step, -1);
            this.broadcast(this.snapshot());
            this.status('Player disconnected. Their instrument is available again.');
        } else {
            clearInterval(this.clockTimer);
            this.host = true;
            this.userid = 0;
            this.sessionPlayers = [0];
            this.clockSamples = [];
            this.onClock(0);
            this.callbackID(0);
            this.renderState(this.emptyTracks());
            this.status('Host disconnected. You now have a new solo session.');
        }
    }
    private async description(peer: any): Promise<string> {
        const pc: RTCPeerConnection = peer.pc;
        if (pc.iceGatheringState !== 'complete') await new Promise<void>((resolve, reject) => {
            const finish = (error?: Error) => {
                clearTimeout(timer);
                pc.removeEventListener('icegatheringstatechange', check);
                error ? reject(error) : resolve();
            };
            const check = () => { if (pc.iceGatheringState === 'complete') finish(); };
            const timer = setTimeout(() => finish(new Error('Could not gather connection details. Try again.')), 15000);
            pc.addEventListener('icegatheringstatechange', check);
            check();
        });
        return JSON.stringify({ app: 'sharebeat', version: 1, token: peer.token, description: pc.localDescription });
    }
    private parse(code: string, type: string): any {
        if (code.length > 100000) throw new Error('Connection code is too large.');
        let data: any;
        try { data = JSON.parse(code.trim()); } catch (_) { throw new Error('Paste the complete connection code.'); }
        if (!data || data.app !== 'sharebeat' || data.version !== 1 || typeof data.token !== 'string' ||
            !data.description || data.description.type !== type || typeof data.description.sdp !== 'string') {
            throw new Error('This is not a ShareBeat ' + type + ' code.');
        }
        return data;
    }
    public async createInvitation(): Promise<string> {
        if (!this.host) throw new Error('Only the session host can invite players.');
        if (this.pending) throw new Error('Finish or cancel the current invitation first.');
        const slot = [1, 2, 3].find(value => !this.peers.has(value));
        if (slot === undefined) throw new Error('This session already has four players.');
        const peer = this.createPeer(slot);
        this.pending = peer;
        this.onSessionChange(this.session);
        peer.token = crypto.randomUUID();
        this.attach(peer, peer.pc.createDataChannel('sharebeat', { ordered: true }));
        try {
            await peer.pc.setLocalDescription(await peer.pc.createOffer());
            return await this.description(peer);
        } catch (error) { this.drop(peer); throw error; }
    }
    public async acceptInvitation(code: string): Promise<string> {
        const data = this.parse(code, 'offer');
        if (!this.host || this.peers.size) throw new Error('Leave the current session before joining another host.');
        const peer = this.createPeer(0);
        this.host = false;
        peer.token = data.token;
        peer.pc.ondatachannel = event => this.attach(peer, event.channel);
        try {
            await peer.pc.setRemoteDescription(data.description);
            await peer.pc.setLocalDescription(await peer.pc.createAnswer());
            return await this.description(peer);
        } catch (error) { this.drop(peer); throw error; }
    }
    public async acceptAnswer(code: string): Promise<void> {
        const data = this.parse(code, 'answer');
        if (!this.pending || this.pending.token !== data.token) throw new Error('This answer does not match the current invitation.');
        await this.pending.pc.setRemoteDescription(data.description);
    }
    public cancelInvitation(): void { if (this.pending) this.drop(this.pending); }
    public disconnect(): void {
        Array.from(this.peers.values()).forEach(peer => this.drop(peer));
        clearInterval(this.clockTimer);
    }

}
