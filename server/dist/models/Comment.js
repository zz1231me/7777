"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Comment = void 0;
// src/models/Comment.ts
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
// ✅ Comment 클래스 정의
class Comment extends sequelize_1.Model {
}
exports.Comment = Comment;
// 모델 초기화
Comment.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    content: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    PostId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    UserId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
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
    modelName: 'Comment',
    tableName: 'comments',
    timestamps: true,
});
// 🚨 관계 정의 제거 - models/index.ts에서만!
