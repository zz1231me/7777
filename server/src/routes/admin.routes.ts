import { Router, RequestHandler } from 'express';
import {
  // 기존 사용자 관리
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  
  // 새로운 게시판 관리
  getAllBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  
  // 새로운 권한 관리
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  
  // 게시판별 권한 설정
  getBoardAccessPermissions,
  setBoardAccessPermissions,
  
  // 🆕 이벤트 관리
  getAllEvents,
  deleteEventAsAdmin,
  updateEventAsAdmin,
  getEventPermissionsByRole,
  setEventPermissions,
} from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/isAdmin';

const router = Router();

// ✅ 인증 및 관리자 권한 체크
router.use(authenticate as RequestHandler, isAdmin as RequestHandler);

// ===== 기존 사용자 관리 API =====
router.get('/users', getAllUsers as RequestHandler);
router.post('/users', createUser as RequestHandler);
router.put('/users/:id', updateUser as RequestHandler);
router.delete('/users/:id', deleteUser as RequestHandler);
router.post('/users/:id/reset-password', resetPassword as RequestHandler);

// ===== 새로운 게시판 관리 API =====
router.get('/boards', getAllBoards as RequestHandler);
router.post('/boards', createBoard as RequestHandler);
router.put('/boards/:id', updateBoard as RequestHandler);
router.delete('/boards/:id', deleteBoard as RequestHandler);

// ===== 새로운 권한 관리 API =====
router.get('/roles', getAllRoles as RequestHandler);
router.post('/roles', createRole as RequestHandler);
router.put('/roles/:id', updateRole as RequestHandler);
router.delete('/roles/:id', deleteRole as RequestHandler);

// ===== 게시판별 권한 설정 API =====
router.get('/boards/:boardId/permissions', getBoardAccessPermissions as RequestHandler);
router.put('/boards/:boardId/permissions', setBoardAccessPermissions as RequestHandler);

// ===== 🆕 이벤트 관리 API ===== 
// ⚠️ 중요: permissions 라우트를 :id 라우트보다 먼저 정의해야 함!
router.get('/events/permissions', getEventPermissionsByRole as RequestHandler);
router.put('/events/permissions', setEventPermissions as RequestHandler);
router.get('/events', getAllEvents as RequestHandler);
router.put('/events/:id', updateEventAsAdmin as RequestHandler);
router.delete('/events/:id', deleteEventAsAdmin as RequestHandler);

export default router;