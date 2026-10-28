const dgram = require('node:dgram');

// A real UDP STUN Binding responder for browser integration tests (RFC 8489).
// Keep ICE discovery on the test machine instead of relying on public UDP access.
async function startStun() {
  const address = '127.0.0.1';
  const socket = dgram.createSocket('udp4');
  let requests = 0;
  socket.on('message', (request, remote) => {
    if (request.length < 20 || request.readUInt16BE(0) !== 0x0001 ||
        request.readUInt32BE(4) !== 0x2112a442) return;
    requests++;
    const response = Buffer.alloc(32);
    response.writeUInt16BE(0x0101, 0); // Binding success
    response.writeUInt16BE(12, 2);
    request.copy(response, 4, 4, 20); // Magic cookie and transaction ID
    response.writeUInt16BE(0x0020, 20); // XOR-MAPPED-ADDRESS
    response.writeUInt16BE(8, 22);
    response[25] = 1; // IPv4
    response.writeUInt16BE(remote.port ^ 0x2112, 26);
    const octets = remote.address.split('.').map(Number);
    for (let i = 0; i < 4; i++) response[28 + i] = octets[i] ^ request[4 + i];
    socket.send(response, remote.port, remote.address);
  });
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.bind(0, address, resolve);
  });
  return {
    url: `stun:${address}:${socket.address().port}`,
    get requests() { return requests; },
    close: () => new Promise(resolve => socket.close(resolve)),
  };
}

async function useStun(context, url) {
  await context.addInitScript(url => {
    const Native = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends Native {
      constructor(config) {
        super({ ...config, iceServers: [{ urls: url }] });
        window.requestedIceServers = config?.iceServers;
      }
    };
  }, url);
}

module.exports = { startStun, useStun };
