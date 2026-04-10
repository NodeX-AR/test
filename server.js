const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;
const BACKEND_URL = 'wss://z-x-25-x.hf.space';  // Your plugin supports wss

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

// Match your plugin's WebSocket settings
const wss = new WebSocket.Server({ 
    server,
    perMessageDeflate: {
        zlibDeflateOptions: {
            chunkSize: 16384,  // matches http_max_chunk_size
            level: 6           // matches http_websocket_compression_level
        },
        zlibInflateOptions: {
            chunkSize: 16384
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        clientMaxWindowBits: 15,
        serverMaxWindowBits: 15,
        concurrencyLimit: 10
    },
    maxPayload: 2097151  // matches http_websocket_max_frame_length
});

wss.on('connection', (clientWs, req) => {
    console.log(`[${new Date().toISOString()}] Client connected`);
    
    // Match plugin's keepalive interval (5 seconds = 5000ms)
    clientWs.on('pong', () => {
        // Heartbeat received - plugin sends pings every 5 seconds
    });
    
    // Connect to backend with matching settings
    const backendWs = new WebSocket(BACKEND_URL, {
        perMessageDeflate: {
            level: 6,
            clientNoContextTakeover: true,
            serverNoContextTakeover: true
        },
        handshakeTimeout: 30000,
        maxPayload: 2097151
    });
    
    // Handle keepalive pings from the plugin
    const keepaliveInterval = setInterval(() => {
        if (backendWs.readyState === WebSocket.OPEN) {
            backendWs.ping();
        }
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.ping();
        }
    }, 5000); // Match plugin's keepalive interval
    
    // Forward messages with compression matching plugin
    clientWs.on('message', (data, isBinary) => {
        if (backendWs.readyState === WebSocket.OPEN) {
            backendWs.send(data, { binary: isBinary, compress: true });
        }
    });
    
    backendWs.on('message', (data, isBinary) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data, { binary: isBinary, compress: true });
        }
    });
    
    // Handle disconnections
    clientWs.on('close', (code, reason) => {
        console.log(`[${new Date().toISOString()}] Client disconnected: ${code}`);
        clearInterval(keepaliveInterval);
        if (backendWs.readyState === WebSocket.OPEN) backendWs.close();
    });
    
    backendWs.on('close', (code, reason) => {
        console.log(`[${new Date().toISOString()}] Backend disconnected: ${code}`);
        clearInterval(keepaliveInterval);
        if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
    });
    
    backendWs.on('error', (err) => {
        console.log(`[${new Date().toISOString()}] Backend error: ${err.message}`);
    });
    
    backendWs.on('open', () => {
        console.log(`[${new Date().toISOString()}] Connected to backend`);
    });
});

server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] ========================================`);
    console.log(`[${new Date().toISOString()}] ✅ Eaglercraft Proxy Running`);
    console.log(`[${new Date().toISOString()}] 📡 Port: ${PORT}`);
    console.log(`[${new Date().toISOString()}] 🔗 Backend: ${BACKEND_URL}`);
    console.log(`[${new Date().toISOString()}] ⏱️  Keepalive interval: 5000ms`);
    console.log(`[${new Date().toISOString()}] 🎮 Game: wss://z-x.duckdns.org`);
    console.log(`[${new Date().toISOString()}] ========================================`);
});
