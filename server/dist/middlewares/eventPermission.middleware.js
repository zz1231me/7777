"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserEventPermissions = exports.checkEventPermission = void 0;
const Role_1 = require("../models/Role");
const EventPermission_1 = __importDefault(require("../models/EventPermission"));
const checkEventPermission = (action) => {
    return async (req, res, next) => {
        try {
            const userRole = req.user?.role;
            console.log('=== 이벤트 권한 체크 시작 ===');
            console.log('👤 사용자 역할:', userRole);
            console.log('🎯 요청 액션:', action);
            if (!userRole) {
                console.log('❌ 사용자 역할 없음');
                return res.status(401).json({ message: '로그인이 필요합니다.' });
            }
            // 역할 정보 확인
            const role = await Role_1.Role.findByPk(userRole);
            if (!role || !role.isActive) {
                console.log('❌ 역할 정보 없거나 비활성화됨');
                return res.status(403).json({ message: '유효하지 않은 권한입니다.' });
            }
            // EventPermission 조회
            const eventPermission = await EventPermission_1.default.findOne({
                where: { roleId: userRole }
            });
            console.log('📋 EventPermission 조회 결과:', eventPermission ? eventPermission.toJSON() : null);
            if (!eventPermission) {
                console.log('❌ EventPermission 레코드 없음');
                // ✅ 기본 권한 적용 - 읽기만 허용
                if (action === 'read') {
                    console.log(`✅ 기본 권한으로 이벤트 조회 허용: 역할="${userRole}"`);
                    return next();
                }
                else {
                    console.warn(`❌ 권한 설정 없음: 역할="${userRole}", 액션="${action}"`);
                    return res.status(403).json({
                        message: `${getActionName(action)} 권한이 설정되지 않았습니다. 관리자에게 문의하세요.`
                    });
                }
            }
            // ✅ 권한 체크 로직 개선
            const hasPermission = checkPermissionByAction(eventPermission, action);
            console.log(`🎯 ${action} 액션 권한 체크 결과:`, hasPermission);
            if (!hasPermission) {
                console.warn(`❌ 이벤트 권한 거부: 역할="${userRole}", 액션="${action}"`);
                return res.status(403).json({
                    message: `${getActionName(action)} 권한이 없습니다.`
                });
            }
            console.log(`✅ 이벤트 권한 허용: 역할="${userRole}", 액션="${action}"`);
            next();
        }
        catch (error) {
            console.error('❌ 이벤트 권한 체크 오류:', error);
            res.status(500).json({ message: '권한 확인 중 오류가 발생했습니다.' });
        }
    };
};
exports.checkEventPermission = checkEventPermission;
// ✅ 권한 체크 로직 수정
function checkPermissionByAction(permission, action) {
    switch (action) {
        case 'create':
            return permission.canCreate;
        case 'read':
            return permission.canRead;
        case 'update':
            return permission.canUpdate; // 미들웨어에서도 체크
        case 'delete':
            return permission.canDelete; // 미들웨어에서도 체크
        default:
            return false;
    }
}
function getActionName(action) {
    const actionNames = {
        create: '일정 생성',
        read: '일정 조회',
        update: '일정 수정',
        delete: '일정 삭제'
    };
    return actionNames[action] || action;
}
// ✅ 사용자 이벤트 권한 조회 API용 헬퍼 함수
const getUserEventPermissions = async (roleId) => {
    try {
        const permission = await EventPermission_1.default.findOne({
            where: { roleId },
            include: [{
                    model: Role_1.Role,
                    as: 'role',
                    attributes: ['id', 'name']
                }]
        });
        return permission || {
            roleId,
            canCreate: false,
            canRead: true, // 기본적으로 조회만 허용
            canUpdate: false,
            canDelete: false
        };
    }
    catch (error) {
        console.error('❌ 사용자 이벤트 권한 조회 실패:', error);
        return {
            roleId,
            canCreate: false,
            canRead: true,
            canUpdate: false,
            canDelete: false
        };
    }
};
exports.getUserEventPermissions = getUserEventPermissions;
