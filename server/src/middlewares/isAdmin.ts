import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth-request';

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: '관리자만 접근할 수 있습니다.' });
  }
  next();
};
