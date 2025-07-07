// src/controllers/board.controller.ts
import { Request, Response } from 'express';
import BoardAccess from '../models/BoardAccess';
import Board from '../models/Board';
import { Role } from '../models/Role';

// ✅ 수정된 단일 게시판 접근 권한 조회
export const getBoardAccess = async (req: Request, res: Response): Promise<void> => {
  const { boardType } = req.params;

  try {
    // 1. 게시판 정보 조회
    const board = await Board.findByPk(boardType);
    
    if (!board) {
      res.status(404).json({ message: '게시판을 찾을 수 없습니다.' });
      return;
    }

    // 2. 권한 조회 (별도 조회로 타입 안전성 확보)
    const accessList = await BoardAccess.findAll({ 
      where: { boardId: boardType }
    });
    
    // 각 권한에 대한 Role 정보를 별도로 조회
    const rolesWithPermissions = [];
    for (const access of accessList) {
      const role = await Role.findByPk(access.roleId);
      if (role) {
        rolesWithPermissions.push({
          roleId: access.roleId,
          roleName: role.name,
          canRead: access.canRead,
          canWrite: access.canWrite,
          canDelete: access.canDelete
        });
      }
    }
    
    res.json({ 
      boardType,
      boardName: board.name,
      boardDescription: board.description,
      roles: rolesWithPermissions 
    });
  } catch (err) {
    console.error('❌ getBoardAccess error:', err);
    res.status(500).json({ message: '접근 권한 조회 실패', error: err });
  }
};

// ✅ 게시판 접근 권한 설정
export const setBoardAccess = async (req: Request, res: Response): Promise<void> => {
  const { boardType } = req.params;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    res.status(400).json({ message: 'permissions는 배열이어야 합니다.' });
    return;
  }

  try {
    // 기존 권한 삭제
    await BoardAccess.destroy({ where: { boardId: boardType } });
    
    // 새 권한 생성
    const entries = permissions.map((perm) => ({
      boardId: boardType,
      roleId: perm.roleId,
      canRead: perm.canRead || false,
      canWrite: perm.canWrite || false,
      canDelete: perm.canDelete || false
    }));
    
    await BoardAccess.bulkCreate(entries);
    res.json({ message: '접근 권한 설정 완료', boardType, permissions });
  } catch (err) {
    console.error('❌ setBoardAccess error:', err);
    res.status(500).json({ message: '접근 권한 설정 실패', error: err });
  }
};

// ✅ 전체 게시판 + 권한 목록 조회
export const getAllBoardAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const boards = await Board.findAll({
      where: { isActive: true },
      order: [['order', 'ASC'], ['createdAt', 'DESC']]
    });

    // 각 게시판의 권한 정보를 별도로 조회 (타입 안전성)
    const result = [];
    for (const board of boards) {
      const accessList = await BoardAccess.findAll({
        where: { boardId: board.id }
      });

      const roles = [];
      for (const access of accessList) {
        const role = await Role.findByPk(access.roleId);
        if (role) {
          roles.push({
            id: role.id,
            name: role.name,
            canRead: access.canRead,
            canWrite: access.canWrite,
            canDelete: access.canDelete
          });
        }
      }

      result.push({
        id: board.id,
        name: board.name,
        description: board.description,
        order: board.order,
        roles: roles
      });
    }

    res.json(result);
  } catch (err) {
    console.error('❌ getAllBoardAccess error:', err);
    res.status(500).json({ message: '전체 접근 권한 조회 실패', error: err });
  }
};

// ✅ 사용자가 접근 가능한 게시판 목록 조회 (수정됨)
export const getUserAccessibleBoards = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role; // 인증된 사용자의 역할 ID

    if (!userRole) {
      res.status(401).json({ message: '인증이 필요합니다.' });
      return;
    }

    // 1. 사용자 역할로 접근 가능한 BoardAccess 조회
    const accessList = await BoardAccess.findAll({
      where: { 
        roleId: userRole,
        canRead: true  // 읽기 권한이 있는 것만
      }
    });

    // 2. 해당 게시판들의 정보 조회
    const result = [];
    for (const access of accessList) {
      const board = await Board.findOne({
        where: { 
          id: access.boardId,
          isActive: true 
        }
      });

      if (board) {
        result.push({
          id: board.id,
          name: board.name,
          description: board.description,
          order: board.order,
          permissions: {
            canRead: access.canRead,
            canWrite: access.canWrite,
            canDelete: access.canDelete
          }
        });
      }
    }

    // 순서대로 정렬
    result.sort((a, b) => a.order - b.order);

    res.json(result);
  } catch (err) {
    console.error('❌ getUserAccessibleBoards error:', err);
    res.status(500).json({ message: '접근 가능한 게시판 조회 실패', error: err });
  }
};