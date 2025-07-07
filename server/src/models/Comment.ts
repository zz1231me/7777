// src/models/Comment.ts
import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/sequelize';

// 타입 전용 import
import type { PostInstance } from './Post';
import type { UserInstance } from './User';

// ✅ CommentInstance 타입 정의
export interface CommentInstance
  extends Model<InferAttributes<CommentInstance>, InferCreationAttributes<CommentInstance>> {
  id: CreationOptional<number>;
  content: string;
  PostId: ForeignKey<string>;
  UserId: ForeignKey<string>;
  createdAt: CreationOptional<Date>;
  updatedAt: CreationOptional<Date>;

  // 관계 데이터
  post?: NonAttribute<PostInstance>;
  user?: NonAttribute<UserInstance>;
}

// ✅ Comment 클래스 정의
export class Comment extends Model<InferAttributes<CommentInstance>, InferCreationAttributes<CommentInstance>> 
  implements CommentInstance {
  
  public id!: CreationOptional<number>;
  public content!: string;
  public PostId!: ForeignKey<string>;
  public UserId!: ForeignKey<string>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // 관계 데이터
  public post?: NonAttribute<PostInstance>;
  public user?: NonAttribute<UserInstance>;
}

// 모델 초기화
Comment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    PostId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    UserId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Comment',
    tableName: 'comments',
    timestamps: true,
  }
);

// 🚨 관계 정의 제거 - models/index.ts에서만!