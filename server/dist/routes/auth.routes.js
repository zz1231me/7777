"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// 공개 라우트
router.post('/login', auth_controller_1.login);
router.post('/register', auth_controller_1.register);
// 🔄 토큰 갱신 - 쿠키 기반이므로 인증 미들웨어 불필요
router.post('/refresh', auth_controller_1.refreshToken);
// 인증 필요 라우트
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.logout); // 🆕 로그아웃 라우트
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.getCurrentUser); // 🆕 현재 사용자 정보 조회
router.post('/change-password', auth_middleware_1.authenticate, auth_controller_1.changePassword);
router.get('/permissions', auth_middleware_1.authenticate, auth_controller_1.getUserPermissions);
exports.default = router;
