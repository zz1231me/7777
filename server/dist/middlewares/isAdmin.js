"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = void 0;
const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: '관리자만 접근할 수 있습니다.' });
    }
    next();
};
exports.isAdmin = isAdmin;
