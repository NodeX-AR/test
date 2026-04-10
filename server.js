const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;
// IMPORTANT: Use ws:// (not wss://) because your plugin has TLS disabled
const BACKEND_URL = 'ws://z-x-25-x.hf.space';

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Z&X Server</title></head>
        <body style="text-align:center;background:#1a1a2e;color:white;font-family:Arial;">
            <h1 style="color:#ff6b35;">🎮 Z&X Eaglercraft Server</h1>
            <p style="color:#4CAF50;">✅ ONLINE</p>
            <p>Connect: <code style="background:#000;padding:10px;display:inline-block;">wss://z-x.duckdns.org</code></p>
        </body>
        </html>
    `);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs, req) => {
    console.log(`[${new Date().toISOString()}] Client connected`);
    
    // Connect to HF Space using ws:// (non-SSL) to match plugin config
    const backendWs = new WebSocket(BACKEND_URL);
    
    // Forward client → backend
    clientWs.on('message', (data, isBinary) => {
        if (backendWs.readyState === WebSocket.OPEN) {
            backendWs.send(data, { binary: isBinary });
        }
    });
    
    // Forward backend → client
    backendWs.on('message', (data, isBinary) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data, { binary: isBinary });
        }
    });
    
    // Handle disconnections
    clientWs.on('close', () => {
        console.log(`[${new Date().toISOString()}] Client disconnected`);
        if (backendWs.readyState === WebSocket.OPEN) backendWs.close();
    });
    
    backendWs.on('close', () => {
        console.log(`[${new Date().toISOString()}] Backend disconnected`);
        if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
    });
    
    backendWs.on('error', (err) => {
        console.log(`[${new Date().toISOString()}] Backend error: ${err.message}`);
    });
});

server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] ========================================`);
    console.log(`[${new Date().toISOString()}] ✅ Proxy running on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] 🔗 Client connects via: wss://z-x.duckdns.org`);
    console.log(`[${new Date().toISOString()}] 🔗 Backend connected via: ${BACKEND_URL}`);
    console.log(`[${new Date().toISOString()}] ========================================`);
});
