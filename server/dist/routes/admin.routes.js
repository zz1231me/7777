"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const isAdmin_1 = require("../middlewares/isAdmin");
const router = (0, express_1.Router)();
// ✅ 인증 및 관리자 권한 체크
router.use(auth_middleware_1.authenticate, isAdmin_1.isAdmin);
// ===== 기존 사용자 관리 API =====
router.get('/users', admin_controller_1.getAllUsers);
router.post('/users', admin_controller_1.createUser);
router.put('/users/:id', admin_controller_1.updateUser);
router.delete('/users/:id', admin_controller_1.deleteUser);
router.post('/users/:id/reset-password', admin_controller_1.resetPassword);
// ===== 새로운 게시판 관리 API =====
router.get('/boards', admin_controller_1.getAllBoards);
router.post('/boards', admin_controller_1.createBoard);
router.put('/boards/:id', admin_controller_1.updateBoard);
router.delete('/boards/:id', admin_controller_1.deleteBoard);
// ===== 새로운 권한 관리 API =====
router.get('/roles', admin_controller_1.getAllRoles);
router.post('/roles', admin_controller_1.createRole);
router.put('/roles/:id', admin_controller_1.updateRole);
router.delete('/roles/:id', admin_controller_1.deleteRole);
// ===== 게시판별 권한 설정 API =====
router.get('/boards/:boardId/permissions', admin_controller_1.getBoardAccessPermissions);
router.put('/boards/:boardId/permissions', admin_controller_1.setBoardAccessPermissions);
// ===== 🆕 이벤트 관리 API ===== 
// ⚠️ 중요: permissions 라우트를 :id 라우트보다 먼저 정의해야 함!
router.get('/events/permissions', admin_controller_1.getEventPermissionsByRole);
router.put('/events/permissions', admin_controller_1.setEventPermissions);
router.get('/events', admin_controller_1.getAllEvents);
router.put('/events/:id', admin_controller_1.updateEventAsAdmin);
router.delete('/events/:id', admin_controller_1.deleteEventAsAdmin);
exports.default = router;
