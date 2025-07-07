"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference path="./types/express/index.d.ts" />
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser")); // ✅ 추가
// ✅ 라우트 import
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const post_routes_1 = __importDefault(require("./routes/post.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const event_routes_1 = __importDefault(require("./routes/event.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const board_routes_1 = __importDefault(require("./routes/board.routes"));
const comment_routes_1 = __importDefault(require("./routes/comment.routes"));
// ✅ 데이터베이스 설정
const sequelize_1 = require("./config/sequelize");
// ✅ 모든 모델 import (관계 설정을 위해 필요!)
const User_1 = require("./models/User");
const Role_1 = require("./models/Role");
const Post_1 = require("./models/Post");
const Comment_1 = require("./models/Comment");
const Board_1 = __importDefault(require("./models/Board"));
const BoardAccess_1 = __importDefault(require("./models/BoardAccess"));
const Event_1 = __importDefault(require("./models/Event"));
const EventPermission_1 = __importDefault(require("./models/EventPermission"));
// ✅ 데이터 마이그레이션 함수
const migrate_data_1 = require("./scripts/migrate-data");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 4000;
// ✅ 🔧 수정된 모델 관계 설정 함수
const setupModelAssociations = () => {
    console.log('🔗 모델 관계 설정 시작...');
    // 1️⃣ User ↔ Role 관계
    User_1.User.belongsTo(Role_1.Role, {
        foreignKey: 'roleId',
        targetKey: 'id',
        as: 'roleInfo',
    });
    Role_1.Role.hasMany(User_1.User, {
        foreignKey: 'roleId',
        sourceKey: 'id',
        as: 'users',
    });
    // 2️⃣ User ↔ Post 관계
    User_1.User.hasMany(Post_1.Post, {
        foreignKey: 'UserId',
        as: 'posts',
        onDelete: 'CASCADE'
    });
    Post_1.Post.belongsTo(User_1.User, {
        foreignKey: 'UserId',
        as: 'user',
        onDelete: 'CASCADE'
    });
    // 3️⃣ Post ↔ Comment 관계
    Post_1.Post.hasMany(Comment_1.Comment, {
        foreignKey: 'PostId',
        as: 'comments',
        onDelete: 'CASCADE'
    });
    Comment_1.Comment.belongsTo(Post_1.Post, {
        foreignKey: 'PostId',
        as: 'post',
        onDelete: 'CASCADE'
    });
    // 4️⃣ User ↔ Comment 관계
    User_1.User.hasMany(Comment_1.Comment, {
        foreignKey: 'UserId',
        as: 'comments',
        onDelete: 'CASCADE'
    });
    Comment_1.Comment.belongsTo(User_1.User, {
        foreignKey: 'UserId',
        as: 'user',
        onDelete: 'CASCADE'
    });
    // 5️⃣ Board ↔ Role 다대다 관계 (BoardAccess 중간 테이블)
    Board_1.default.belongsToMany(Role_1.Role, {
        through: BoardAccess_1.default,
        foreignKey: 'boardId',
        otherKey: 'roleId',
        as: 'AccessibleRoles',
    });
    Role_1.Role.belongsToMany(Board_1.default, {
        through: BoardAccess_1.default,
        foreignKey: 'roleId',
        otherKey: 'boardId',
        as: 'AccessibleBoards',
    });
    // 6️⃣ BoardAccess ↔ Board, Role 관계
    BoardAccess_1.default.belongsTo(Board_1.default, {
        foreignKey: 'boardId',
        as: 'board',
    });
    BoardAccess_1.default.belongsTo(Role_1.Role, {
        foreignKey: 'roleId',
        as: 'role',
    });
    Board_1.default.hasMany(BoardAccess_1.default, {
        foreignKey: 'boardId',
        as: 'accesses',
    });
    Role_1.Role.hasMany(BoardAccess_1.default, {
        foreignKey: 'roleId',
        as: 'accesses',
    });
    // 7️⃣ 🔧 수정된 부분: Post ↔ Board 관계 (CASCADE 추가)
    Post_1.Post.belongsTo(Board_1.default, {
        foreignKey: 'boardType',
        targetKey: 'id',
        as: 'board',
    });
    Board_1.default.hasMany(Post_1.Post, {
        foreignKey: 'boardType',
        sourceKey: 'id',
        as: 'posts',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // 8️⃣ User ↔ Event 관계
    User_1.User.hasMany(Event_1.default, {
        foreignKey: 'UserId',
        as: 'events',
        onDelete: 'CASCADE'
    });
    Event_1.default.belongsTo(User_1.User, {
        foreignKey: 'UserId',
        as: 'user',
        onDelete: 'CASCADE'
    });
    // 9️⃣ Role ↔ EventPermission 관계
    Role_1.Role.hasOne(EventPermission_1.default, {
        foreignKey: 'roleId',
        as: 'eventPermission'
    });
    EventPermission_1.default.belongsTo(Role_1.Role, {
        foreignKey: 'roleId',
        as: 'role'
    });
    console.log('✅ 모든 모델 관계 설정 완료');
};
// ✅ 미들웨어 (순서 중요!)
app.use((0, cors_1.default)({
    origin: [
        'http://localhost',
        'http://localhost:80',
        'http://127.0.0.1',
        'http://127.0.0.1:80'
    ],
    credentials: true, // ✅ 쿠키 전송 허용
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)()); // ✅ 쿠키 파서 추가
app.use((0, morgan_1.default)('dev'));
// ✅ API 라우트 (모두 /api 경로 유지)
app.use('/api/auth', auth_routes_1.default);
app.use('/api/posts', post_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/events', event_routes_1.default);
app.use('/api/uploads', upload_routes_1.default);
app.use('/api/boards', board_routes_1.default);
app.use('/api/comments', comment_routes_1.default);
// ✅ 업로드 파일 정적 서빙 (nginx가 프록시할 경로)
app.use('/uploads/images', express_1.default.static(path_1.default.resolve(__dirname, '../uploads/images')));
app.use('/uploads/files', express_1.default.static(path_1.default.resolve(__dirname, '../uploads/files')));
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
    const imagePath = path_1.default.resolve(__dirname, '../uploads/images');
    const filePath = path_1.default.resolve(__dirname, '../uploads/files');
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
            User: !!User_1.User,
            Role: !!Role_1.Role,
            Post: !!Post_1.Post,
            Comment: !!Comment_1.Comment,
            Board: !!Board_1.default,
            BoardAccess: !!BoardAccess_1.default,
            Event: !!Event_1.default,
            EventPermission: !!EventPermission_1.default,
        },
        associations: {
            User: Object.keys(User_1.User.associations || {}),
            Role: Object.keys(Role_1.Role.associations || {}),
            Post: Object.keys(Post_1.Post.associations || {}),
            Comment: Object.keys(Comment_1.Comment.associations || {}),
            Board: Object.keys(Board_1.default.associations || {}),
            BoardAccess: Object.keys(BoardAccess_1.default.associations || {}),
            Event: Object.keys(Event_1.default.associations || {}),
            EventPermission: Object.keys(EventPermission_1.default.associations || {}),
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
        await sequelize_1.sequelize.authenticate();
        console.log('✅ 데이터베이스 연결 성공');
        // 2. 모델 관계 설정 (테이블 동기화 전에!)
        setupModelAssociations();
        // 3. 테이블 동기화
        console.log('🔄 테이블 동기화 시작...');
        await sequelize_1.sequelize.sync({
            alter: process.env.NODE_ENV === 'development',
            force: false
        });
        console.log('✅ 테이블 동기화 완료');
        // 4. 데이터 마이그레이션 실행
        console.log('📊 데이터 마이그레이션 시작...');
        await (0, migrate_data_1.runMigrationIfNeeded)();
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
    }
    catch (error) {
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
