export interface CandidateSummary {
    total: number;
    host: number;
    reflexive: number;
    relay: number;
    mdns: number;
}
export function summarizeCandidates(sdp = ''): CandidateSummary {
    const lines = sdp.match(/^a=candidate:.*$/gm) ?? [];
    return {
        total: lines.length,
        host: lines.filter(line => / typ host\b/.test(line)).length,
        reflexive: lines.filter(line => / typ (?:srflx|prflx)\b/.test(line)).length,
        relay: lines.filter(line => / typ relay\b/.test(line)).length,
        mdns: lines.filter(line => /\.local\b/.test(line)).length,
    };
}
export interface ConnectionDiagnostics {
    time: string;
    browser: string;
    stage: string;
    connectionState: string;
    iceState: string;
    gatheringState: string;
    signalingState: string;
    localDescription: string | null;
    remoteDescription: string | null;
    localCandidates: CandidateSummary;
    remoteCandidates: CandidateSummary;
}
// Counts only: no addresses, SDP, invitation tokens, or fingerprints are included.
export function connectionDiagnostics(pc: RTCPeerConnection, stage: string): ConnectionDiagnostics {
    return {
        time: new Date().toISOString(), browser: navigator.userAgent, stage,
        connectionState: pc.connectionState, iceState: pc.iceConnectionState,
        gatheringState: pc.iceGatheringState, signalingState: pc.signalingState,
        localDescription: pc.localDescription?.type ?? null,
        remoteDescription: pc.remoteDescription?.type ?? null,
        localCandidates: summarizeCandidates(pc.localDescription?.sdp),
        remoteCandidates: summarizeCandidates(pc.remoteDescription?.sdp),
    };
}
export async function networkPermissions(): Promise<Record<string, string>> {
    const permissions: Record<string, string> = {};
    for (const name of ['local-network', 'loopback-network', 'local-network-access']) {
        try { permissions[name] = (await navigator.permissions.query({ name: name as PermissionName })).state; }
        catch (_) { /* This browser does not expose this permission. */ }
    }
    return permissions;
}
