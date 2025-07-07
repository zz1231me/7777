/// <reference path="./types/express/index.d.ts" />
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser'; // ✅ 추가

// ✅ 라우트 import
import authRoutes from './routes/auth.routes';
import postRoutes from './routes/post.routes';
import adminRoutes from './routes/admin.routes';
import eventRoutes from './routes/event.routes';
import uploadRoutes from './routes/upload.routes';
import boardRoutes from './routes/board.routes';
import commentRoutes from './routes/comment.routes';

// ✅ 데이터베이스 설정
import { sequelize } from './config/sequelize';

// ✅ 모든 모델 import (관계 설정을 위해 필요!)
import { User } from './models/User';
import { Role } from './models/Role';
import { Post } from './models/Post';
import { Comment } from './models/Comment';
import Board from './models/Board';
import BoardAccess from './models/BoardAccess';
import Event from './models/Event';
import EventPermission from './models/EventPermission';

// ✅ 데이터 마이그레이션 함수
import { runMigrationIfNeeded } from './scripts/migrate-data';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ✅ 🔧 수정된 모델 관계 설정 함수
const setupModelAssociations = () => {
  console.log('🔗 모델 관계 설정 시작...');

  // 1️⃣ User ↔ Role 관계
  User.belongsTo(Role, {
    foreignKey: 'roleId',
    targetKey: 'id',
    as: 'roleInfo',
  });
  Role.hasMany(User, {
    foreignKey: 'roleId',
    sourceKey: 'id',
    as: 'users',
  });

  // 2️⃣ User ↔ Post 관계
  User.hasMany(Post, { 
    foreignKey: 'UserId', 
    as: 'posts',
    onDelete: 'CASCADE' 
  });
  Post.belongsTo(User, { 
    foreignKey: 'UserId', 
    as: 'user',
    onDelete: 'CASCADE' 
  });

  // 3️⃣ Post ↔ Comment 관계
  Post.hasMany(Comment, { 
    foreignKey: 'PostId', 
    as: 'comments',
    onDelete: 'CASCADE' 
  });
  Comment.belongsTo(Post, { 
    foreignKey: 'PostId', 
    as: 'post',
    onDelete: 'CASCADE' 
  });

  // 4️⃣ User ↔ Comment 관계
  User.hasMany(Comment, { 
    foreignKey: 'UserId', 
    as: 'comments',
    onDelete: 'CASCADE' 
  });
  Comment.belongsTo(User, { 
    foreignKey: 'UserId', 
    as: 'user',
    onDelete: 'CASCADE' 
  });

  // 5️⃣ Board ↔ Role 다대다 관계 (BoardAccess 중간 테이블)
  Board.belongsToMany(Role, {
    through: BoardAccess,
    foreignKey: 'boardId',
    otherKey: 'roleId',
    as: 'AccessibleRoles',
  });

  Role.belongsToMany(Board, {
    through: BoardAccess,
    foreignKey: 'roleId',
    otherKey: 'boardId',
    as: 'AccessibleBoards',
  });

  // 6️⃣ BoardAccess ↔ Board, Role 관계
  BoardAccess.belongsTo(Board, {
    foreignKey: 'boardId',
    as: 'board',
  });
  BoardAccess.belongsTo(Role, {
    foreignKey: 'roleId',
    as: 'role',
  });

  Board.hasMany(BoardAccess, {
    foreignKey: 'boardId',
    as: 'accesses',
  });
  Role.hasMany(BoardAccess, {
    foreignKey: 'roleId',
    as: 'accesses',
  });

  // 7️⃣ 🔧 수정된 부분: Post ↔ Board 관계 (CASCADE 추가)
  Post.belongsTo(Board, {
    foreignKey: 'boardType',
    targetKey: 'id',
    as: 'board',
  });
  Board.hasMany(Post, {
    foreignKey: 'boardType',
    sourceKey: 'id',
    as: 'posts',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // 8️⃣ User ↔ Event 관계
  User.hasMany(Event, {
    foreignKey: 'UserId',
    as: 'events',
    onDelete: 'CASCADE'
  });
  Event.belongsTo(User, {
    foreignKey: 'UserId',
    as: 'user',
    onDelete: 'CASCADE'
  });

  // 9️⃣ Role ↔ EventPermission 관계
  Role.hasOne(EventPermission, {
    foreignKey: 'roleId',
    as: 'eventPermission'
  });
  EventPermission.belongsTo(Role, {
    foreignKey: 'roleId',
    as: 'role'
  });

  console.log('✅ 모든 모델 관계 설정 완료');
};

// ✅ 미들웨어 (순서 중요!)
app.use(cors({
  origin: [
    'http://localhost',
    'http://localhost:80',
    'http://127.0.0.1',
    'http://127.0.0.1:80'
  ],
  credentials: true, // ✅ 쿠키 전송 허용
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // ✅ 쿠키 파서 추가
app.use(morgan('dev'));

// ✅ API 라우트 (모두 /api 경로 유지)
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/comments', commentRoutes);

// ✅ 업로드 파일 정적 서빙 (nginx가 프록시할 경로)
app.use(
  '/uploads/images',
  express.static(path.resolve(__dirname, '../uploads/images'))
);
app.use(
  '/uploads/files',
  express.static(path.resolve(__dirname, '../uploads/files'))
);

// ✅ API 헬스체크
app.get('/api/health', (req, res) => {
  res.json({ 
    message: '✅ API 서버 실행 중 (쿠키 기반 인증)',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    cookieParser: true // ✅ 쿠키 파서 설정 확인
  });
});

// ✅ 디버깅 엔드포인트들
app.get('/api/__debug-upload-path', (req, res) => {
  const imagePath = path.resolve(__dirname, '../uploads/images');
  const filePath = path.resolve(__dirname, '../uploads/files');
  res.json({
    paths: {
      images: imagePath,
      files: filePath
    },
    exists: {
      images: require('fs').existsSync(imagePath),
      files: require('fs').existsSync(filePath)
    }
  });
});

app.get('/api/__debug-models', (req, res) => {
  res.json({
    models: {
      User: !!User,
      Role: !!Role,
      Post: !!Post,
      Comment: !!Comment,
      Board: !!Board,
      BoardAccess: !!BoardAccess,
      Event: !!Event,
      EventPermission: !!EventPermission,
    },
    associations: {
      User: Object.keys(User.associations || {}),
      Role: Object.keys(Role.associations || {}),
      Post: Object.keys(Post.associations || {}),
      Comment: Object.keys(Comment.associations || {}),
      Board: Object.keys(Board.associations || {}),
      BoardAccess: Object.keys(BoardAccess.associations || {}),
      Event: Object.keys(Event.associations || {}),
      EventPermission: Object.keys(EventPermission.associations || {}),
    }
  });
});

// ✅ 쿠키 디버깅 엔드포인트 추가
app.get('/api/__debug-cookies', (req, res) => {
  res.json({
    cookies: req.cookies,
    signedCookies: req.signedCookies,
    headers: req.headers.cookie
  });
});

// ✅ DB 연결 및 서버 시작
const startServer = async () => {
  try {
    console.log('🔄 API 서버 초기화 시작...');

    // 1. 데이터베이스 연결 테스트
    console.log('🗄️ 데이터베이스 연결 확인 중...');
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');

    // 2. 모델 관계 설정 (테이블 동기화 전에!)
    setupModelAssociations();

    // 3. 테이블 동기화
    console.log('🔄 테이블 동기화 시작...');
    await sequelize.sync({ 
      alter: process.env.NODE_ENV === 'development',
      force: false
    });
    console.log('✅ 테이블 동기화 완료');

    // 4. 데이터 마이그레이션 실행
    console.log('📊 데이터 마이그레이션 시작...');
    await runMigrationIfNeeded();
    console.log('✅ 데이터 마이그레이션 완료');

    // 5. API 서버 시작
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`🚀 API 서버가 http://127.0.0.1:${PORT}에서 실행 중`);
      console.log('');
      console.log('🔗 nginx 연동 정보:');
      console.log('   📱 클라이언트: nginx(80) → client/dist');
      console.log('   🔌 API 프록시: nginx(80)/api → Express(4000)/api');
      console.log('   📁 업로드 프록시: nginx(80)/uploads → Express(4000)/uploads');
      console.log('');
      console.log('🍪 쿠키 기반 인증 활성화:');
      console.log('   ✅ cookie-parser 설정됨');
      console.log('   ✅ CORS credentials: true');
      console.log('   🔐 HttpOnly 쿠키로 JWT 저장');
      console.log('');
      console.log('📋 API 엔드포인트 (4000포트):');
      console.log(`   ❤️  헬스체크: GET http://127.0.0.1:${PORT}/api/health`);
      console.log(`   🔐 로그인: POST http://127.0.0.1:${PORT}/api/auth/login`);
      console.log(`   🔄 토큰갱신: POST http://127.0.0.1:${PORT}/api/auth/refresh`);
      console.log(`   🚪 로그아웃: POST http://127.0.0.1:${PORT}/api/auth/logout`);
      console.log(`   👤 내정보: GET http://127.0.0.1:${PORT}/api/auth/me`);
      console.log(`   📝 게시판: GET http://127.0.0.1:${PORT}/api/boards`);
      console.log(`   📄 게시글: GET http://127.0.0.1:${PORT}/api/posts`);
      console.log(`   ⚙️  관리자: GET http://127.0.0.1:${PORT}/api/admin/users`);
      console.log(`   📅 이벤트: GET http://127.0.0.1:${PORT}/api/events`);
      console.log(`   📁 업로드: POST http://127.0.0.1:${PORT}/api/uploads`);
      console.log(`   💬 댓글: GET http://127.0.0.1:${PORT}/api/comments`);
      console.log('');
      console.log('🌐 외부 접속 (nginx 통해):');
      console.log('   📱 클라이언트: http://localhost (nginx)');
      console.log('   🔌 API: http://localhost/api/* (nginx → Express)');
      console.log('');
      console.log('⚠️  nginx가 실행되어야 외부 접속 가능합니다!');
    });
  } catch (error) {
    console.error('❌ API 서버 시작 실패:', error);
    if (error instanceof Error) {
      console.error('오류 이름:', error.name);
      console.error('오류 메시지:', error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error('스택 트레이스:', error.stack);
      }
    }
    process.exit(1);
  }
};

// 예외 처리
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception thrown:', error);
  process.exit(1);
});

// 서버 시작
startServer();