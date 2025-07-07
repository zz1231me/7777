"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Post = void 0;
// src/models/Post.ts
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
const generateId_1 = require("../utils/generateId");
// ✅ Post 모델을 class 방식으로 통일 - 다중 파일 지원
class Post extends sequelize_1.Model {
}
exports.Post = Post;
// 모델 초기화
Post.init({
    id: {
        type: sequelize_1.DataTypes.STRING(8),
        primaryKey: true,
        allowNull: false,
        defaultValue: () => (0, generateId_1.generateRandomId)(8),
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    content: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    author: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    attachments: {
        type: sequelize_1.DataTypes.TEXT, // JSON 문자열 저장을 위해 TEXT 타입 사용
        allowNull: true,
    },
    boardType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'general',
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
    timestamps: true,
    tableName: 'Posts',
    modelName: 'Post',
});
// 🚨 관계 정의 제거 - models/index.ts에서만!
