// src/controllers/post.controller.ts - 한글 파일명 지원 완전 수정 버전
import { Response } from 'express';
import { Op } from 'sequelize';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { Comment } from '../models/Comment';
import { AuthRequest } from '../types/auth-request';
import sanitizeHtml from 'sanitize-html';
import fs from 'fs';
import path from 'path';

// ✅ HTML 정화 옵션
const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'pre', 'code', 'span', 'mark',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target'],
    img: ['src', 'alt'],
    span: ['style'],
    mark: ['style'],
    code: ['class'],
  },
  allowedStyles: {
    span: {
      color: [/.*/],
      'background-color': [/.*/],
      'font-weight': [/^\d+$/, /^bold$/],
      'font-style': [/^italic$/],
      'text-decoration': [/^underline$/, /^line-through$/, /^none$/, /^overline$/],
      'font-size': [/.*/],
      'font-family': [/.*/],
    },
    mark: {
      'background-color': [/.*/],
    },
  },
  disallowedTagsMode: 'discard',  // <-- 'as const' 제거!
  textFilter: (text: string) => {
    return text.replace(/&gt;/g, '>');
  },
};



// ✅ 파일 삭제 유틸리티 함수
const deleteFileIfExists = (filename: string) => {
  try {
    const filePath = path.join(__dirname, '../../uploads/files', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ 파일 삭제 성공: ${filename}`);
    }
  } catch (error) {
    console.error(`❌ 파일 삭제 실패: ${filename}`, error);
  }
};

// ✅ 게시글 목록 조회 - 페이지네이션, 검색, 댓글 개수 포함
export const getPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const boardType = req.params.boardType;
    
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const search = (req.query.search as string || '').trim();
    
    const whereCondition: any = { boardType };
    
    if (search) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const totalCount = await Post.count({ where: whereCondition });

    const posts = await Post.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      attributes: [
        'id', 
        'title', 
        'createdAt', 
        'author',
        'content',
        'UserId',
        [
          require('sequelize').literal(`(
            SELECT COUNT(*)
            FROM comments AS c
            WHERE c.PostId = Post.id
          )`),
          'commentCount'
        ]
      ],
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset,
      subQuery: false,
      raw: false
    });

    const formattedPosts = posts.map(post => {
      const postData = post.get({ plain: true }) as any;
      return {
        id: postData.id,
        title: postData.title,
        author: postData.user?.name || postData.author || 'Unknown',
        createdAt: postData.createdAt,
        UserId: postData.UserId,
        commentCount: parseInt(postData.commentCount) || 0
      };
    });

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      posts: formattedPosts,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (err) {
    console.error('❌ getPosts error:', err);
    res.status(500).json({ 
      message: '게시글 목록 조회 실패',
      posts: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        limit: 10,
        hasNextPage: false,
        hasPrevPage: false
      }
    });
  }
};

// ✅ 게시글 상세 조회 - 깔끔한 파일 정보 반환
export const getPostById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      }],
    });

    if (!post) {
      res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
      return;
    }

    // ✅ 깔끔한 첨부파일 처리
    let attachments: Array<{
      url: string;
      originalName: string;
      storedName: string;
      size?: number;
      mimeType?: string;
    }> = [];

    if (post.attachments) {
      try {
        const fileData = JSON.parse(post.attachments);
        
        if (Array.isArray(fileData)) {
          attachments = fileData.map((file: any) => ({
            url: `/uploads/files/${file.storedName}`,
            originalName: file.originalName,
            storedName: file.storedName,
            size: file.size || 0,
            mimeType: file.mimeType || 'application/octet-stream'
          }));
        }
        
        console.log('📄 파일 정보 반환:', attachments);
      } catch (error) {
        console.error('❌ 첨부파일 파싱 오류:', error);
      }
    }

    res.json({
      id: post.id,
      title: post.title,
      content: post.content,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.user?.name || post.author || 'Unknown',
      UserId: post.UserId,
      boardType: post.boardType,
      attachments: attachments,
    });
  } catch (err) {
    console.error('❌ getPostById error:', err);
    res.status(500).json({ message: '게시글 조회 실패' });
  }
};

// ✅ 게시글 생성 - 한글 파일명 완벽 처리
export const createPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, originalFilenames } = req.body; // ✅ originalFilenames 추가
    const boardType = req.params.boardType;
    const files = req.files as Express.Multer.File[];

    if (!req.user) {
      res.status(401).json({ message: '인증이 필요합니다.' });
      return;
    }

    if (!title || !content) {
      res.status(400).json({ message: '제목과 내용을 모두 입력해주세요.' });
      return;
    }

    if (title.trim().length === 0 || content.trim().length === 0) {
      res.status(400).json({ message: '제목과 내용을 입력해주세요.' });
      return;
    }

    const cleanContent = sanitizeHtml(content, sanitizeOptions);

    // ✅ 한글 파일명 완벽 처리
    let attachmentsJson: string | null = null;
    if (files && files.length > 0) {
      let originalNames: string[] = [];
      
      // 클라이언트에서 전송한 원본 파일명 사용
      if (originalFilenames) {
        try {
          originalNames = JSON.parse(originalFilenames);
          console.log('📥 받은 원본 파일명들:', originalNames);
        } catch (error) {
          console.error('원본 파일명 파싱 오류:', error);
          originalNames = files.map((_, index) => `file_${index + 1}`);
        }
      } else {
        originalNames = files.map((_, index) => `file_${index + 1}`);
      }

      // 파일 정보 객체 생성
      const fileData = files.map((file, index) => ({
        storedName: file.filename,
        originalName: originalNames[index] || `file_${index + 1}`,
        size: file.size,
        mimeType: file.mimetype
      }));
      
      attachmentsJson = JSON.stringify(fileData);
      console.log('📁 최종 파일 정보 저장:', fileData);
    }

    const post = await Post.create({
      title: title.trim(),
      content: cleanContent,
      boardType,
      author: req.user.name || 'Unknown',
      attachments: attachmentsJson,
      UserId: req.user.id,
    });

    const postWithUser = await Post.findByPk(post.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      }]
    });

    res.status(201).json(postWithUser);
  } catch (err) {
    console.error('❌ createPost error:', err);
    
    // 오류 발생 시 업로드된 파일들 삭제
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      files.forEach(file => deleteFileIfExists(file.filename));
    }
    
    res.status(500).json({ message: '게시글 생성 실패' });
  }
};

// ✅ 게시글 수정 - 한글 파일명 완벽 처리
// ✅ 게시글 수정 - deletedFileNames 처리 추가
export const updatePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, keepExistingFiles, originalFilenames, deletedFileNames } = req.body; // ✅ deletedFileNames 추가
    const files = req.files as Express.Multer.File[];
    const { id } = req.params;

    console.log('🚀 updatePost 요청 데이터:', {
      title,
      keepExistingFiles,
      deletedFileNames,
      newFilesCount: files?.length || 0
    });

    if (!title || !content) {
      res.status(400).json({ message: '제목과 내용을 모두 입력해주세요.' });
      return;
    }

    if (title.trim().length === 0 || content.trim().length === 0) {
      res.status(400).json({ message: '제목과 내용을 입력해주세요.' });
      return;
    }

    const post = await Post.findByPk(id);

    if (!post) {
      res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
      return;
    }

    // 권한 확인
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?.id === post.UserId;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ message: '수정 권한이 없습니다.' });
      return;
    }

    const cleanContent = sanitizeHtml(content, sanitizeOptions);

    // ✅ 파일 처리 로직 개선
    let newAttachmentsJson: string | null = null;
    let existingFiles: Array<any> = [];

    // 기존 첨부파일 가져오기
    if (post.attachments) {
      try {
        existingFiles = JSON.parse(post.attachments);
        console.log('📁 기존 파일들:', existingFiles.map(f => f.originalName));
      } catch (error) {
        console.error('기존 첨부파일 파싱 오류:', error);
      }
    }

    // ✅ 삭제된 파일들 처리
    let parsedDeletedFileNames: string[] = [];
    if (deletedFileNames) {
      try {
        if (typeof deletedFileNames === 'string') {
          parsedDeletedFileNames = JSON.parse(deletedFileNames);
        } else if (Array.isArray(deletedFileNames)) {
          parsedDeletedFileNames = deletedFileNames;
        }
        console.log('🗑️ 삭제할 파일들:', parsedDeletedFileNames);
      } catch (error) {
        console.error('deletedFileNames 파싱 오류:', error);
      }
    }

    // ✅ 삭제된 파일들을 실제로 삭제하고 목록에서 제거
    if (parsedDeletedFileNames.length > 0) {
      // 파일 시스템에서 삭제
      parsedDeletedFileNames.forEach(storedName => {
        deleteFileIfExists(storedName);
        console.log(`🗑️ 파일 삭제 처리: ${storedName}`);
      });

      // 기존 파일 목록에서 삭제된 파일들 제거
      existingFiles = existingFiles.filter(file => 
        !parsedDeletedFileNames.includes(file.storedName)
      );
      console.log('📁 삭제 후 남은 기존 파일들:', existingFiles.map(f => f.originalName));
    }

    // 기존 파일 처리
    const shouldKeepOldFiles = keepExistingFiles === 'true';
    let finalFiles: Array<any> = [];

    if (shouldKeepOldFiles) {
      finalFiles = [...existingFiles]; // 이미 삭제된 파일들은 제외된 상태
    } else {
      // 기존 파일 모두 삭제 (이미 삭제된 파일들 제외)
      existingFiles.forEach(file => deleteFileIfExists(file.storedName));
    }

    // ✅ 새 파일 추가 - 한글 파일명 처리
    if (files && files.length > 0) {
      let originalNames: string[] = [];
      
      // 클라이언트에서 전송한 원본 파일명 사용
      if (originalFilenames) {
        try {
          originalNames = JSON.parse(originalFilenames);
          console.log('📥 받은 원본 파일명들:', originalNames);
        } catch (error) {
          console.error('원본 파일명 파싱 오류:', error);
          originalNames = files.map((_, index) => `file_${index + 1}`);
        }
      } else {
        originalNames = files.map((_, index) => `file_${index + 1}`);
      }

      const newFiles = files.map((file, index) => ({
        storedName: file.filename,
        originalName: originalNames[index] || `file_${index + 1}`,
        size: file.size,
        mimeType: file.mimetype
      }));
      
      finalFiles = [...finalFiles, ...newFiles];
      
      // 최대 3개 파일 제한
      if (finalFiles.length > 3) {
        const excessFiles = finalFiles.slice(3);
        excessFiles.forEach(file => deleteFileIfExists(file.storedName));
        finalFiles = finalFiles.slice(0, 3);
      }

      console.log('📁 새로 추가된 파일 정보:', newFiles);
    }

    console.log('📁 최종 파일 목록:', finalFiles.map(f => f.originalName));
    newAttachmentsJson = finalFiles.length > 0 ? JSON.stringify(finalFiles) : null;

    // 게시글 업데이트
    await post.update({
      title: title.trim(),
      content: cleanContent,
      attachments: newAttachmentsJson
    });

    const updatedPost = await Post.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      }]
    });

    console.log('✅ 게시글 수정 완료');
    res.json(updatedPost);
  } catch (err) {
    console.error('❌ updatePost error:', err);
    
    // 오류 발생 시 새로 업로드된 파일들 삭제
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      files.forEach(file => deleteFileIfExists(file.filename));
    }
    
    res.status(500).json({ message: '게시글 수정 실패' });
  }
};

// ✅ 게시글 삭제 - 첨부파일도 함께 삭제
export const deletePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
      res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
      return;
    }

    // 권한 확인
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?.id === post.UserId;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ message: '삭제 권한이 없습니다.' });
      return;
    }

    // 첨부파일 삭제
    if (post.attachments) {
      try {
        const files = JSON.parse(post.attachments);
        if (Array.isArray(files)) {
          files.forEach((file: any) => deleteFileIfExists(file.storedName));
        }
      } catch (error) {
        console.error('첨부파일 삭제 중 오류:', error);
      }
    }

    await post.destroy();
    res.json({ message: '게시글이 삭제되었습니다.' });
  } catch (err) {
    console.error('❌ deletePost error:', err);
    res.status(500).json({ message: '게시글 삭제 실패' });
  }
};
