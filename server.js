const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Z&X Server</title></head>
        <body>
            <h1>🎮 Z&X Eaglercraft Server</h1>
            <p>✅ Server is running!</p>
            <p>Connect using: <code>wss://z-x.duckdns.org</code></p>
        </body>
        </html>
    `);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs, req) => {
    console.log('Client connected');
    
    // Direct passthrough to HF Space - NO modification
    const targetWs = new WebSocket('wss://z-x-25-x.hf.space');
    
    // Forward everything exactly as-is
    clientWs.on('message', (data, isBinary) => {
        if (targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(data, { binary: isBinary });
        }
    });
    
    targetWs.on('message', (data, isBinary) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data, { binary: isBinary });
        }
    });
    
    clientWs.on('close', () => targetWs.close());
    targetWs.on('close', () => clientWs.close());
    targetWs.on('error', (err) => console.log('Backend error:', err.message));
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`✅ Passthrough proxy running on port ${port}`);
});
