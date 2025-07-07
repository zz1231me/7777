// src/controllers/admin.controller.ts - 최종 보안 강화 버전 (타입 에러 해결)
import { Request, Response } from 'express';
import { User } from '../models/User';
import Board from '../models/Board';
import { Role } from '../models/Role';
import BoardAccess from '../models/BoardAccess';
import Event from '../models/Event';
import EventPermission from '../models/EventPermission';
import { hashPassword } from '../utils/hash';
import { AuthRequest } from '../types/auth-request';
import { Op } from 'sequelize';
import { sequelize } from '../config/sequelize'; // 🔧 추가된 import

// 🔒 보안 헬퍼 함수들
const sanitizeString = (input: string, maxLength: number = 100): string => {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
};

const validateId = (id: string): boolean => {
  return typeof id === 'string' && id.length > 0 && id.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(id);
};

const validateRequiredFields = (fields: Record<string, any>): string | null => {
  for (const [key, value] of Object.entries(fields)) {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return `${key} 필드는 필수입니다.`;
    }
  }
  return null;
};

const validateNumericId = (id: string): number | null => {
  const numId = parseInt(id);
  return isNaN(numId) || numId <= 0 ? null : numId;
};

const logSecurityEvent = (action: string, userId: string, details: any) => {
  console.log(`🔒 [SECURITY] ${action}`, {
    timestamp: new Date().toISOString(),
    adminUserId: userId,
    action,
    details: typeof details === 'object' ? JSON.stringify(details) : details
  });
};

const handleError = (err: any, action: string, res: Response) => {
  console.error(`❌ ${action} error:`, {
    message: err instanceof Error ? err.message : 'Unknown error',
    timestamp: new Date().toISOString(),
    action
  });
  
  // 🔒 프로덕션에서는 내부 정보 노출 방지
  const message = process.env.NODE_ENV === 'production' 
    ? '서버 오류가 발생했습니다.' 
    : `${action} 실패`;
    
  res.status(500).json({ message });
};

const validateAdminAccess = (req: Request, res: Response): AuthRequest['user'] | null => {
  const requestUser = (req as AuthRequest).user;
  
  if (requestUser?.role !== 'admin') {
    logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS', requestUser?.id || 'unknown', { 
      endpoint: req.originalUrl,
      method: req.method 
    });
    res.status(403).json({ message: '관리자만 접근할 수 있습니다.' });
    return null;
  }
  
  return requestUser;
};

// ✅ JWT 페이로드 생성 헬퍼 함수
export const generateUserPayload = async (user: any) => {
  try {
    const userRoleId = user.role || user.roleId;
    
    const accessList = await BoardAccess.findAll({
      where: { 
        roleId: userRoleId,
        canRead: true
      }
    });

    const boardPermissions = [];
    for (const access of accessList) {
      const board = await Board.findOne({
        where: { 
          id: access.boardId,
          isActive: true 
        }
      });

      if (board) {
        boardPermissions.push({
          boardId: access.boardId,
          boardName: board.name,
          canRead: access.canRead,
          canWrite: access.canWrite,
          canDelete: access.canDelete
        });
      }
    }

    boardPermissions.sort((a, b) => a.boardName.localeCompare(b.boardName));

    return {
      id: user.id,
      name: user.name,
      role: userRoleId,
      permissions: boardPermissions,
      iat: Math.floor(Date.now() / 1000)
    };
  } catch (error) {
    console.error('❌ generateUserPayload error:', error);
    return {
      id: user.id,
      name: user.name,
      role: user.role || user.roleId,
      permissions: [],
      iat: Math.floor(Date.now() / 1000)
    };
  }
};

