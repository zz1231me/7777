"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Board = void 0;
// server/src/models/Board.ts
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
class Board extends sequelize_1.Model {
}
exports.Board = Board;
Board.init({
    id: {
        type: sequelize_1.DataTypes.STRING(50),
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
    order: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'Board',
    tableName: 'boards',
    timestamps: true,
});
exports.default = Board;
