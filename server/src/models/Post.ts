// src/models/Post.ts
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
import { generateRandomId } from '../utils/generateId';

// 타입 전용 import
import type { UserInstance } from './User';
import type { Board } from './Board';

// ✅ PostInstance 타입 정의 - 다중 파일 지원
export interface PostInstance
  extends Model<InferAttributes<PostInstance>, InferCreationAttributes<PostInstance>> {
  id: CreationOptional<string>;
  title: string;
  content: string;
  author: string;
  attachments?: string | null; // JSON 문자열로 파일명 배열 저장
  boardType: string;
  UserId: ForeignKey<string>;
  createdAt: CreationOptional<Date>;
  updatedAt: CreationOptional<Date>;

  // 관계 데이터
  user?: NonAttribute<UserInstance>;
  board?: NonAttribute<Board>;
}

// ✅ Post 모델을 class 방식으로 통일 - 다중 파일 지원
export class Post extends Model<InferAttributes<PostInstance>, InferCreationAttributes<PostInstance>> 
  implements PostInstance {
  
  public id!: CreationOptional<string>;
  public title!: string;
  public content!: string;
  public author!: string;
  public attachments?: string | null; // 다중 파일 지원
  public boardType!: string;
  public UserId!: ForeignKey<string>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // 관계 데이터
  public user?: NonAttribute<UserInstance>;
  public board?: NonAttribute<Board>;
}

// 모델 초기화
Post.init(
  {
    id: {
      type: DataTypes.STRING(8),
      primaryKey: true,
      allowNull: false,
      defaultValue: () => generateRandomId(8),
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    attachments: { // attachment → attachments로 변경
      type: DataTypes.TEXT, // JSON 문자열 저장을 위해 TEXT 타입 사용
      allowNull: true,
    },
    boardType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'general',
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
    timestamps: true,
    tableName: 'Posts',
    modelName: 'Post',
  }
);

// 🚨 관계 정의 제거 - models/index.ts에서만!