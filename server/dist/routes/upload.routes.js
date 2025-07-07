"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/upload.routes.ts - 완전히 새로운 시스템
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// 디렉토리 생성
const uploadDir = path_1.default.join(__dirname, '../../uploads');
const filesDir = path_1.default.join(uploadDir, 'files');
const imagesDir = path_1.default.join(uploadDir, 'images');
[uploadDir, filesDir, imagesDir].forEach(dir => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
});
// 이미지 업로드 설정 (에디터용 - 기존 유지)
const imageStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, imagesDir);
    },
    filename: function (req, file, cb) {
        const ext = path_1.default.extname(file.originalname);
        const randomName = crypto_1.default.randomBytes(5).toString('hex');
        cb(null, `${randomName}${ext}`);
    },
});
const uploadImage = (0, multer_1.default)({ storage: imageStorage });
/**
 * ✅ 기존 이미지 업로드 엔드포인트 (에디터용)
 */
router.post('/images', auth_middleware_1.authenticate, uploadImage.single('image'), (0, express_async_handler_1.default)((req, res) => {
    const authReq = req;
    if (!authReq.file) {
        res.status(400).json({ message: '파일이 없습니다.' });
        return;
    }
    const imageUrl = `/uploads/images/${authReq.file.filename}`;
    res.json({ imageUrl });
}));
/**
 * ✅ 깔끔한 파일 다운로드 엔드포인트
 * GET /api/uploads/download/:filename?originalName=원본파일명.png
 */
router.get('/download/:filename', auth_middleware_1.authenticate, (0, express_async_handler_1.default)(async (req, res) => {
    const { filename } = req.params;
    const originalName = req.query.originalName;
    console.log('📥 다운로드 요청:', { filename, originalName });
    // 파일 경로 보안 검증
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        console.error('❌ 보안 위반 파일명:', filename);
        res.status(400).json({ message: '잘못된 파일명입니다.' });
        return;
    }
    const filePath = path_1.default.join(filesDir, filename);
    // 파일 존재 여부 확인
    if (!fs_1.default.existsSync(filePath)) {
        console.error(`❌ 파일을 찾을 수 없음: ${filePath}`);
        res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
        return;
    }
    // 다운로드 파일명 결정
    const downloadFilename = originalName || filename;
    const encodedFilename = encodeURIComponent(downloadFilename);
    console.log('📥 다운로드 처리:', {
        storedFile: filename,
        downloadAs: downloadFilename,
        encoded: encodedFilename
    });
    // 파일 정보 가져오기
    const stats = fs_1.default.statSync(filePath);
    const fileSize = stats.size;
    // MIME 타입 설정
    const ext = path_1.default.extname(filename).toLowerCase();
    const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.zip': 'application/zip',
        '.rar': 'application/x-rar-compressed',
        '.txt': 'text/plain',
        '.mp4': 'video/mp4',
        '.mp3': 'audio/mpeg',
        '.hwp': 'application/x-hwp'
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    // ✅ 응답 헤더 설정 (한글 파일명 완벽 지원)
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Cache-Control', 'no-cache');
    console.log('📋 설정된 헤더:', {
        'Content-Type': mimeType,
        'Content-Length': fileSize,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`
    });
    // 파일 스트림으로 전송
    const fileStream = fs_1.default.createReadStream(filePath);
    fileStream.on('error', (error) => {
        console.error('❌ 파일 스트림 오류:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: '파일 다운로드 중 오류가 발생했습니다.' });
        }
    });
    fileStream.pipe(res);
    console.log(`✅ 파일 다운로드 시작: ${filename} → ${downloadFilename}`);
}));
/**
 * ✅ 파일 정보 조회 엔드포인트
 * GET /api/uploads/info/:filename
 */
router.get('/info/:filename', auth_middleware_1.authenticate, (0, express_async_handler_1.default)(async (req, res) => {
    const { filename } = req.params;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        res.status(400).json({ message: '잘못된 파일명입니다.' });
        return;
    }
    const filePath = path_1.default.join(filesDir, filename);
    if (!fs_1.default.existsSync(filePath)) {
        res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
        return;
    }
    const stats = fs_1.default.statSync(filePath);
    res.json({
        filename: filename,
        size: stats.size,
        mtime: stats.mtime,
        downloadUrl: `/api/uploads/download/${filename}`
    });
}));
exports.default = router;
