const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;
const BACKEND_URL = 'wss://z-x-25-x.hf.space';

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Z&X Server</title></head>
        <body style="text-align:center;background:#1a1a2e;color:white;font-family:Arial;">
            <h1 style="color:#ff6b35;">🎮 Z&X Eaglercraft Server</h1>
            <p style="color:#4CAF50;">✅ PROXY RUNNING</p>
            <p>Connect: <code style="background:#000;padding:10px;display:inline-block;">wss://z-x.duckdns.org</code></p>
        </body>
        </html>
    `);
});

// Disable all extra features to match Eaglercraft's raw binary requirements
const wss = new WebSocket.Server({ 
    server,
    perMessageDeflate: false,
    maxPayload: 50 * 1024 * 1024 // 50MB for world data
});

wss.on('connection', (clientWs, req) => {
    console.log(`[${new Date().toISOString()}] Client connected`);
    
    // Force binary mode for both connections
    clientWs.binaryType = 'nodebuffer';
    
    const backendWs = new WebSocket(BACKEND_URL, {
        perMessageDeflate: false,
        handshakeTimeout: 10000,
        rejectUnauthorized: false
    });
    backendWs.binaryType = 'nodebuffer';
    
    backendWs.on('open', () => {
        console.log(`[${new Date().toISOString()}] ✅ Connected to backend`);
    });
    
    // Raw binary forwarding - no modifications
    clientWs.on('message', (data, isBinary) => {
        if (backendWs.readyState === WebSocket.OPEN) {
            backendWs.send(data, { binary: true, compress: false });
        }
    });
    
    backendWs.on('message', (data, isBinary) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data, { binary: true, compress: false });
        }
    });
    
    clientWs.on('close', (code, reason) => {
        console.log(`[${new Date().toISOString()}] Client disconnected: ${code}`);
        if (backendWs.readyState === WebSocket.OPEN) backendWs.close();
    });
    
    backendWs.on('close', (code, reason) => {
        console.log(`[${new Date().toISOString()}] Backend disconnected: ${code}`);
        if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
    });
    
    backendWs.on('error', (err) => {
        console.log(`[${new Date().toISOString()}] ❌ Backend error: ${err.message}`);
    });
});

server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] ========================================`);
    console.log(`[${new Date().toISOString()}] ✅ Eaglercraft Proxy Running`);
    console.log(`[${new Date().toISOString()}] 🎮 Game: wss://z-x.duckdns.org`);
    console.log(`[${new Date().toISOString()}] ========================================`);
});
