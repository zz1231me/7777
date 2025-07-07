"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const post_controller_1 = require("../controllers/post.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const boardAccess_middleware_1 = require("../middlewares/boardAccess.middleware");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
/**
 * ✅ 완전 랜덤 파일명 생성 (12자리 hex + 확장자)
 */
const generateRandomFilename = (originalName) => {
    const ext = path_1.default.extname(originalName).toLowerCase();
    const randomName = crypto_1.default.randomBytes(6).toString('hex'); // 12자리
    return `${randomName}${ext}`;
};
/**
 * ✅ 깔끔한 다중 파일 업로드 설정
 */
const uploadDir = path_1.default.join(__dirname, '../../uploads/files');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
        try {
            const randomFilename = generateRandomFilename(file.originalname);
            console.log(`📁 파일 저장: ${file.originalname} → ${randomFilename}`);
            cb(null, randomFilename);
        }
        catch (error) {
            console.error('파일명 생성 오류:', error);
            // 오류 시 기본 랜덤 이름
            const fallbackName = `${crypto_1.default.randomBytes(6).toString('hex')}.bin`;
            cb(null, fallbackName);
        }
    },
});
// 파일 필터링 (허용된 확장자만)
const fileFilter = (req, file, cb) => {
    const allowedExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', // 이미지
        '.pdf', '.doc', '.docx', '.txt', '.hwp', '.ppt', '.pptx', '.xls', '.xlsx', // 문서
        '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', // 압축파일
        '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', // 동영상
        '.mp3', '.wav', '.flac', '.aac', '.ogg' // 오디오
    ];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error(`허용되지 않는 파일 형식입니다. 허용 형식: ${allowedExtensions.join(', ')}`));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB 제한
        files: 3 // 최대 3개 파일
    }
});
/**
 * ✅ 게시글 목록 조회 (게시판별) - 페이지네이션 및 검색 지원
 */
router.get('/:boardType', auth_middleware_1.authenticate, (0, boardAccess_middleware_1.checkBoardAccess)('read'), (0, express_async_handler_1.default)((req, res) => (0, post_controller_1.getPosts)(req, res)));
/**
 * ✅ 게시글 단건 조회 - 읽기 권한 필요
 */
router.get('/:boardType/:id', auth_middleware_1.authenticate, (0, boardAccess_middleware_1.checkBoardAccess)('read'), (0, express_async_handler_1.default)((req, res) => (0, post_controller_1.getPostById)(req, res)));
/**
 * ✅ 게시글 생성 - 깔끔한 다중 파일 업로드 지원
 */
router.post('/:boardType', auth_middleware_1.authenticate, (0, boardAccess_middleware_1.checkBoardAccess)('write'), upload.array('files', 3), // 다중 파일 업로드 (최대 3개)
(0, express_async_handler_1.default)((req, res) => (0, post_controller_1.createPost)(req, res)));
/**
 * ✅ 게시글 수정 - 깔끔한 다중 파일 업로드 지원
 */
router.put('/:boardType/:id', auth_middleware_1.authenticate, (0, boardAccess_middleware_1.checkBoardAccess)('write'), upload.array('files', 3), // 다중 파일 업로드 (최대 3개)
(0, express_async_handler_1.default)((req, res) => (0, post_controller_1.updatePost)(req, res)));
/**
 * ✅ 게시글 삭제 - 삭제 권한 필요
 */
router.delete('/:boardType/:id', auth_middleware_1.authenticate, (0, boardAccess_middleware_1.checkBoardAccess)('delete'), (0, express_async_handler_1.default)((req, res) => (0, post_controller_1.deletePost)(req, res)));
exports.default = router;
