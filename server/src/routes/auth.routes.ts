import { Router } from 'express';
import { 
  login, 
  register, 
  changePassword, 
  refreshToken, 
  logout,
  getCurrentUser,
  getUserPermissions 
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// 공개 라우트
router.post('/login', login);
router.post('/register', register);

// 🔄 토큰 갱신 - 쿠키 기반이므로 인증 미들웨어 불필요
router.post('/refresh', refreshToken);

// 인증 필요 라우트
router.post('/logout', authenticate, logout); // 🆕 로그아웃 라우트
router.get('/me', authenticate, getCurrentUser); // 🆕 현재 사용자 정보 조회
router.post('/change-password', authenticate, changePassword);
router.get('/permissions', authenticate, getUserPermissions);

export default router;