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
    maxHttpBufferSize: 2e7, // 20MB 제한 (고음질 파일 대응)
    cors: { origin: "*" }
});

app.use(express.static('public'));

// [CHECK] 기록 폴더 생성 및 초기화
const uploadsDir = path.join(__dirname, 'recordings');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('📂 [System] recordings 폴더가 생성되었습니다.');
} else {
    // [선택 사항] 서버 시작 시 기존 파일들을 정리하고 싶다면 아래 주석을 해제하세요.
    /*
    fs.readdir(uploadsDir, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            fs.unlink(path.join(uploadsDir, file), err => { if (err) throw err; });
        }
        console.log('🧹 [System] 이전 무전 기록 파일들을 정리했습니다.');
    });
    */
}

io.on('connection', (socket) => {
    const penguinId = socket.id.substring(0, 5);
    console.log(`🐧 [접속] 펭귄-${penguinId} 입장 (IP: ${socket.handshake.address})`);

    /* [SYNC] 파일 기반 오디오 데이터 수신 및 브로드캐스트 */
    socket.on('sync-audio-file', (data) => {
        console.log(`📡 [Sync] 펭귄-${penguinId} 데이터 수신 (${(data.blob.length / 1024).toFixed(1)} KB)`);
        
        // 1. 다른 클라이언트들에게 전송
        socket.broadcast.emit('receive-sync-audio', {
            blob: data.blob,
            id: penguinId
        });

        // 2. 서버 파일 시스템에 저장 (백업용)
        const fileName = `sync_${penguinId}_${Date.now()}.webm`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFile(filePath, Buffer.from(data.blob), (err) => {
            if (err) console.error('❌ 저장 실패:', err);
            else console.log(`💾 서버 저장 완료: ${fileName}`);
        });
    });

    /* [DELETE] 클라이언트의 기록 비우기 요청 시 서버 로그 출력 */
    socket.on('clear-logs-signal', () => {
        console.log(`🗑️ [Clear] 펭귄-${penguinId}가 화면 기록을 비웠습니다.`);
        // 필요하다면 여기서 서버 측 파일 삭제 로직을 넣을 수도 있습니다.
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
        // [CORE] ngrok을 통한 HTTPS 주소 생성
        const url = await ngrok.connect({
            addr: PORT,
            proto: 'http',
        });
        
        console.log(`🔗 [EXTERNAL URL] 외부 접속 주소 생성 성공!`);
        console.log(`📱 휴대폰 접속 주소: ${url}`);
        console.log(`⚠️  주의: 무료 티어는 대역폭 제한(1GB)이 있으니 테스트 후 종료해 주세요.`);
    } catch (err) {
        console.log(`❌ [ngrok] 주소 생성 실패. 토큰 만료나 이미 실행 중인지 확인하세요.`);
    }
    
    console.log(`📂 무전 저장 경로: ${uploadsDir}`);
    console.log('='.repeat(50) + '\n');
});