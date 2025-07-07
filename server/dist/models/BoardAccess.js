"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardAccess = void 0;
// server/src/models/BoardAccess.ts
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
class BoardAccess extends sequelize_1.Model {
}
exports.BoardAccess = BoardAccess;
BoardAccess.init({
    boardId: {
        type: sequelize_1.DataTypes.STRING(50),
        primaryKey: true,
        allowNull: false,
    },
    roleId: {
        type: sequelize_1.DataTypes.STRING(50),
        primaryKey: true,
        allowNull: false,
    },
    canRead: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
    canWrite: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
    canDelete: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'BoardAccess',
    tableName: 'board_accesses',
    timestamps: true,
});
// 🚨 관계 정의 제거 - models/index.ts에서만!
exports.default = BoardAccess;
