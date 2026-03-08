/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║ [LSA] LAYER: NETWORK / INFRASTRUCTURE                  ║
 * ║ [LMT] FLOW: Client (Full File) -> Server -> Broadcast  ║
 * ║ [PATH] C:\Users\55341\Desktop\PENG-Link\index.js        ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const ngrok = require('ngrok');
const { execSync } = require('child_process');

const app = express();
const server = http.createServer(app);

/* ┌────────────────────────────────────────────────────────┐
   │ [PRE-CHECK] KILL ZOMBIE PROCESSES                      │
   └────────────────────────────────────────────────────────┘ */
try {
    console.log('🧹 [System] 기존 ngrok 프로세스 정리 중...');
    if (process.platform === "win32") {
        execSync('taskkill /f /im ngrok.exe', { stdio: 'ignore' });
    } else {
        execSync('pkill -f ngrok', { stdio: 'ignore' });
    }
} catch (e) { /* 프로세스 없으면 통과 */ }

/* ┌────────────────────────────────────────────────────────┐
   │ [CORE] SOCKET.IO & SERVER CONFIGURATION                │
   └────────────────────────────────────────────────────────┘ */
const io = new Server(server, {
    maxHttpBufferSize: 2e7,
    cors: { origin: "*" }
});

app.use(express.static('public'));
const uploadsDir = path.join(__dirname, 'recordings');

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

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

/* ┌────────────────────────────────────────────────────────┐
   │ [SOCKET] REAL-TIME COMMUNICATION LOGIC                 │
   └────────────────────────────────────────────────────────┘ */
io.on('connection', (socket) => {
    const penguinId = socket.id.substring(0, 5);
    console.log(`\n[${new Date().toLocaleTimeString()}] 🐧 [입장] 펭귄-${penguinId} 연결`);

    socket.on('sync-audio-file', (data) => {
        if (!data || !data.blob) return;
        socket.broadcast.emit('receive-sync-audio', { blob: data.blob, id: penguinId });
        const fileName = `voice_${penguinId}_${Date.now()}.webm`;
        fs.writeFile(path.join(uploadsDir, fileName), Buffer.from(data.blob), (err) => {
            if (!err) console.log(`💾 [${penguinId}] 서버 백업 완료`);
        });
    });

    socket.on('clear-logs-signal', () => {
        clearServerFiles();
        io.emit('logs-cleared-notification', { by: penguinId });
    });

    socket.on('disconnect', () => console.log(`👋 [퇴장] 펭귄-${penguinId} 나감`));
});

/* ┌────────────────────────────────────────────────────────┐
   │ [RUN] SERVER EXECUTION & AUTO TUNNELING                │
   └────────────────────────────────────────────────────────┘ */
const PORT = process.env.PORT || 3000;
const NGROK_TOKEN = '3AejqY6FPimvY0qdK0rMZOc93Xh_65jDvNEDfjmiVVHNY1Jov';

server.listen(PORT, async () => {
    console.log('\n' + '═'.repeat(50));
    console.log(`🚀 PENG-Link CORE ENGINE START (PORT: ${PORT})`);
    
    // 서버 시작 시 한 번만 파일 정리
    clearServerFiles();

    /**
     * NGROK 로직 (에러가 나도 서버 프로세스는 유지됨)
     */
    async function startNgrok() {
        try {
            // 1. 토큰 설정
            await ngrok.authtoken(NGROK_TOKEN);
            
            // 2. 기존 연결 완전 종료 대기
            await ngrok.kill();
            await new Promise(res => setTimeout(res, 3000));
            
            // 3. 연결 시도 (포트 번호만 전달)
            const url = await ngrok.connect(PORT);

            console.log(`🔗 [TUNNEL] 외부 채널 생성 성공!`);
            console.log(`📱 접속 주소: ${url}`);
            console.log('═'.repeat(50) + '\n');
        } catch (err) {
            console.log(`❌ [ngrok] 연결 실패: ${err.message}`);
            console.log(`⚠️ 현재는 로컬망(http://localhost:${PORT})만 사용 가능합니다.`);
            console.log('═'.repeat(50) + '\n');
        }
    }

    // ngrok 연결 시도가 서버 메인 스레드를 방해하지 않도록 비동기로 실행
    startNgrok();
});