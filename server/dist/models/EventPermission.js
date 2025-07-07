"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPermission = void 0;
// server/src/models/EventPermission.ts
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
class EventPermission extends sequelize_1.Model {
}
exports.EventPermission = EventPermission;
EventPermission.init({
    roleId: {
        type: sequelize_1.DataTypes.STRING(50),
        primaryKey: true,
        allowNull: false,
        references: {
            model: 'roles',
            key: 'id'
        }
    },
    canCreate: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
        comment: '이벤트 생성 권한'
    },
    canRead: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
        comment: '이벤트 조회 권한'
    },
    canUpdate: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '다른 사람 이벤트 수정 권한 (본인 이벤트는 항상 수정 가능)'
    },
    canDelete: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '다른 사람 이벤트 삭제 권한 (본인 이벤트는 항상 삭제 가능)'
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'EventPermission',
    tableName: 'event_permissions',
    timestamps: true,
});
exports.default = EventPermission;
