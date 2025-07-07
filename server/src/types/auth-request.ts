// src/types/auth-request.ts
import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    role: string; // 🔧 문자열로 확장 (기존 유니언 타입 제거)
  };
}