// === 🔒 보안 강화된 유저 관리 ===
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    const users = await User.findAll({ 
      attributes: ['id', 'name', 'roleId'],
      include: [{ 
        model: Role, 
        as: 'roleInfo',
        attributes: ['id', 'name'] 
      }]
    });

    logSecurityEvent('USER_LIST_ACCESSED', requestUser.id, { userCount: users.length });
    res.json(users);
  } catch (err) {
    handleError(err, 'getAllUsers', res);
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    let { id, password, name, role } = req.body;

    // 🔒 입력값 검증 및 정제
    const validationError = validateRequiredFields({ id, password, name, role });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    id = sanitizeString(id, 50);
    name = sanitizeString(name, 100);
    role = sanitizeString(role, 50);

    if (!validateId(id)) {
      return res.status(400).json({ message: '사용자 ID는 영문, 숫자, _, - 만 포함할 수 있습니다.' });
    }

    if (password.length < 4 || password.length > 100) {
      return res.status(400).json({ message: '비밀번호는 4~100자 사이여야 합니다.' });
    }

    // 🔒 역할 존재 및 활성화 확인
    const roleExists = await Role.findByPk(role);
    if (!roleExists) {
      logSecurityEvent('INVALID_ROLE_ASSIGNMENT', requestUser.id, { targetUserId: id, invalidRole: role });
      return res.status(400).json({ message: '존재하지 않는 역할입니다.' });
    }

    if (!roleExists.isActive) {
      return res.status(400).json({ message: '비활성화된 역할입니다.' });
    }

    // 🔒 중복 사용자 확인
    const existing = await User.findByPk(id);
    if (existing) {
      logSecurityEvent('DUPLICATE_USER_CREATE_ATTEMPT', requestUser.id, { targetUserId: id });
      return res.status(409).json({ message: '이미 존재하는 사용자입니다.' });
    }

    const user = await User.create({
      id,
      password: hashPassword(password),
      name,
      roleId: role,
    });

    logSecurityEvent('USER_CREATED', requestUser.id, { 
      newUserId: user.id, 
      newUserName: user.name, 
      assignedRole: role 
    });

    res.status(201).json({ 
      message: '사용자 생성 완료',
      userId: user.id 
    });
  } catch (err) {
    handleError(err, 'createUser', res);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    let { id } = req.params;
    let { role } = req.body;

    // 🔒 파라미터 검증
    id = sanitizeString(id, 50);
    if (!validateId(id)) {
      return res.status(400).json({ message: '잘못된 사용자 ID입니다.' });
    }

    // 🔒 대상 사용자 존재 확인
    const targetUser = await User.findByPk(id);
    if (!targetUser) {
      logSecurityEvent('USER_UPDATE_NOT_FOUND', requestUser.id, { targetUserId: id });
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 🔒 자기 자신 권한 변경 방지
    if (targetUser.id === requestUser.id) {
      logSecurityEvent('SELF_ROLE_CHANGE_ATTEMPT', requestUser.id, { attemptedRole: role });
      return res.status(400).json({ message: '자신의 권한은 변경할 수 없습니다.' });
    }

    if (role) {
      role = sanitizeString(role, 50);
      
      const roleExists = await Role.findByPk(role);
      if (!roleExists) {
        logSecurityEvent('INVALID_ROLE_UPDATE', requestUser.id, { targetUserId: id, invalidRole: role });
        return res.status(400).json({ message: '존재하지 않는 역할입니다.' });
      }

      if (!roleExists.isActive) {
        return res.status(400).json({ message: '비활성화된 역할입니다.' });
      }
    }

    const [updated] = await User.update({ roleId: role }, { where: { id } });

    if (updated === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    logSecurityEvent('USER_UPDATED', requestUser.id, { 
      targetUserId: id, 
      oldRole: targetUser.roleId, 
      newRole: role 
    });

    res.json({ message: '사용자 정보가 업데이트되었습니다.' });
  } catch (err) {
    handleError(err, 'updateUser', res);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    let { id } = req.params;

    // 🔒 파라미터 검증
    id = sanitizeString(id, 50);
    if (!validateId(id)) {
      return res.status(400).json({ message: '잘못된 사용자 ID입니다.' });
    }

    // 🔒 자기 자신 삭제 방지
    if (id === requestUser.id) {
      logSecurityEvent('SELF_DELETE_ATTEMPT', requestUser.id, {});
      return res.status(400).json({ message: '자신의 계정은 삭제할 수 없습니다.' });
    }

    // 🔒 대상 사용자 존재 확인
    const targetUser = await User.findByPk(id);
    if (!targetUser) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const deleted = await User.destroy({ where: { id } });

    if (deleted === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    logSecurityEvent('USER_DELETED', requestUser.id, { 
      deletedUserId: id, 
      deletedUserName: targetUser.name,
      deletedUserRole: targetUser.roleId 
    });

    res.json({ message: '삭제 완료' });
  } catch (err) {
    handleError(err, 'deleteUser', res);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    let { id } = req.params;

    // 🔒 파라미터 검증
    id = sanitizeString(id, 50);
    if (!validateId(id)) {
      return res.status(400).json({ message: '잘못된 사용자 ID입니다.' });
    }

    // 🔒 대상 사용자 존재 확인
    const targetUser = await User.findByPk(id);
    if (!targetUser) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const defaultPassword = '1234';
    const hashed = hashPassword(defaultPassword);

    const [updated] = await User.update({ password: hashed }, { where: { id } });

    if (updated === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    logSecurityEvent('PASSWORD_RESET', requestUser.id, { 
      targetUserId: id, 
      targetUserName: targetUser.name 
    });

    res.json({ message: '비밀번호가 1234로 초기화되었습니다.' });
  } catch (err) {
    handleError(err, 'resetPassword', res);
  }
};

// === 🔒 보안 강화된 게시판 관리 ===
export const getAllBoards = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    const boards = await Board.findAll({
      order: [['order', 'ASC'], ['createdAt', 'DESC']],
    });
    
    res.json(boards);
  } catch (err) {
    handleError(err, 'getAllBoards', res);
  }
};

export const createBoard = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    let { id, name, description, order = 0 } = req.body;

    // 🔒 입력값 검증
    const validationError = validateRequiredFields({ id, name });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    id = sanitizeString(id, 50);
    name = sanitizeString(name, 100);
    description = sanitizeString(description || '', 500);

    if (!validateId(id)) {
      return res.status(400).json({ message: '게시판 ID는 영문, 숫자, _, - 만 포함할 수 있습니다.' });
    }

    if (typeof order !== 'number' || order < 0 || order > 999) {
      order = 0;
    }

    const existing = await Board.findByPk(id);
    if (existing) {
      logSecurityEvent('DUPLICATE_BOARD_CREATE', requestUser.id, { boardId: id });
      return res.status(409).json({ message: '이미 존재하는 게시판 ID입니다.' });
    }

    const board = await Board.create({ id, name, description, order });
    
    logSecurityEvent('BOARD_CREATED', requestUser.id, { 
      boardId: board.id, 
      boardName: board.name 
    });

    res.status(201).json(board);
  } catch (err) {
    handleError(err, 'createBoard', res);
  }
};

