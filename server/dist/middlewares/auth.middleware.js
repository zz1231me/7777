"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const Role_1 = require("../models/Role");
const authenticate = async (req, res, next) => {
    try {
        // 🍪 쿠키에서 access_token 추출
        const { access_token } = req.cookies;
        if (!access_token) {
            console.warn('❌ 인증 실패: access_token 쿠키 없음');
            res.status(401).json({ message: '인증 토큰이 없습니다.' });
            return;
        }
        // JWT 토큰 검증
        const decoded = jsonwebtoken_1.default.verify(access_token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
        });
        // ✅ 사용자 + 역할 정보 조회 (기존과 동일)
        const user = await User_1.User.findByPk(decoded.id, {
            include: [{
                    model: Role_1.Role,
                    as: 'roleInfo',
                    attributes: ['id', 'name', 'description', 'isActive']
                }],
            attributes: ['id', 'name', 'roleId']
        });
        if (!user) {
            console.warn('❌ 사용자 없음');
            res.status(401).json({ message: '존재하지 않는 사용자입니다.' });
            return;
        }
        if (!user.roleInfo) {
            console.warn('❌ 역할 정보 없음');
            res.status(403).json({ message: '역할 정보가 없습니다.' });
            return;
        }
        if (!user.roleInfo.isActive) {
            console.warn('❌ 비활성화된 역할');
            res.status(403).json({ message: '비활성화된 역할입니다.' });
            return;
        }
        // ✅ req.user에 타입 안전한 정보 주입 (기존과 동일)
        req.user = {
            id: user.id,
            name: user.name,
            role: user.roleInfo.id, // 역할 ID 저장
        };
        console.log('✅ 쿠키 기반 인증 성공');
        console.log(`🔐 사용자 ID: ${user.id}`);
        console.log(`🔐 이름: ${user.name}`);
        console.log(`🔐 역할 ID: ${user.roleInfo.id}`);
        console.log(`🔐 역할 이름: ${user.roleInfo.name}`);
        next();
    }
    catch (err) {
        console.error('❌ JWT 인증 실패:', err);
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            // 🔄 419 상태 코드로 변경 - 자동 토큰 갱신 신호
            res.status(419).json({ message: '토큰이 만료되었습니다.' });
            return;
        }
        if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
            return;
        }
        res.status(500).json({ message: '인증 처리 중 오류가 발생했습니다.' });
    }
};
exports.authenticate = authenticate;
// 🆕 선택적 인증 미들웨어 (토큰이 있으면 사용자 정보 주입, 없어도 통과)
const optionalAuthenticate = async (req, res, next) => {
    try {
        const { access_token } = req.cookies;
        // 토큰이 없으면 그냥 통과
        if (!access_token) {
            console.log('ℹ️ 선택적 인증: 토큰 없음, 통과');
            next();
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(access_token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
        });
        const user = await User_1.User.findByPk(decoded.id, {
            include: [{
                    model: Role_1.Role,
                    as: 'roleInfo',
                    attributes: ['id', 'name', 'description', 'isActive']
                }],
            attributes: ['id', 'name', 'roleId']
        });
        // 사용자가 있고 역할이 활성화되어 있으면 req.user에 설정
        if (user && user.roleInfo?.isActive) {
            req.user = {
                id: user.id,
                name: user.name,
                role: user.roleInfo.id,
            };
            console.log('✅ 선택적 인증 성공:', user.name);
        }
        else {
            console.log('⚠️ 선택적 인증: 사용자 없음 또는 비활성화된 역할');
        }
        next();
    }
    catch (err) {
        // 선택적 인증이므로 오류가 발생해도 다음 미들웨어로 진행
        console.warn('⚠️ 선택적 인증 실패, 계속 진행:', err);
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
