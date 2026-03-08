/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║ [LSA] LAYER: NETWORK / INFRASTRUCTURE                  ║
 * ║ [LMT] FLOW: Client (Full File) -> Server -> Broadcast   ║
 * ║ [PATH] C:\Users\55341\Desktop\PENG-Link\index.js          ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const ngrok = require('ngrok'); // [NEW] 외부 접속 주소 생성용

const app = express();
const server = http.createServer(app);

/* ┌────────────────────────────────────────────────────────┐
   │ [CORE] SOCKET.IO & SERVER CONFIGURATION                │
   └────────────────────────────────────────────────────────┘ */
const io = new Server(server, {
    maxHttpBufferSize: 2e7, 
    cors: { origin: "*" }
});

app.use(express.static('public'));

// [CHECK] 기록 폴더 생성
const uploadsDir = path.join(__dirname, 'recordings');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('📂 [System] recordings 폴더가 준비되었습니다.');
}

io.on('connection', (socket) => {
    const penguinId = socket.id.substring(0, 5);
    console.log(`🐧 [접속] 펭귄-${penguinId} 입장`);

    /* [SYNC] 파일 기반 오디오 동기화 로직 */
    socket.on('sync-audio-file', (data) => {
        console.log(`📡 [Sync] 펭귄-${penguinId}의 데이터 수신 (${data.blob.length} bytes)`);
        socket.broadcast.emit('receive-sync-audio', {
            blob: data.blob,
            id: penguinId
        });

        const fileName = `sync_${penguinId}_${Date.now()}.webm`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFile(filePath, Buffer.from(data.blob), (err) => {
            if (err) console.error('❌ 저장 실패:', err);
            else console.log(`💾 저장 완료: ${fileName}`);
        });
    });

    socket.on('ptt-stop-signal', () => {
        socket.broadcast.emit('user-stopped'); 
        console.log(`💤 [Signal] 펭귄-${penguinId} 무전 종료`);
    });

    socket.on('disconnect', () => {
        console.log(`👋 [퇴장] 펭귄-${penguinId} 나감`);
    });
});

/* ┌────────────────────────────────────────────────────────┐
   │ [RUN] SERVER EXECUTION & AUTO TUNNELING                │
   └────────────────────────────────────────────────────────┘ */
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    console.log('\n' + '='.repeat(50));
    console.log(`🚀 PENG-Link 로컬 서버 가동: http://localhost:${PORT}`);
    
    try {
        // [CORE] 외부에서 접속 가능한 HTTPS 주소 자동 생성
        // 휴대폰 마이크 권한을 위해 HTTPS 연결이 반드시 필요합니다.
        const url = await ngrok.connect(PORT);
        
        console.log(`🔗 [EXTERNAL URL] 외부 접속 주소 생성 성공!`);
        console.log(`📱 휴대폰 접속 주소: ${url}`);
        console.log(`⚠️  주의: 서버 재시작 시 주소가 변경될 수 있습니다.`);
    } catch (err) {
        console.log(`❌ [ngrok] 주소 생성 실패 (토큰 설정이나 네트워크를 확인해 주세요)`);
    }
    
    console.log(`📂 무전 저장: ${uploadsDir}`);
    console.log('='.repeat(50) + '\n');
});