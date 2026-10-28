// Connection details live in the URL fragment, so static hosting never receives them.
// Compress SDP to keep invitation links short enough for ordinary messages.
export interface SignalLink {
    kind: 'invite' | 'reply';
    token: string;
    code: string;
}
const MAX_CODE = 65536;

export async function createSignalLink(code: string, base = location.href): Promise<string> {
    if (code.length > MAX_CODE) throw new Error('Connection details are too large to share.');
    const data = JSON.parse(code);
    const bytes = new TextEncoder().encode(code);
    const compressed = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer();
    const encoded = btoa(String.fromCharCode(...new Uint8Array(compressed)))
        .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
    const url = new URL(base);
    url.hash = `${data.description.type === 'offer' ? 'invite' : 'reply'}=1.${encoded}`;
    return url.href;
}

export async function readSignalLink(value: string): Promise<SignalLink> {
    let url: URL;
    try { url = new URL(value.trim()); }
    catch (_) { throw new Error('Paste the complete ShareBeat link.'); }
    const match = /^#(invite|reply)=1\.([A-Za-z0-9_-]+)$/.exec(url.hash);
    if (!['http:', 'https:'].includes(url.protocol) || !match || match[2].length > 20000) {
        throw new Error('This is not a valid ShareBeat invitation or reply link.');
    }
    try {
        const binary = atob(match[2].replaceAll('-', '+').replaceAll('_', '/'));
        const compressed = Uint8Array.from(binary, char => char.charCodeAt(0));
        const reader = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                size += value.length;
                if (size > MAX_CODE) { await reader.cancel(); throw new Error('Link is too large.'); }
                chunks.push(value);
            }
        } finally { reader.releaseLock(); }
        const buffer = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
        const code = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        const data = JSON.parse(code);
        if (data?.app !== 'sharebeat' || data.version !== 1 || typeof data.token !== 'string' ||
            !/^[a-f0-9-]{36}$/.test(data.token) || !Number.isFinite(data.expires) ||
            data.description?.type !== (match[1] === 'invite' ? 'offer' : 'answer') ||
            typeof data.description.sdp !== 'string' || data.description.sdp.length > 60000) throw new Error();
        if (data.expires < Date.now()) throw new Error('expired');
        return { kind: match[1] as SignalLink['kind'], token: data.token, code };
    } catch (error) {
        if (error.message === 'expired') throw new Error('This link has expired. Ask your friend for a new invitation.');
        throw new Error('This link is incomplete or damaged. Ask your friend to copy the whole link again.');
    }
}
