// src/middlewares/role.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth-request';

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole) {
      console.warn('❌ 권한 거부: 사용자 역할 없음');
      return res.status(403).json({ message: '권한 정보 없음' });
    }

    if (!allowedRoles.includes(userRole)) {
      console.warn(`❌ 권한 거부: 현재 역할 = ${userRole}, 허용된 역할 = [${allowedRoles.join(', ')}]`);
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    console.log(`✅ 권한 허용: 역할 "${userRole}" → 접근 허용`);
    next();
  };
};
