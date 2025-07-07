// src/models/index.ts

import { User } from './User';
import { Post } from './Post';
import { Comment } from './Comment';
import Board from './Board';
import { Role } from './Role';
import BoardAccess from './BoardAccess';
import Event from './Event';
import EventPermission from './EventPermission';

// ✅ 기존 관계
User.hasMany(Post, { foreignKey: 'UserId' });
Post.belongsTo(User, { foreignKey: 'UserId' });

Post.hasMany(Comment, { foreignKey: 'PostId' });
Comment.belongsTo(Post, { foreignKey: 'PostId' });

User.hasMany(Comment, { foreignKey: 'UserId' });
Comment.belongsTo(User, { foreignKey: 'UserId' });

// ✅ User ↔ Role 관계 (충돌 방지: foreignKey → 'roleId', alias → 'roleInfo')
User.belongsTo(Role, {
  foreignKey: 'roleId',      // 🔁 DB 컬럼명은 'role'이지만 모델에서는 'roleId'
  targetKey: 'id',
  as: 'roleInfo',            // 🔁 association 명은 'roleInfo'
  constraints: false,
});
Role.hasMany(User, {
  foreignKey: 'roleId',
  sourceKey: 'id',
  as: 'users',               // 선택적: 역방향 참조
  constraints: false,
});

// ✅ Board ↔ Role 다대다 관계 (BoardAccess 통해 연결)
Board.belongsToMany(Role, {
  through: BoardAccess,
  foreignKey: 'boardId',
  otherKey: 'roleId',
  as: 'AccessibleRoles',
  constraints: false,
});

Role.belongsToMany(Board, {
  through: BoardAccess,
  foreignKey: 'roleId',
  otherKey: 'boardId',
  as: 'AccessibleBoards',
  constraints: false,
});

// ✅ BoardAccess ↔ Board, Role 관계
BoardAccess.belongsTo(Board, {
  foreignKey: 'boardId',
  as: 'board',
  constraints: false,
});
BoardAccess.belongsTo(Role, {
  foreignKey: 'roleId',
  as: 'role',
  constraints: false,
});

Board.hasMany(BoardAccess, {
  foreignKey: 'boardId',
  as: 'accesses',
  constraints: false,
});
Role.hasMany(BoardAccess, {
  foreignKey: 'roleId',
  as: 'accesses',
  constraints: false,
});

// ✅ Post ↔ Board 관계
Post.belongsTo(Board, {
  foreignKey: 'boardType',
  targetKey: 'id',
  as: 'board',
  constraints: false,
});
Board.hasMany(Post, {
  foreignKey: 'boardType',
  sourceKey: 'id',
  as: 'posts',
  constraints: false,
});

// ✅ User ↔ Event 관계
User.hasMany(Event, {
  foreignKey: 'UserId',
  as: 'events',
  constraints: false,
});
Event.belongsTo(User, {
  foreignKey: 'UserId',
  as: 'user',
  constraints: false,
});

// 🆕 Role ↔ EventPermission 관계
Role.hasOne(EventPermission, {
  foreignKey: 'roleId',
  as: 'eventPermission',
  constraints: false,
});
EventPermission.belongsTo(Role, {
  foreignKey: 'roleId',
  as: 'role',
  constraints: false,
});

export {
  User,
  Post,
  Comment,
  Board,
  Role,
  BoardAccess,
  Event,
  EventPermission,
};