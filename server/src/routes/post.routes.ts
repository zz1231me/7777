import { Router, RequestHandler } from 'express';
import multer from 'multer';
import asyncHandler from 'express-async-handler';
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
} from '../controllers/post.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { checkBoardAccess } from '../middlewares/boardAccess.middleware';
import { AuthRequest } from '../types/auth-request';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router = Router();

/**
 * ✅ 완전 랜덤 파일명 생성 (12자리 hex + 확장자)
 */
const generateRandomFilename = (originalName: string): string => {
  const ext = path.extname(originalName).toLowerCase();
  const randomName = crypto.randomBytes(6).toString('hex'); // 12자리
  return `${randomName}${ext}`;
};

/**
 * ✅ 깔끔한 다중 파일 업로드 설정
 */
const uploadDir = path.join(__dirname, '../../uploads/files');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    try {
      const randomFilename = generateRandomFilename(file.originalname);
      console.log(`📁 파일 저장: ${file.originalname} → ${randomFilename}`);
      cb(null, randomFilename);
    } catch (error) {
      console.error('파일명 생성 오류:', error);
      // 오류 시 기본 랜덤 이름
      const fallbackName = `${crypto.randomBytes(6).toString('hex')}.bin`;
      cb(null, fallbackName);
    }
  },
});

// 파일 필터링 (허용된 확장자만)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', // 이미지
    '.pdf', '.doc', '.docx', '.txt', '.hwp', '.ppt', '.pptx', '.xls', '.xlsx', // 문서
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', // 압축파일
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', // 동영상
    '.mp3', '.wav', '.flac', '.aac', '.ogg' // 오디오
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`허용되지 않는 파일 형식입니다. 허용 형식: ${allowedExtensions.join(', ')}`));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB 제한
    files: 3 // 최대 3개 파일
  }
});

/**
 * ✅ 게시글 목록 조회 (게시판별) - 페이지네이션 및 검색 지원
 */
router.get(
  '/:boardType',
  authenticate as RequestHandler,
  checkBoardAccess('read') as RequestHandler,
  asyncHandler((req, res) => getPosts(req as AuthRequest, res))
);

/**
 * ✅ 게시글 단건 조회 - 읽기 권한 필요
 */
router.get(
  '/:boardType/:id',
  authenticate as RequestHandler,
  checkBoardAccess('read') as RequestHandler,
  asyncHandler((req, res) => getPostById(req as AuthRequest, res))
);

/**
 * ✅ 게시글 생성 - 깔끔한 다중 파일 업로드 지원
 */
router.post(
  '/:boardType',
  authenticate as RequestHandler,
  checkBoardAccess('write') as RequestHandler,
  upload.array('files', 3), // 다중 파일 업로드 (최대 3개)
  asyncHandler((req, res) => createPost(req as AuthRequest, res))
);

/**
 * ✅ 게시글 수정 - 깔끔한 다중 파일 업로드 지원
 */
router.put(
  '/:boardType/:id',
  authenticate as RequestHandler,
  checkBoardAccess('write') as RequestHandler,
  upload.array('files', 3), // 다중 파일 업로드 (최대 3개)
  asyncHandler((req, res) => updatePost(req as AuthRequest, res))
);

/**
 * ✅ 게시글 삭제 - 삭제 권한 필요
 */
router.delete(
  '/:boardType/:id',
  authenticate as RequestHandler,
  checkBoardAccess('delete') as RequestHandler,
  asyncHandler((req, res) => deletePost(req as AuthRequest, res))
);

export default router;