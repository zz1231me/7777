// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Role } from '../models/Role';
import Board from '../models/Board';
import BoardAccess from '../models/BoardAccess';
import EventPermission from '../models/EventPermission';
import { hashPassword } from '../utils/hash';
import { AuthRequest } from '../types/auth-request';
import { generateUserPayload } from './admin.controller';

// 🔐 로그인 - 완전히 새로운 쿠키 기반 방식
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, password } = req.body;

    // 사용자 조회 (역할 정보 포함)
    const user = await User.findByPk(id, {
      include: [{
        model: Role,
        as: 'roleInfo',
        attributes: ['id', 'name', 'description', 'isActive']
      }]
    });

    if (!user) {
      res.status(401).json({ message: '아이디 및 비밀번호가 틀렸습니다.' });
      return;
    }

    if (!user.roleInfo) {
      res.status(401).json({ message: '역할 정보가 없습니다.' });
      return;
    }

    if (!user.roleInfo.isActive) {
      res.status(403).json({ message: '비활성화된 역할입니다.' });
      return;
    }

    const inputHash = hashPassword(password);
    if (inputHash !== user.password) {
      res.status(401).json({ message: '아이디 및 비밀번호가 틀렸습니다.' });
      return;
    }

    // ✅ payload 생성 (기존과 동일)
    const userForPayload = {
      id: user.id,
      name: user.name,
      role: user.roleId,
      roleId: user.roleId
    };

    const payload = await generateUserPayload(userForPayload);

    // 🔄 Access Token (15분) - 짧은 수명
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: '15m', algorithm: 'HS256' }
    );

    // 🔄 Refresh Token (3일) - 별도 시크릿 사용
    const refreshToken = jwt.sign(
      { id: user.id, tokenType: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '3d', algorithm: 'HS256' }
    );

    // 🍪 HttpOnly 쿠키로 토큰 저장
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15분
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3 * 24 * 60 * 60 * 1000 // 3일
    });

    // 🔄 응답에서 token 필드 제거, user 정보만 반환
    res.json({
      message: '로그인 성공',
      user: {
        id: user.id,
        name: user.name,
        role: user.roleId,
        roleInfo: user.roleInfo,
        permissions: payload.permissions
      }
    });

    console.log('✅ 로그인 성공:', user.name, '- 쿠키로 토큰 설정');
  } catch (err) {
    console.error('❌ 로그인 오류:', err);
    next(err);
  }
};

// 🔄 토큰 갱신 - 완전히 새로운 방식
export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refresh_token } = req.cookies;

    if (!refresh_token) {
      res.status(401).json({ message: '리프레시 토큰이 없습니다.' });
      return;
    }

    // Refresh Token 검증
    const decoded = jwt.verify(
      refresh_token,
      process.env.JWT_REFRESH_SECRET!
    ) as { id: string; tokenType: string };

    if (decoded.tokenType !== 'refresh') {
      res.status(401).json({ message: '잘못된 토큰 타입입니다.' });
      return;
    }

    // 사용자 조회
    const user = await User.findByPk(decoded.id, {
      include: [{
        model: Role,
        as: 'roleInfo',
        attributes: ['id', 'name', 'description', 'isActive']
      }]
    });

    if (!user) {
      res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
      return;
    }

    if (!user.roleInfo?.isActive) {
      res.status(403).json({ message: '비활성화된 역할입니다.' });
      return;
    }

    // 새 Access Token 생성
    const userForPayload = {
      id: user.id,
      name: user.name,
      role: user.roleId,
      roleId: user.roleId
    };

    const payload = await generateUserPayload(userForPayload);
    
    const newAccessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: '30m', algorithm: 'HS256' }
    );

    // 새 Access Token을 쿠키에 저장
    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 60 * 1000
    });

    res.json({
      message: '토큰 갱신 성공',
      user: {
        id: user.id,
        name: user.name,
        role: user.roleId,
        roleInfo: user.roleInfo,
        permissions: payload.permissions
      }
    });

    console.log('🔄 토큰 갱신 성공:', user.name);
  } catch (err) {
    console.error('❌ 토큰 갱신 실패:', err);
    
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: '리프레시 토큰이 만료되었습니다.' });
    } else {
      res.status(401).json({ message: '토큰 갱신 실패' });
    }
  }
};