export const updateBoard = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    let { id } = req.params;
    let { name, description, isActive, order } = req.body;

    // 🔒 파라미터 검증
    id = sanitizeString(id, 50);
    if (!validateId(id)) {
      return res.status(400).json({ message: '잘못된 게시판 ID입니다.' });
    }

    // 🔒 입력값 정제
    const updateData: any = {};
    if (name) updateData.name = sanitizeString(name, 100);
    if (description !== undefined) updateData.description = sanitizeString(description, 500);
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof order === 'number' && order >= 0 && order <= 999) updateData.order = order;

    const [updated] = await Board.update(updateData, { where: { id } });

    if (updated === 0) {
      return res.status(404).json({ message: '게시판을 찾을 수 없습니다.' });
    }

    const board = await Board.findByPk(id);
    
    logSecurityEvent('BOARD_UPDATED', requestUser.id, { 
      boardId: id, 
      updatedFields: Object.keys(updateData) 
    });

    res.json(board);
  } catch (err) {
    handleError(err, 'updateBoard', res);
  }
};

// 🔧 완전히 수정된 deleteBoard 함수 (타입 에러 해결)
export const deleteBoard = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    let { id } = req.params;

    // 🔒 파라미터 검증
    id = sanitizeString(id, 50);
    if (!validateId(id)) {
      return res.status(400).json({ message: '잘못된 게시판 ID입니다.' });
    }

    // 🔒 게시판 존재 확인
    const board = await Board.findByPk(id);
    if (!board) {
      return res.status(404).json({ message: '게시판을 찾을 수 없습니다.' });
    }

    // 🔧 트랜잭션 사용하여 안전하게 삭제
    const transaction = await sequelize.transaction();
    
    try {
      // 1. 관련 게시글과 댓글 삭제 (CASCADE로 함께 삭제됨)
      let deletedPostCount = 0;
      let deletedCommentCount = 0;
      
      try {
        const { Post } = await import('../models/Post');
        const { Comment } = await import('../models/Comment');
        
        // 🔧 타입 안전성을 위해 분리해서 처리
        // 먼저 댓글 수 계산
        deletedCommentCount = await Comment.count({
          include: [{
            model: Post,
            as: 'post',
            where: { boardType: id }
          }],
          transaction
        });
        
        // 게시글 삭제 (댓글도 CASCADE로 함께 삭제)
        deletedPostCount = await Post.destroy({ 
          where: { boardType: id },
          transaction 
        });
        
        console.log(`🗑️ 게시판 ${id} 삭제: 게시글 ${deletedPostCount}개, 댓글 ${deletedCommentCount}개 삭제`);
      } catch (error) {
        console.warn('⚠️ Post/Comment 삭제 중 에러:', error);
        // 에러가 있어도 계속 진행하여 게시판 삭제는 완료
      }

      // 2. BoardAccess 삭제
      const deletedAccessCount = await BoardAccess.destroy({ 
        where: { boardId: id },
        transaction 
      });

      // 3. 게시판 삭제
      const deletedBoardCount = await Board.destroy({ 
        where: { id },
        transaction 
      });

      if (deletedBoardCount === 0) {
        await transaction.rollback();
        return res.status(404).json({ message: '게시판을 찾을 수 없습니다.' });
      }

      // 모든 삭제 성공 시 커밋
      await transaction.commit();

      logSecurityEvent('BOARD_DELETED', requestUser.id, { 
        deletedBoardId: id,
        boardName: board.name,
        deletedPosts: deletedPostCount,
        deletedComments: deletedCommentCount,
        deletedAccesses: deletedAccessCount
      });

      res.json({ 
        message: '게시판이 삭제되었습니다.',
        details: {
          boardName: board.name,
          deletedPosts: deletedPostCount,
          deletedComments: deletedCommentCount,
          deletedAccesses: deletedAccessCount
        }
      });

    } catch (error) {
      // 에러 발생 시 롤백
      await transaction.rollback();
      throw error;
    }

  } catch (err) {
    console.error('❌ deleteBoard error:', err);
    
    // 🔧 구체적인 에러 메시지 제공
    if (err instanceof Error) {
      if (err.message.includes('foreign key constraint')) {
        return res.status(400).json({
          message: '게시판에 연결된 데이터가 있어서 삭제할 수 없습니다.',
          error: 'Foreign Key 제약 조건 위반',
          hint: '관련 게시글이나 권한 설정을 먼저 확인하세요.'
        });
      }
    }
    
    handleError(err, 'deleteBoard', res);
  }
};

