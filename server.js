const Net = require('net');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const bufferReplace = require('buffer-replace');
const crypto = require('crypto');
const Jimp = require('jimp');

// ============ CONFIGURATION ============
const listenPort = process.env.PORT || 8080;
const backendUrl = "wss://z-x-25-x.hf.space";  // Full WebSocket URL
const serverName = "Z&X Eaglercraft Server";
const serverMotd = ["Welcome to Z&X", "Eaglercraft Server!"];
const serverMaxPlayers = 20;
const serverOnlinePlayers = 1;
const serverPlayers = ["Join us at", "z-x.duckdns.org!"];
const serverIcon = null;
const timeout = 10000;
const changeProtocol = false;  // IMPORTANT: Set to false for 1.12
const removeSkin = true;
const prefix = "www";
// ======================================

let iconBuff = null;

if (serverIcon !== null) {
    Jimp.read(serverIcon, function (err, image) {
        if (!err) iconBuff = Buffer.from(image.bitmap.data);
        else console.log("Failed to load icon:", err);
    });
}

let files = [];
let cache = {};

function throughDirectory(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
        return;
    }
    fs.readdirSync(directory).forEach(file => {
        const absolute = path.join(directory, file);
        if (fs.statSync(absolute).isDirectory()) return throughDirectory(absolute);
        else return files.push(absolute.toString().slice(prefix.length + 1).replace(/\\/g, "/"));
    });
}

throughDirectory(prefix);

const httpsrv = require("http").createServer((req, res) => {
    let url = req.url;
    if (url.includes("?")) url = url.slice(0, url.indexOf("?"));
    if (url.startsWith("/")) url = url.slice(1);
    if (url == "") url = "index.html";
    if (files.includes(url)) {
        res.writeHead(200, { "Content-Type": mime.contentType(url) || "application/octet-stream" });
        if (!(url in cache)) {
            cache[url] = fs.readFileSync(prefix + "/" + url);
        }
        res.end(cache[url]);
    } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
    }
});

const wss = new WebSocketServer({ server: httpsrv });

const motdBase = {
    data: {
        motd: serverMotd,
        cache: true,
        max: serverMaxPlayers,
        players: serverPlayers,
        icon: serverIcon !== null,
        online: serverOnlinePlayers
    },
    vers: "0.2.0",
    name: serverName,
    time: 0,
    type: "motd",
    brand: "Eagtek",
    uuid: crypto.randomUUID(),
    cracked: true
};

function getMotd() {
    motdBase.time = Date.now();
    return JSON.stringify(motdBase);
}

wss.on('connection', function (ws) {
    ws.on('error', function (er) {
        console.log("WebSocket error:", er.message);
    });

    let client = null;
    makeBackendConnection(ws, (backend) => client = backend);

    let msgNum = 0;

    ws.on('message', function (data) {
        if (msgNum == 0) {
            msgNum++;
            if (data.toString() == "Accept: MOTD") {
                ws.send(getMotd());
                if (iconBuff !== null) ws.send(iconBuff);
                closeIt();
                return;
            }
            // No protocol modification for 1.12
        } else if (msgNum == 1) {
            msgNum++;
            if (removeSkin) return;
        }
        writeData(data);
    });

    ws.on('close', function () {
        console.log("WebSocket closed");
        closeIt();
    });

    async function writeData(chunk) {
        if (await waitForIt()) client.write(chunk);
    }

    async function closeIt() {
        if (await waitForIt()) client.end();
    }

    async function waitForIt() {
        let i = Date.now();
        while (client == null && (Date.now() - i < timeout / 10)) {
            await new Promise(a => setTimeout(a, 10));
        }

        if (client == null) {
            console.log("Client timeout, closing WebSocket");
            if (ws.readyState == WebSocket.OPEN) ws.close();
            return false;
        }

        return true;
    }
});

httpsrv.listen(listenPort, () => {
    console.log(`✅ Server running on port ${listenPort}`);
    console.log(`📄 Website available at port ${listenPort}`);
    console.log(`🔌 WebSocket endpoint: wss://z-x.duckdns.org`);
    console.log(`🎮 Forwarding to backend: ${backendUrl}`);
});

function makeBackendConnection(ws, cb) {
    // Connect to HF Space using WebSocket (correct method)
    const targetWs = new WebSocket(backendUrl, {
        handshakeTimeout: 30000,
        perMessageDeflate: false,
        headers: {
            'User-Agent': 'Eaglercraft-Proxy'
        }
    });
    
    let isReady = false;
    
    targetWs.on('open', function() {
        console.log(`✅ Connected to HF Space via WebSocket`);
        isReady = true;
        
        // Create a compatible interface
        const backendAdapter = {
            write: (data) => {
                if (targetWs.readyState === WebSocket.OPEN) {
                    targetWs.send(data);
                }
            },
            end: () => {
                if (targetWs.readyState === WebSocket.OPEN) {
                    targetWs.close();
                }
            }
        };
        
        // Add event emitter compatibility
        backendAdapter.on = (event, handler) => {
            if (event === 'data') {
                targetWs.on('message', handler);
            } else if (event === 'end' || event === 'close') {
                targetWs.on('close', handler);
            } else if (event === 'error') {
                targetWs.on('error', handler);
            }
        };
        
        cb(backendAdapter);
    });
    
    targetWs.on('error', function(err) {
        console.log(`Failed to connect to HF Space: ${err.message}`);
        if (ws.readyState === WebSocket.OPEN) ws.close();
    });
    
    targetWs.on('close', function() {
        console.log("HF Space WebSocket connection closed");
        if (ws.readyState === WebSocket.OPEN) ws.close();
    });
}
