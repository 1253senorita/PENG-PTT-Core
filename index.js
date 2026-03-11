/* [📍 1] --------------------------------------------------- START */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const ngrok = require('ngrok');
const os = require('os');
const { execSync } = require('child_process');

const app = express();
const server = http.createServer(app);

/* [📍 2] --------------------------------------------------- ZOMBIE CLEANUP */
/* ------------------------------------------------------------ */
/* [PORT(🚪🚪🚪)] SYSTEM ENTRY - ZOMBIE PROCESS CLEANUP         */
/* ------------------------------------------------------------ */
function killZombies() {
    try {
        if (process.platform === "win32") {
            execSync('taskkill /f /im ngrok.exe', { stdio: 'ignore' });
        } else {
            execSync('pkill -f ngrok', { stdio: 'ignore' });
        }
    } catch (e) { /* 무시 */ }
}

/* [📍 3] --------------------------------------------------- SERVER CONFIG */
/* ------------------------------------------------------------ */
/* [SRV(🏗️🏗️🏗️)] SERVER ENGINE - STORAGE & CONFIGURATION          */
/* ------------------------------------------------------------ */
const io = new Server(server, {
    maxHttpBufferSize: 2e7,
    cors: { origin: "*" }
});

app.use(express.static('public'));
const uploadsDir = path.join(__dirname, 'recordings');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

/* [📍 4] --------------------------------------------------- FILE CLEANER */
function clearServerFiles() {
    try {
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
                const filePath = path.join(uploadsDir, file);
                if (fs.lstatSync(filePath).isFile()) fs.unlinkSync(filePath);
            }
            return files.length;
        }
    } catch (err) { console.error('❌ 파일 정리 오류:', err); }
    return 0;
}

/* [📍 5] --------------------------------------------------- SOCKET CONNECTION */
/* ------------------------------------------------------------ */
/* [SIO_S(📡📡📡)] SOCKET SERVER - BROADCASTING LOGIC             */
/* ------------------------------------------------------------ */
io.on('connection', (socket) => {
    const penguinId = socket.id.substring(0, 5);
    console.log(`\n[${new Date().toLocaleTimeString()}] 🐧 [입장] 펭귄-${penguinId} 연결`);

/* [📍 6] --------------------------------------------------- AUDIO SYNC */
    socket.on('sync-audio-file', (data) => {
        if (!data || !data.blob) return;
        socket.broadcast.emit('receive-sync-audio', { blob: data.blob, id: penguinId });
        
        const fileName = `voice_${penguinId}_${Date.now()}.webm`;
        fs.writeFile(path.join(uploadsDir, fileName), Buffer.from(data.blob), (err) => {
            if (!err) checkServerStorageLimit();
        });
    });

/* [📍 7] --------------------------------------------------- LOG CLEAR SIGNAL */
    socket.on('clear-logs-signal', () => {
        const count = clearServerFiles();
        console.log(`🗑️ [System] ${penguinId}의 요청으로 서버 파일 ${count}개 삭제 완료`);
        io.emit('logs-cleared-notification', { by: penguinId });
    });

    socket.on('disconnect', () => console.log(`👋 [퇴장] 펭귄-${penguinId} 나감`));
});

/* [📍 8] --------------------------------------------------- STORAGE LIMIT */
function checkServerStorageLimit() {
    const files = fs.readdirSync(uploadsDir)
                    .map(name => ({ name, time: fs.statSync(path.join(uploadsDir, name)).mtime.getTime() }))
                    .sort((a, b) => a.time - b.time);

    if (files.length > 100) {
        const toDelete = files.slice(0, files.length - 100);
        toDelete.forEach(f => fs.unlinkSync(path.join(uploadsDir, f.name)));
        console.log(`♻️ [System] 서버 파일 ${toDelete.length}개 자동 정리`);
    }
}

/* [📍 9] --------------------------------------------------- NETWORK INTERFACE */
/* ------------------------------------------------------------ */
/* [EXP(⚡⚡⚡)] MIDDLEWARE - HYBRID ACCESS (LOCAL & TUNNEL)       */
/* ------------------------------------------------------------ */
const PORT = process.env.PORT || 3000;
const NGROK_TOKEN = '3AejqY6FPimvY0qdK0rMZOc93Xh_65jDvNEDfjmiVVHNY1Jov';

server.listen(PORT, '0.0.0.0', async () => {
    console.log('\n' + '═'.repeat(60));
    console.log(`🚀 PENG-Link CORE ENGINE START (PORT: ${PORT})`);
    
    clearServerFiles();
    killZombies();

    const nets = os.networkInterfaces();
    let localIp = '';
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) localIp = net.address;
        }
    }

/* [📍 10] --------------------------------------------------- NGROK RE-ENTRY */
    console.log(`💻 [LOCAL] PC 접속: http://localhost:${PORT}`);
    if (localIp) console.log(`📱 [WI-FI] 폰 접속: http://${localIp}:${PORT}`);

    // ngrok 터널 재설정
    (async function startNgrok() {
        try {
            await ngrok.authtoken(NGROK_TOKEN);
            await ngrok.kill(); 
            const url = await ngrok.connect({ proto: 'http', addr: PORT, region: 'jp' });
            console.log(`🔗 [TUNNEL] 마이크 허용 접속(HTTPS): ${url}`);
        } catch (err) {
            console.log(`❌ [ngrok] 터널 생성 실패: ${err.message}`);
        }
        console.log('═'.repeat(60) + '\n');
    })();
});