// === 🔒 보안 강화된 권한 관리 ===
export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    const roles = await Role.findAll({
      order: [['createdAt', 'ASC']],
    });
    
    res.json(roles);
  } catch (err) {
    handleError(err, 'getAllRoles', res);
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    let { id, name, description } = req.body;

    // 🔒 입력값 검증
    const validationError = validateRequiredFields({ id, name });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    id = sanitizeString(id, 50);
    name = sanitizeString(name, 100);
    description = sanitizeString(description || '', 500);

    if (!validateId(id)) {
      return res.status(400).json({ message: '권한 ID는 영문, 숫자, _, - 만 포함할 수 있습니다.' });
    }

    const existing = await Role.findByPk(id);
    if (existing) {
      return res.status(409).json({ message: '이미 존재하는 권한 ID입니다.' });
    }

    const role = await Role.create({
      id,
      name,
      description,
      isActive: true,
    });

    logSecurityEvent('ROLE_CREATED', requestUser.id, { 
      roleId: role.id, 
      roleName: role.name 
    });

    res.status(201).json(role);
  } catch (err) {
    handleError(err, 'createRole', res);
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    let { id } = req.params;
    let { name, description, isActive } = req.body;

    // 🔒 파라미터 검증
    id = sanitizeString(id, 50);
    if (!validateId(id)) {
      return res.status(400).json({ message: '잘못된 권한 ID입니다.' });
    }

    // 🔒 admin 역할 비활성화 방지
    if (id === 'admin' && isActive === false) {
      logSecurityEvent('ADMIN_ROLE_DISABLE_ATTEMPT', requestUser.id, {});
      return res.status(400).json({ message: 'admin 역할은 비활성화할 수 없습니다.' });
    }

    // 🔒 입력값 정제
    const updateData: any = {};
    if (name) updateData.name = sanitizeString(name, 100);
    if (description !== undefined) updateData.description = sanitizeString(description, 500);
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const [updated] = await Role.update(updateData, { where: { id } });

    if (updated === 0) {
      return res.status(404).json({ message: '권한을 찾을 수 없습니다.' });
    }

    const role = await Role.findByPk(id);
    
    logSecurityEvent('ROLE_UPDATED', requestUser.id, { 
      roleId: id, 
      updatedFields: Object.keys(updateData) 
    });

    res.json(role);
  } catch (err) {
    handleError(err, 'updateRole', res);
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    let { id } = req.params;

    // 🔒 파라미터 검증
    id = sanitizeString(id, 50);
    if (!validateId(id)) {
      return res.status(400).json({ message: '잘못된 권한 ID입니다.' });
    }

    // 🔒 admin 역할 삭제 방지
    if (id === 'admin') {
      logSecurityEvent('ADMIN_ROLE_DELETE_ATTEMPT', requestUser.id, {});
      return res.status(400).json({ message: 'admin 역할은 삭제할 수 없습니다.' });
    }

    const userCount = await User.count({ where: { roleId: id } });

    if (userCount > 0) {
      return res.status(400).json({
        message: `이 권한을 가진 사용자가 ${userCount}명 있습니다. 먼저 사용자의 권한을 변경해주세요.`
      });
    }

    await BoardAccess.destroy({ where: { roleId: id } });
    await EventPermission.destroy({ where: { roleId: id } });
    const deleted = await Role.destroy({ where: { id } });

    if (deleted === 0) {
      return res.status(404).json({ message: '권한을 찾을 수 없습니다.' });
    }

    logSecurityEvent('ROLE_DELETED', requestUser.id, { deletedRoleId: id });

    res.json({ message: '권한이 삭제되었습니다.' });
  } catch (err) {
    handleError(err, 'deleteRole', res);
  }
};

