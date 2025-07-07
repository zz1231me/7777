// src/routes/index.ts
import { Router } from 'express';

// 모든 라우트 파일 import
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import postRoutes from './post.routes';
import boardRoutes from './board.routes';
import commentRoutes from './comment.routes';
import eventRoutes from './event.routes';
import uploadRoutes from './upload.routes';

const router = Router();

// 라우트 등록
router.use('/auth', authRoutes);        // /api/auth/*
router.use('/admin', adminRoutes);      // /api/admin/*
router.use('/posts', postRoutes);       // /api/posts/*
router.use('/boards', boardRoutes);     // /api/boards/*
router.use('/comments', commentRoutes); // /api/comments/*
router.use('/events', eventRoutes);     // /api/events/*
router.use('/uploads', uploadRoutes);   // /api/uploads/*

export default router;