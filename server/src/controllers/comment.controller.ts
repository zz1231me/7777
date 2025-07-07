// src/controllers/comment.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { Comment } from '../models/Comment'; // ✅ 개별 import
import { User } from '../models/User';       // ✅ 개별 import

// ✅ 댓글 작성
export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { postId } = req.params;  // ✅ URL에서 postId 추출
  const { boardType } = req.params; // ✅ boardType도 함께 추출
  const { content } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: '로그인이 필요합니다.' });
    return;
  }

  if (!content || content.trim().length === 0) {
    res.status(400).json({ message: '댓글 내용을 입력해주세요.' });
    return;
  }

  try {
    const newComment = await Comment.create({
      content: content.trim(),
      PostId: postId,
      UserId: userId,
    });

    // 생성된 댓글과 사용자 정보 함께 조회
    const commentWithUser = await Comment.findByPk(newComment.id, {
      include: [{
        model: User,
        as: 'user', // Comment 모델에서 정의한 alias
        attributes: ['id', 'name']
      }]
    });

    res.status(201).json(commentWithUser);
  } catch (err) {
    console.error('❌ createComment error:', err);
    res.status(500).json({ message: '댓글 작성 실패', error: err });
  }
};

// ✅ 게시글의 댓글 조회
export const getCommentsByPost = async (req: AuthRequest, res: Response): Promise<void> => {
  const { postId } = req.params;  // ✅ 라우트와 일치하도록 수정

  try {
    const comments = await Comment.findAll({
      where: { PostId: postId },
      include: [{
        model: User,
        as: 'user', // Comment 모델에서 정의한 alias
        attributes: ['id', 'name'],
      }],
      order: [['createdAt', 'ASC']],
    });

    res.json(comments);
  } catch (err) {
    console.error('❌ getCommentsByPost error:', err);
    res.status(500).json({ message: '댓글 조회 실패', error: err });
  }
};

// ✅ 댓글 수정
export const updateComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!content || content.trim().length === 0) {
    res.status(400).json({ message: '댓글 내용을 입력해주세요.' });
    return;
  }

  try {
    const comment = await Comment.findByPk(commentId);

    if (!comment) {
      res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
      return;
    }

    // 권한 확인 (관리자 또는 댓글 작성자)
    const isAdmin = userRole === 'admin';
    const isOwner = comment.UserId === userId;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ message: '수정 권한이 없습니다.' });
      return;
    }

    // 댓글 수정
    await comment.update({ content: content.trim() });

    // 수정된 댓글과 사용자 정보 함께 조회
    const updatedComment = await Comment.findByPk(commentId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      }]
    });

    res.json(updatedComment);
  } catch (err) {
    console.error('❌ updateComment error:', err);
    res.status(500).json({ message: '댓글 수정 실패', error: err });
  }
};

// ✅ 댓글 삭제
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { commentId } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  try {
    const comment = await Comment.findByPk(commentId);

    if (!comment) {
      res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
      return;
    }

    // 권한 확인 (관리자 또는 댓글 작성자)
    const isAdmin = userRole === 'admin';
    const isOwner = comment.UserId === userId;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ message: '삭제 권한이 없습니다.' });
      return;
    }

    await comment.destroy();
    res.status(200).json({ message: '댓글이 삭제되었습니다.' });
  } catch (err) {
    console.error('❌ deleteComment error:', err);
    res.status(500).json({ message: '댓글 삭제 실패', error: err });
  }
};