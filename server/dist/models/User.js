"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
// src/models/User.ts
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
// ✅ User 클래스 정의
class User extends sequelize_1.Model {
}
exports.User = User;
// 모델 초기화
User.init({
    id: {
        type: sequelize_1.DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    password: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
    },
    roleId: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: false,
        field: 'role', // 실제 DB 컬럼명은 'role'
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
    tableName: 'users',
    modelName: 'User',
});
// 🚨 관계 정의는 models/index.ts에서만!
