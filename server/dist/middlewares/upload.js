"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// 업로드 디렉토리 확인 및 생성
const uploadDir = path_1.default.join(__dirname, '../../uploads/files');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// multer 설정
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path_1.default.extname(file.originalname);
        const base = path_1.default.basename(file.originalname, ext);
        cb(null, `${base}-${Date.now()}${ext}`);
    },
});
const upload = (0, multer_1.default)({ storage });
exports.default = upload;