// === 🔒 보안 강화된 게시판 접근 권한 ===
export const getBoardAccessPermissions = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    let { boardId } = req.params;

    // 🔒 파라미터 검증
    boardId = sanitizeString(boardId, 50);
    if (!validateId(boardId)) {
      return res.status(400).json({ message: '잘못된 게시판 ID입니다.' });
    }

    const permissions = await BoardAccess.findAll({
      where: { boardId },
      include: [{ 
        model: Role, 
        as: 'role',
        attributes: ['id', 'name'] 
      }],
      order: [['createdAt', 'DESC']],
    });

    res.json(permissions);
  } catch (err) {
    handleError(err, 'getBoardAccessPermissions', res);
  }
};

export const setBoardAccessPermissions = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    let { boardId } = req.params;
    const { permissions } = req.body;

    // 🔒 파라미터 검증
    boardId = sanitizeString(boardId, 50);
    if (!validateId(boardId)) {
      return res.status(400).json({ message: '잘못된 게시판 ID입니다.' });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'permissions는 배열이어야 합니다.' });
    }

    // 🔒 권한 데이터 검증
    const validatedPermissions = [];
    for (const perm of permissions) {
      if (!perm.roleId || !validateId(perm.roleId)) {
        continue; // 잘못된 권한은 건너뛰기
      }
      
      validatedPermissions.push({
        boardId,
        roleId: sanitizeString(perm.roleId, 50),
        canRead: Boolean(perm.canRead),
        canWrite: Boolean(perm.canWrite),
        canDelete: Boolean(perm.canDelete),
      });
    }

    await BoardAccess.destroy({ where: { boardId } });
    await BoardAccess.bulkCreate(validatedPermissions);

    logSecurityEvent('BOARD_PERMISSIONS_SET', requestUser.id, { 
      boardId, 
      permissionCount: validatedPermissions.length 
    });

    res.json({ message: '권한이 설정되었습니다.' });
  } catch (err) {
    handleError(err, 'setBoardAccessPermissions', res);
  }
};

// === 🔒 보안 강화된 이벤트 관리 ===
export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    const events = await Event.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name'],
        include: [{
          model: Role,
          as: 'roleInfo',
          attributes: ['id', 'name']
        }]
      }],
      order: [['start', 'DESC']]
    });

    res.json(events);
  } catch (err) {
    handleError(err, 'getAllEvents', res);
  }
};

