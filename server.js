const WebSocket = require('ws');
const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 8080;
const BACKEND_URL = 'https://z-x-25-x.hf.space';  // Use https://, ws library will upgrade

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

const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs, req) => {
    console.log(`[${new Date().toISOString()}] Client connected`);
    
    // Use wss:// directly - no redirect needed
    const backendWs = new WebSocket('wss://z-x-25-x.hf.space', {
        handshakeTimeout: 10000,
        rejectUnauthorized: false,  // Ignore SSL cert issues
        followRedirects: true       // Follow redirects if any
    });
    
    backendWs.on('open', () => {
        console.log(`[${new Date().toISOString()}] ✅ Connected to backend`);
    });
    
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
    console.log(`[${new Date().toISOString()}] ✅ Proxy running on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] 🔗 Backend: wss://z-x-25-x.hf.space`);
    console.log(`[${new Date().toISOString()}] 🎮 Game: wss://z-x.duckdns.org`);
    console.log(`[${new Date().toISOString()}] ========================================`);
});
