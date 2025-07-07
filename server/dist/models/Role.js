"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
// server/src/models/Role.ts
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
// ✅ Role 클래스 정의 (다른 모델들과 통일)
class Role extends sequelize_1.Model {
}
exports.Role = Role;
// 모델 초기화
Role.init({
    id: {
        type: sequelize_1.DataTypes.STRING(50),
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'Role',
    tableName: 'roles',
    timestamps: true,
});
exports.default = Role;
