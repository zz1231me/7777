"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPermissions = exports.changePassword = exports.register = exports.getCurrentUser = exports.logout = exports.refreshToken = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const Role_1 = require("../models/Role");
const Board_1 = __importDefault(require("../models/Board"));
const BoardAccess_1 = __importDefault(require("../models/BoardAccess"));
const EventPermission_1 = __importDefault(require("../models/EventPermission"));
const hash_1 = require("../utils/hash");
const admin_controller_1 = require("./admin.controller");
// 🔐 로그인 - 완전히 새로운 쿠키 기반 방식
const login = async (req, res, next) => {
    try {
        const { id, password } = req.body;
        // 사용자 조회 (역할 정보 포함)
        const user = await User_1.User.findByPk(id, {
            include: [{
                    model: Role_1.Role,
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
        const inputHash = (0, hash_1.hashPassword)(password);
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
        const payload = await (0, admin_controller_1.generateUserPayload)(userForPayload);
        // 🔄 Access Token (15분) - 짧은 수명
        const accessToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m', algorithm: 'HS256' });
        // 🔄 Refresh Token (3일) - 별도 시크릿 사용
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id, tokenType: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '3d', algorithm: 'HS256' });
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
    }
    catch (err) {
        console.error('❌ 로그인 오류:', err);
        next(err);
    }
};
exports.login = login;
// 🔄 토큰 갱신 - 완전히 새로운 방식
const refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.cookies;
        if (!refresh_token) {
            res.status(401).json({ message: '리프레시 토큰이 없습니다.' });
            return;
        }
        // Refresh Token 검증
        const decoded = jsonwebtoken_1.default.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
        if (decoded.tokenType !== 'refresh') {
            res.status(401).json({ message: '잘못된 토큰 타입입니다.' });
            return;
        }
        // 사용자 조회
        const user = await User_1.User.findByPk(decoded.id, {
            include: [{
                    model: Role_1.Role,
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
        const payload = await (0, admin_controller_1.generateUserPayload)(userForPayload);
        const newAccessToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: '30m', algorithm: 'HS256' });
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
    }
    catch (err) {
        console.error('❌ 토큰 갱신 실패:', err);
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ message: '리프레시 토큰이 만료되었습니다.' });
        }
        else {
            res.status(401).json({ message: '토큰 갱신 실패' });
        }
    }
};
exports.refreshToken = refreshToken;
// 🆕 로그아웃 - 쿠키 삭제
const logout = async (req, res) => {
    try {
        // 쿠키 삭제
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        res.json({ message: '로그아웃 성공' });
        console.log('🚪 로그아웃 성공 - 쿠키 삭제됨');
    }
    catch (err) {
        console.error('❌ 로그아웃 오류:', err);
        res.status(500).json({ message: '로그아웃 처리 중 오류가 발생했습니다.' });
    }
};
exports.logout = logout;
// 🆕 현재 사용자 정보 조회
const getCurrentUser = async (req, res) => {
    try {
        const authReq = req;
        if (!authReq.user) {
            res.status(401).json({ message: '인증 정보가 없습니다.' });
            return;
        }
        const user = await User_1.User.findByPk(authReq.user.id, {
            include: [{
                    model: Role_1.Role,
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
        const payload = await (0, admin_controller_1.generateUserPayload)(userForPayload);
        res.json({
            user: {
                id: user.id,
                name: user.name,
                role: user.roleId,
                roleInfo: user.roleInfo,
                permissions: payload.permissions
            }
        });
    }
    catch (err) {
        console.error('❌ 사용자 정보 조회 오류:', err);
        res.status(500).json({ message: '사용자 정보 조회 실패' });
    }
};
exports.getCurrentUser = getCurrentUser;
// 👤 회원 등록 (변경 없음)
const register = async (req, res, next) => {
    try {
        const { id, password, name, role } = req.body;
        // 필드 검증
        if (!id || !password || !name || !role) {
            res.status(400).json({ message: '모든 필드를 입력해주세요.' });
            return;
        }
        // 역할 존재 확인
        const roleExists = await Role_1.Role.findByPk(role);
        if (!roleExists) {
            res.status(400).json({ message: '존재하지 않는 역할입니다.' });
            return;
        }
        if (!roleExists.isActive) {
            res.status(400).json({ message: '비활성화된 역할입니다.' });
            return;
        }
        const existing = await User_1.User.findByPk(id);
        if (existing) {
            res.status(409).json({ message: '이미 존재하는 사용자입니다.' });
            return;
        }
        const hashedPassword = (0, hash_1.hashPassword)(password);
        const user = await User_1.User.create({
            id,
            password: hashedPassword,
            name,
            roleId: role,
        });
        res.status(201).json({
            message: '사용자 등록 완료',
            userId: user.id,
        });
    }
    catch (err) {
        console.error('❌ 회원가입 오류:', err);
        next(err);
    }
};
exports.register = register;
// 🔒 비밀번호 변경 (변경 없음)
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const authReq = req;
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
        const user = await User_1.User.findByPk(authReq.user.id);
        if (!user) {
            res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
            return;
        }
        const currentHashed = (0, hash_1.hashPassword)(currentPassword);
        if (user.password !== currentHashed) {
            res.status(400).json({ message: '현재 비밀번호가 틀렸습니다.' });
            return;
        }
        user.password = (0, hash_1.hashPassword)(newPassword);
        await user.save();
        res.status(200).json({ message: '비밀번호가 변경되었습니다.' });
    }
    catch (err) {
        console.error('❌ 비밀번호 변경 오류:', err);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};
exports.changePassword = changePassword;
// 🔍 현재 사용자의 권한 조회 API (변경 없음)
const getUserPermissions = async (req, res) => {
    try {
        const authReq = req;
        const userRole = authReq.user?.role;
        if (!userRole) {
            res.status(401).json({ message: '로그인이 필요합니다.' });
            return;
        }
        // 🔹 이벤트 권한 조회
        const eventPermission = await EventPermission_1.default.findOne({
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
        const boardPermissions = await BoardAccess_1.default.findAll({
            where: {
                roleId: userRole,
                canRead: true
            }
        });
        // 게시판 정보를 별도로 조회
        const boardsInfo = await Board_1.default.findAll({
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
    }
    catch (error) {
        console.error('❌ 사용자 권한 조회 실패:', error);
        res.status(500).json({ message: '권한 조회 중 오류가 발생했습니다.' });
    }
};
exports.getUserPermissions = getUserPermissions;
