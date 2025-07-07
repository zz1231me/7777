"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/comment.routes.ts
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const boardAccess_middleware_1 = require("../middlewares/boardAccess.middleware");
const comment_controller_1 = require("../controllers/comment.controller");
const router = express_1.default.Router();
/**
 * ✅ 댓글 조회 - 해당 게시판 읽기 권한 필요
 * URL: GET /api/comments/:boardType/:postId
 */
router.get('/:boardType/:postId', auth_middleware_1.authenticate, (0, boardAccess_middleware_1.checkBoardAccess)('read'), comment_controller_1.getCommentsByPost);
/**
 * ✅ 댓글 작성 - 해당 게시판 쓰기 권한 필요
 * URL: POST /api/comments/:boardType/:postId
 */
router.post('/:boardType/:postId', auth_middleware_1.authenticate, (0, boardAccess_middleware_1.checkBoardAccess)('write'), comment_controller_1.createComment);
/**
 * ✅ 댓글 수정 - 해당 게시판 쓰기 권한 필요
 * URL: PUT /api/comments/:boardType/:commentId
 */
router.put('/:boardType/:commentId', auth_middleware_1.authenticate, (0, boardAccess_middleware_1.checkBoardAccess)('write'), comment_controller_1.updateComment);
/**
 * ✅ 댓글 삭제 - 해당 게시판 쓰기 권한 필요
 * URL: DELETE /api/comments/:boardType/:commentId
 */
router.delete('/:boardType/:commentId', auth_middleware_1.authenticate, (0, boardAccess_middleware_1.checkBoardAccess)('write'), comment_controller_1.deleteComment);
exports.default = router;
