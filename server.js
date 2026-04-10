const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;
// Use ws:// because your plugin has TLS disabled
const BACKEND_URL = 'ws://z-x-25-x.hf.space';

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Z&X Server</title></head>
        <body style="text-align:center;background:#1a1a2e;color:white;">
            <h1 style="color:#ff6b35;">🎮 Z&X Eaglercraft Server</h1>
            <p>Connect: <code>wss://z-x.duckdns.org</code></p>
        </body>
        </html>
    `);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs, req) => {
    console.log('Client connected');
    
    const backendWs = new WebSocket(BACKEND_URL);
    
    clientWs.on('message', (data, isBinary) => {
        if (backendWs.readyState === WebSocket.OPEN) {
            backendWs.send(data, { binary: isBinary });
        }
    });
    
    backendWs.on('message', (data, isBinary) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data, { binary: isBinary });
        }
    });
    
    clientWs.on('close', () => backendWs.close());
    backendWs.on('close', () => clientWs.close());
});

server.listen(PORT, () => {
    console.log(`Proxy running on port ${PORT}`);
    console.log(`Backend: ${BACKEND_URL}`);
});
