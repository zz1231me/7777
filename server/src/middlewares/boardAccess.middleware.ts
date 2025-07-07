// server/src/middlewares/boardAccess.middleware.ts
import { Request, Response, NextFunction } from 'express';
import BoardAccess from '../models/BoardAccess';
import Board from '../models/Board';

export const checkBoardAccess = (action: 'read' | 'write' | 'delete') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // ✅ req에서 user 정보 추출 (타입 캐스팅)
      const user = (req as any).user;
      const { boardType } = req.params;

      if (!user || !user.role) {
        console.warn('❌ 권한 체크 실패: 사용자 역할 없음');
        res.status(401).json({ message: '인증이 필요합니다.' });
        return;
      }

      if (!boardType) {
        console.warn('❌ 권한 체크 실패: 게시판 타입 없음');
        res.status(400).json({ message: '게시판 타입이 필요합니다.' });
        return;
      }

      const userRole = user.role;

      // 1. 게시판이 존재하고 활성화되어 있는지 확인
      const board = await Board.findOne({
        where: { 
          id: boardType,
          isActive: true 
        }
      });

      if (!board) {
        console.warn(`❌ 게시판 없음: ${boardType}`);
        res.status(404).json({ message: '존재하지 않거나 비활성화된 게시판입니다.' });
        return;
      }

      // 2. 사용자 역할의 게시판 접근 권한 확인
      const accessCondition = {
        boardId: boardType,
        roleId: userRole,
        ...(action === 'read' && { canRead: true }),
        ...(action === 'write' && { canWrite: true }),
        ...(action === 'delete' && { canDelete: true })
      };

      const access = await BoardAccess.findOne({
        where: accessCondition
      });

      if (!access) {
        console.warn(`❌ 게시판 권한 없음: 사용자=${userRole}, 게시판=${boardType}, 액션=${action}`);
        res.status(403).json({ 
          message: `${board.name} 게시판에 대한 ${action === 'read' ? '읽기' : action === 'write' ? '쓰기' : '삭제'} 권한이 없습니다.` 
        });
        return;
      }

      console.log(`✅ 게시판 권한 허용: 사용자=${userRole}, 게시판=${boardType}, 액션=${action}`);
      
      // 권한 정보를 req에 추가 (선택적)
      (req as any).boardAccess = {
        board,
        canRead: access.canRead,
        canWrite: access.canWrite,
        canDelete: access.canDelete
      };

      next();
    } catch (error) {
      console.error('❌ 게시판 권한 체크 중 오류:', error);
      res.status(500).json({ message: '권한 확인 중 오류가 발생했습니다.' });
    }
  };
};