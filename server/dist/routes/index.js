"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/index.ts
const express_1 = require("express");
// 모든 라우트 파일 import
const auth_routes_1 = __importDefault(require("./auth.routes"));
const admin_routes_1 = __importDefault(require("./admin.routes"));
const post_routes_1 = __importDefault(require("./post.routes"));
const board_routes_1 = __importDefault(require("./board.routes"));
const comment_routes_1 = __importDefault(require("./comment.routes"));
const event_routes_1 = __importDefault(require("./event.routes"));
const upload_routes_1 = __importDefault(require("./upload.routes"));
const router = (0, express_1.Router)();
// 라우트 등록
router.use('/auth', auth_routes_1.default); // /api/auth/*
router.use('/admin', admin_routes_1.default); // /api/admin/*
router.use('/posts', post_routes_1.default); // /api/posts/*
router.use('/boards', board_routes_1.default); // /api/boards/*
router.use('/comments', comment_routes_1.default); // /api/comments/*
router.use('/events', event_routes_1.default); // /api/events/*
router.use('/uploads', upload_routes_1.default); // /api/uploads/*
exports.default = router;
