"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const board_controller_1 = require("../controllers/board.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const isAdmin_1 = require("../middlewares/isAdmin");
const router = express_1.default.Router();
const auth = auth_middleware_1.authenticate;
const admin = isAdmin_1.isAdmin;
// ✅ 사용자가 접근 가능한 게시판 목록 (사이드바용)
router.get('/accessible', auth, (0, express_async_handler_1.default)(board_controller_1.getUserAccessibleBoards));
// ✅ 기존 라우트들
router.get('/access', auth, (0, express_async_handler_1.default)(board_controller_1.getAllBoardAccess)); // 전체 목록
router.get('/access/:boardType', auth, (0, express_async_handler_1.default)(board_controller_1.getBoardAccess));
router.put('/access/:boardType', auth, admin, (0, express_async_handler_1.default)(board_controller_1.setBoardAccess));
exports.default = router;
