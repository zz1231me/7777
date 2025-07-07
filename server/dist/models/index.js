"use strict";
// src/models/index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPermission = exports.Event = exports.BoardAccess = exports.Role = exports.Board = exports.Comment = exports.Post = exports.User = void 0;
const User_1 = require("./User");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return User_1.User; } });
const Post_1 = require("./Post");
Object.defineProperty(exports, "Post", { enumerable: true, get: function () { return Post_1.Post; } });
const Comment_1 = require("./Comment");
Object.defineProperty(exports, "Comment", { enumerable: true, get: function () { return Comment_1.Comment; } });
const Board_1 = __importDefault(require("./Board"));
exports.Board = Board_1.default;
const Role_1 = require("./Role");
Object.defineProperty(exports, "Role", { enumerable: true, get: function () { return Role_1.Role; } });
const BoardAccess_1 = __importDefault(require("./BoardAccess"));
exports.BoardAccess = BoardAccess_1.default;
const Event_1 = __importDefault(require("./Event"));
exports.Event = Event_1.default;
const EventPermission_1 = __importDefault(require("./EventPermission"));
exports.EventPermission = EventPermission_1.default;
// ✅ 기존 관계
User_1.User.hasMany(Post_1.Post, { foreignKey: 'UserId' });
Post_1.Post.belongsTo(User_1.User, { foreignKey: 'UserId' });
Post_1.Post.hasMany(Comment_1.Comment, { foreignKey: 'PostId' });
Comment_1.Comment.belongsTo(Post_1.Post, { foreignKey: 'PostId' });
User_1.User.hasMany(Comment_1.Comment, { foreignKey: 'UserId' });
Comment_1.Comment.belongsTo(User_1.User, { foreignKey: 'UserId' });
// ✅ User ↔ Role 관계 (충돌 방지: foreignKey → 'roleId', alias → 'roleInfo')
User_1.User.belongsTo(Role_1.Role, {
    foreignKey: 'roleId', // 🔁 DB 컬럼명은 'role'이지만 모델에서는 'roleId'
    targetKey: 'id',
    as: 'roleInfo', // 🔁 association 명은 'roleInfo'
    constraints: false,
});
Role_1.Role.hasMany(User_1.User, {
    foreignKey: 'roleId',
    sourceKey: 'id',
    as: 'users', // 선택적: 역방향 참조
    constraints: false,
});
// ✅ Board ↔ Role 다대다 관계 (BoardAccess 통해 연결)
Board_1.default.belongsToMany(Role_1.Role, {
    through: BoardAccess_1.default,
    foreignKey: 'boardId',
    otherKey: 'roleId',
    as: 'AccessibleRoles',
    constraints: false,
});
Role_1.Role.belongsToMany(Board_1.default, {
    through: BoardAccess_1.default,
    foreignKey: 'roleId',
    otherKey: 'boardId',
    as: 'AccessibleBoards',
    constraints: false,
});
// ✅ BoardAccess ↔ Board, Role 관계
BoardAccess_1.default.belongsTo(Board_1.default, {
    foreignKey: 'boardId',
    as: 'board',
    constraints: false,
});
BoardAccess_1.default.belongsTo(Role_1.Role, {
    foreignKey: 'roleId',
    as: 'role',
    constraints: false,
});
Board_1.default.hasMany(BoardAccess_1.default, {
    foreignKey: 'boardId',
    as: 'accesses',
    constraints: false,
});
Role_1.Role.hasMany(BoardAccess_1.default, {
    foreignKey: 'roleId',
    as: 'accesses',
    constraints: false,
});
// ✅ Post ↔ Board 관계
Post_1.Post.belongsTo(Board_1.default, {
    foreignKey: 'boardType',
    targetKey: 'id',
    as: 'board',
    constraints: false,
});
Board_1.default.hasMany(Post_1.Post, {
    foreignKey: 'boardType',
    sourceKey: 'id',
    as: 'posts',
    constraints: false,
});
// ✅ User ↔ Event 관계
User_1.User.hasMany(Event_1.default, {
    foreignKey: 'UserId',
    as: 'events',
    constraints: false,
});
Event_1.default.belongsTo(User_1.User, {
    foreignKey: 'UserId',
    as: 'user',
    constraints: false,
});
// 🆕 Role ↔ EventPermission 관계
Role_1.Role.hasOne(EventPermission_1.default, {
    foreignKey: 'roleId',
    as: 'eventPermission',
    constraints: false,
});
EventPermission_1.default.belongsTo(Role_1.Role, {
    foreignKey: 'roleId',
    as: 'role',
    constraints: false,
});
