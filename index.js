/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║ [LSA] LAYER: NETWORK / INFRASTRUCTURE                  ║
 * ║ [LMT] FLOW: Client (Full File) -> Server -> Broadcast  ║
 * ║ [PATH] C:\Users\55341\Desktop\PENG-Link\index.js          ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const ngrok = require('ngrok');

const app = express();
const server = http.createServer(app);

/* ┌────────────────────────────────────────────────────────┐
   │ [CORE] SOCKET.IO & SERVER CONFIGURATION                │
   └────────────────────────────────────────────────────────┘ */
const io = new Server(server, {
    maxHttpBufferSize: 2e7, // 20MB
    cors: { origin: "*" }
});

app.use(express.static('public'));

// [CHECK] 기록 폴더 관리 함수
const uploadsDir = path.join(__dirname, 'recordings');

function clearServerFiles() {
    if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
            fs.unlinkSync(path.join(uploadsDir, file));
        }
        return files.length;
    }
    return 0;
}

// 폴더가 없으면 생성
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('📂 [System] recordings 폴더가 준비되었습니다.');
}

io.on('connection', (socket) => {
    const penguinId = socket.id.substring(0, 5);
    console.log(`🐧 [접속] 펭귄-${penguinId} 입장`);

    /* [SYNC] 오디오 파일 수신 및 저장 */
    socket.on('sync-audio-file', (data) => {
        console.log(`📡 [Sync] 펭귄-${penguinId}: ${(data.blob.length / 1024).toFixed(1)} KB 수신`);
        
        socket.broadcast.emit('receive-sync-audio', {
            blob: data.blob,
            id: penguinId
        });

        const fileName = `sync_${penguinId}_${Date.now()}.webm`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFile(filePath, Buffer.from(data.blob), (err) => {
            if (err) console.error('❌ 저장 실패:', err);
            else console.log(`💾 서버 백업 완료: ${fileName}`);
        });
    });

    /* [DELETE] 클라이언트 요청 시 서버 파일까지 싹 비우기 */
    socket.on('clear-logs-signal', () => {
        const deletedCount = clearServerFiles();
        console.log(`🗑️ [Clear] 펭귄-${penguinId} 요청으로 서버 파일 ${deletedCount}개 삭제 완료.`);
        // 모든 클라이언트의 화면을 같이 비우고 싶다면 아래 주석을 해제하세요.
        // io.emit('force-clear-ui'); 
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
    console.log(`🚀 PENG-Link CORE 가동: http://localhost:${PORT}`);
    
    // 서버 시작 시 깨끗하게 파일 정리 (선택 사항)
    const initialClean = clearServerFiles();
    if(initialClean > 0) console.log(`🧹 [Clean] 시작 전 기존 파일 ${initialClean}개 정리됨.`);

    try {
        const url = await ngrok.connect({ addr: PORT, proto: 'http' });
        console.log(`🔗 [EXTERNAL URL] 외부 접속 주소 생성 성공!`);
        console.log(`📱 휴대폰 접속: ${url}`);
    } catch (err) {
        console.log(`❌ [ngrok] 연결 실패. 토큰 설정을 확인하세요.`);
    }
    console.log('='.repeat(50) + '\n');
});