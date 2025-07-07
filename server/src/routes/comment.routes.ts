// src/routes/comment.routes.ts
import express, { RequestHandler } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { checkBoardAccess } from '../middlewares/boardAccess.middleware';
import {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller';

const router = express.Router();

/**
 * ✅ 댓글 조회 - 해당 게시판 읽기 권한 필요
 * URL: GET /api/comments/:boardType/:postId
 */
router.get(
  '/:boardType/:postId', 
  authenticate as RequestHandler,
  checkBoardAccess('read') as RequestHandler,
  getCommentsByPost as RequestHandler
);

/**
 * ✅ 댓글 작성 - 해당 게시판 쓰기 권한 필요
 * URL: POST /api/comments/:boardType/:postId
 */
router.post(
  '/:boardType/:postId', 
  authenticate as RequestHandler,
  checkBoardAccess('write') as RequestHandler,
  createComment as RequestHandler
);

/**
 * ✅ 댓글 수정 - 해당 게시판 쓰기 권한 필요
 * URL: PUT /api/comments/:boardType/:commentId
 */
router.put(
  '/:boardType/:commentId', 
  authenticate as RequestHandler,
  checkBoardAccess('write') as RequestHandler,
  updateComment as RequestHandler
);

/**
 * ✅ 댓글 삭제 - 해당 게시판 쓰기 권한 필요
 * URL: DELETE /api/comments/:boardType/:commentId
 */
router.delete(
  '/:boardType/:commentId', 
  authenticate as RequestHandler,
  checkBoardAccess('write') as RequestHandler,
  deleteComment as RequestHandler
);

export default router;