export const deleteEventAsAdmin = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    const { id } = req.params;

    // 🔒 파라미터 검증
    const eventId = validateNumericId(id);
    if (eventId === null) {
      return res.status(400).json({ message: '잘못된 이벤트 ID입니다.' });
    }

    // 🔒 이벤트 존재 확인
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
    }

    const deleted = await Event.destroy({ where: { id: eventId } });

    if (deleted === 0) {
      return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
    }

    logSecurityEvent('EVENT_DELETED_BY_ADMIN', requestUser.id, { 
      eventId: eventId, 
      eventTitle: event.title 
    });

    res.json({ message: '이벤트가 삭제되었습니다.' });
  } catch (err) {
    handleError(err, 'deleteEventAsAdmin', res);
  }
};

export const updateEventAsAdmin = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    const { id } = req.params;
    const updates = req.body;

    // 🔒 파라미터 검증
    const eventId = validateNumericId(id);
    if (eventId === null) {
      return res.status(400).json({ message: '잘못된 이벤트 ID입니다.' });
    }

    // 🔒 업데이트 데이터 검증 및 정제
    const allowedFields = ['title', 'start', 'end', 'location', 'body', 'calendarId'];
    const safeUpdates: any = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined && value !== null) {
        if (typeof value === 'string') {
          safeUpdates[key] = sanitizeString(value, key === 'body' ? 1000 : 200);
        } else if ((key === 'start' || key === 'end') && (typeof value === 'string' || typeof value === 'number' || value instanceof Date)) {
          // 🔒 날짜 검증 (타입 안전성 추가)
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            safeUpdates[key] = date;
          }
        } else {
          safeUpdates[key] = value;
        }
      }
    }

    // 🔒 이벤트 존재 확인
    const existingEvent = await Event.findByPk(eventId);
    if (!existingEvent) {
      return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
    }

    const [updated] = await Event.update(safeUpdates, { where: { id: eventId } });

    if (updated === 0) {
      return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
    }

    const event = await Event.findByPk(eventId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      }]
    });

    logSecurityEvent('EVENT_UPDATED_BY_ADMIN', requestUser.id, { 
      eventId: eventId, 
      updatedFields: Object.keys(safeUpdates) 
    });

    res.json(event);
  } catch (err) {
    handleError(err, 'updateEventAsAdmin', res);
  }
};

// === 🔒 보안 강화된 이벤트 권한 관리 ===
export const getEventPermissionsByRole = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    const activeRoles = await Role.findAll({
      where: { isActive: true },
      attributes: ['id', 'name'],
      order: [['id', 'ASC']]
    });

    const eventPermissions = await EventPermission.findAll();

    const result = activeRoles.map(role => {
      const permission = eventPermissions.find(p => p.roleId === role.id);
      
      return {
        roleId: role.id,
        canCreate: permission?.canCreate || false,
        canRead: permission?.canRead || false,
        canUpdate: permission?.canUpdate || false,
        canDelete: permission?.canDelete || false,
        role: {
          id: role.id,
          name: role.name
        }
      };
    });

    res.json(result);
  } catch (err) {
    handleError(err, 'getEventPermissionsByRole', res);
  }
};

export const setEventPermissions = async (req: Request, res: Response) => {
  try {
    const requestUser = validateAdminAccess(req, res);
    if (!requestUser) return;

    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'permissions는 배열이어야 합니다.' });
    }

    // 🔒 권한 데이터 검증
    const validatedPermissions = [];
    for (const perm of permissions) {
      if (!perm.roleId || !validateId(perm.roleId)) {
        continue; // 잘못된 권한은 건너뛰기
      }
      
      // 🔒 역할 존재 확인
      const roleExists = await Role.findByPk(perm.roleId);
      if (!roleExists) continue;
      
      validatedPermissions.push({
        roleId: sanitizeString(perm.roleId, 50),
        canCreate: Boolean(perm.canCreate),
        canRead: Boolean(perm.canRead),
        canUpdate: Boolean(perm.canUpdate),
        canDelete: Boolean(perm.canDelete),
      });
    }

    // 🔒 트랜잭션으로 안전하게 처리
    await EventPermission.destroy({ where: {} });
    await EventPermission.bulkCreate(validatedPermissions);

    logSecurityEvent('EVENT_PERMISSIONS_SET', requestUser.id, { 
      permissionCount: validatedPermissions.length,
      roles: validatedPermissions.map(p => p.roleId)
    });

    res.json({ message: '이벤트 권한이 설정되었습니다.' });
  } catch (err) {
    handleError(err, 'setEventPermissions', res);
  }
};