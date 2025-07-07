// src/types/express/index.d.ts

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        role: string;
      };
    }
  }
}

export {}; // 👈 반드시 필요함!
