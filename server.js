const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

// Try different backend URLs - uncomment one at a time
const BACKEND_URLS = [
    'wss://z-x-25-x.hf.space'   // Standard secure WebSocket
    //'ws://z-x-25-x.hf.space'       // Non-secure WebSocket
    //'wss://z-x-25-x.hf.space:25565' // Minecraft port
    //'ws://z-x-25-x.hf.space:25565'  // Minecraft port non-secure
    //'wss://z-x-25-x.hf.space:443'   // Explicit HTTPS port
    //'ws://z-x-25-x.hf.space:80'      // Explicit HTTP port
];

// Use the first one that worked (start with the one that works directly)
let BACKEND_URL = BACKEND_URLS[0]; // Start with wss:// which works directly

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
            <p>Backend: ${BACKEND_URL}</p>
        </body>
        </html>
    `);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs, req) => {
    console.log(`[${new Date().toISOString()}] Client connected`);
    console.log(`[${new Date().toISOString()}] Attempting to connect to backend: ${BACKEND_URL}`);
    
    // Add connection timeout
    let connectionTimeout = setTimeout(() => {
        console.log(`[${new Date().toISOString()}] Backend connection timeout`);
        clientWs.close(1011, 'Backend connection timeout');
    }, 10000);
    
    const backendWs = new WebSocket(BACKEND_URL, {
        handshakeTimeout: 5000,
        rejectUnauthorized: false  // Ignore SSL certificate issues
    });
    
    backendWs.on('open', () => {
        clearTimeout(connectionTimeout);
        console.log(`[${new Date().toISOString()}] ✅ Connected to backend: ${BACKEND_URL}`);
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
        clearTimeout(connectionTimeout);
        if (backendWs.readyState === WebSocket.OPEN) backendWs.close();
    });
    
    backendWs.on('close', (code, reason) => {
        console.log(`[${new Date().toISOString()}] Backend disconnected: ${code} - ${reason || 'no reason'}`);
        clearTimeout(connectionTimeout);
        if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
    });
    
    backendWs.on('error', (err) => {
        clearTimeout(connectionTimeout);
        console.log(`[${new Date().toISOString()}] ❌ Backend connection error: ${err.message}`);
        clientWs.close(1011, `Backend error: ${err.message}`);
    });
});

server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] ========================================`);
    console.log(`[${new Date().toISOString()}] ✅ Proxy running on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] 🔗 Backend: ${BACKEND_URL}`);
    console.log(`[${new Date().toISOString()}] 🎮 Game: wss://z-x.duckdns.org`);
    console.log(`[${new Date().toISOString()}] ========================================`);
});
