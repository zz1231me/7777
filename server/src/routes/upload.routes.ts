// src/routes/upload.routes.ts - 완전히 새로운 시스템
import { Router, RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import { authenticate } from '../middlewares/auth.middleware';
import { AuthRequest } from '../types/auth-request';

const router = Router();

// 디렉토리 생성
const uploadDir = path.join(__dirname, '../../uploads');
const filesDir = path.join(uploadDir, 'files');
const imagesDir = path.join(uploadDir, 'images');

[uploadDir, filesDir, imagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 이미지 업로드 설정 (에디터용 - 기존 유지)
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const randomName = crypto.randomBytes(5).toString('hex');
    cb(null, `${randomName}${ext}`);
  },
});

const uploadImage = multer({ storage: imageStorage });

/**
 * ✅ 기존 이미지 업로드 엔드포인트 (에디터용)
 */
router.post(
  '/images', 
  authenticate as RequestHandler, 
  uploadImage.single('image'), 
  asyncHandler((req, res) => {
    const authReq = req as AuthRequest;
    
    if (!authReq.file) {
      res.status(400).json({ message: '파일이 없습니다.' });
      return;
    }

    const imageUrl = `/uploads/images/${authReq.file.filename}`;
    res.json({ imageUrl });
  })
);

/**
 * ✅ 깔끔한 파일 다운로드 엔드포인트
 * GET /api/uploads/download/:filename?originalName=원본파일명.png
 */
router.get(
  '/download/:filename', 
  authenticate as RequestHandler, 
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const originalName = req.query.originalName as string;
    
    console.log('📥 다운로드 요청:', { filename, originalName });
    
    // 파일 경로 보안 검증
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.error('❌ 보안 위반 파일명:', filename);
      res.status(400).json({ message: '잘못된 파일명입니다.' });
      return;
    }
    
    const filePath = path.join(filesDir, filename);
    
    // 파일 존재 여부 확인
    if (!fs.existsSync(filePath)) {
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
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // MIME 타입 설정
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
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
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('❌ 파일 스트림 오류:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: '파일 다운로드 중 오류가 발생했습니다.' });
      }
    });
    
    fileStream.pipe(res);
    
    console.log(`✅ 파일 다운로드 시작: ${filename} → ${downloadFilename}`);
  })
);

/**
 * ✅ 파일 정보 조회 엔드포인트
 * GET /api/uploads/info/:filename
 */
router.get(
  '/info/:filename', 
  authenticate as RequestHandler, 
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ message: '잘못된 파일명입니다.' });
      return;
    }
    
    const filePath = path.join(filesDir, filename);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
      return;
    }
    
    const stats = fs.statSync(filePath);
    
    res.json({
      filename: filename,
      size: stats.size,
      mtime: stats.mtime,
      downloadUrl: `/api/uploads/download/${filename}`
    });
  })
);

export default router;