// 🆕 로그아웃 - 쿠키 삭제
export const logout = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 쿠키 삭제
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.json({ message: '로그아웃 성공' });
    console.log('🚪 로그아웃 성공 - 쿠키 삭제됨');
  } catch (err) {
    console.error('❌ 로그아웃 오류:', err);
    res.status(500).json({ message: '로그아웃 처리 중 오류가 발생했습니다.' });
  }
};

// 🆕 현재 사용자 정보 조회
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      res.status(401).json({ message: '인증 정보가 없습니다.' });
      return;
    }

    const user = await User.findByPk(authReq.user.id, {
      include: [{
        model: Role,
        as: 'roleInfo',
        attributes: ['id', 'name', 'description', 'isActive']
      }]
    });

    if (!user) {
      res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      return;
    }

    const userForPayload = {
      id: user.id,
      name: user.name,
      role: user.roleId,
      roleId: user.roleId
    };

    const payload = await generateUserPayload(userForPayload);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.roleId,
        roleInfo: user.roleInfo,
        permissions: payload.permissions
      }
    });
  } catch (err) {
    console.error('❌ 사용자 정보 조회 오류:', err);
    res.status(500).json({ message: '사용자 정보 조회 실패' });
  }
};

// 👤 회원 등록 (변경 없음)
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, password, name, role } = req.body;

    // 필드 검증
    if (!id || !password || !name || !role) {
      res.status(400).json({ message: '모든 필드를 입력해주세요.' });
      return;
    }

    // 역할 존재 확인
    const roleExists = await Role.findByPk(role);
    if (!roleExists) {
      res.status(400).json({ message: '존재하지 않는 역할입니다.' });
      return;
    }

    if (!roleExists.isActive) {
      res.status(400).json({ message: '비활성화된 역할입니다.' });
      return;
    }

    const existing = await User.findByPk(id);
    if (existing) {
      res.status(409).json({ message: '이미 존재하는 사용자입니다.' });
      return;
    }

    const hashedPassword = hashPassword(password);

    const user = await User.create({
      id,
      password: hashedPassword,
      name,
      roleId: role,
    });

    res.status(201).json({
      message: '사용자 등록 완료',
      userId: user.id,
    });
  } catch (err) {
    console.error('❌ 회원가입 오류:', err);
    next(err);
  }
};

// 🔒 비밀번호 변경 (변경 없음)
export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      res.status(401).json({ message: '인증 정보가 없습니다.' });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
      return;
    }

    const user = await User.findByPk(authReq.user.id);
    if (!user) {
      res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      return;
    }

    const currentHashed = hashPassword(currentPassword);
    if (user.password !== currentHashed) {
      res.status(400).json({ message: '현재 비밀번호가 틀렸습니다.' });
      return;
    }

    user.password = hashPassword(newPassword);
    await user.save();

    res.status(200).json({ message: '비밀번호가 변경되었습니다.' });
  } catch (err) {
    console.error('❌ 비밀번호 변경 오류:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 🔍 현재 사용자의 권한 조회 API (변경 없음)
export const getUserPermissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userRole = authReq.user?.role;
    
    if (!userRole) {
      res.status(401).json({ message: '로그인이 필요합니다.' });
      return;
    }

    // 🔹 이벤트 권한 조회
    const eventPermission = await EventPermission.findOne({
      where: { roleId: userRole }
    });

    const eventPermissions = eventPermission ? {
      canCreate: eventPermission.canCreate,
      canRead: eventPermission.canRead,
      canUpdate: eventPermission.canUpdate,
      canDelete: eventPermission.canDelete
    } : {
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false
    };

    // 🔹 게시판 권한 조회
    const boardPermissions = await BoardAccess.findAll({
      where: { 
        roleId: userRole,
        canRead: true
      }
    });

    // 게시판 정보를 별도로 조회
    const boardsInfo = await Board.findAll({
      where: { isActive: true },
      attributes: ['id', 'name']
    });

    // 게시판 정보와 권한 정보를 매핑
    const boardPermissionsWithNames = boardPermissions.map(bp => {
      const board = boardsInfo.find(b => b.id === bp.boardId);
      return {
        boardId: bp.boardId,
        boardName: board?.name || '알 수 없는 게시판',
        canRead: bp.canRead,
        canWrite: bp.canWrite,
        canDelete: bp.canDelete
      };
    });

    const response = {
      role: userRole,
      eventPermissions,
      boardPermissions: boardPermissionsWithNames
    };

    res.json(response);
  } catch (error) {
    console.error('❌ 사용자 권한 조회 실패:', error);
    res.status(500).json({ message: '권한 조회 중 오류가 발생했습니다.' });
  }
};