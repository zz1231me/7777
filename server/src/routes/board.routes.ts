import express, { RequestHandler } from 'express';
import asyncHandler from 'express-async-handler';
import {
  getAllBoardAccess,
  getBoardAccess,
  setBoardAccess,
  getUserAccessibleBoards  // ✅ 새 함수 추가
} from '../controllers/board.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/isAdmin';

const router = express.Router();
const auth = authenticate as RequestHandler;
const admin = isAdmin as RequestHandler;

// ✅ 사용자가 접근 가능한 게시판 목록 (사이드바용)
router.get('/accessible', auth, asyncHandler(getUserAccessibleBoards));

// ✅ 기존 라우트들
router.get('/access', auth, asyncHandler(getAllBoardAccess)); // 전체 목록
router.get('/access/:boardType', auth, asyncHandler(getBoardAccess));
router.put('/access/:boardType', auth, admin, asyncHandler(setBoardAccess));

export default router;