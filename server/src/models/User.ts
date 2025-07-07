// src/models/User.ts
import {
  DataTypes,
  Model,
  HasManyGetAssociationsMixin,
  Association,
  BelongsToGetAssociationMixin,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/sequelize';

// 타입 전용 import
import type { PostInstance } from './Post';
import type { RoleInstance } from './Role';

// ✅ User 인터페이스 정의
export interface UserInstance
  extends Model<InferAttributes<UserInstance>, InferCreationAttributes<UserInstance>> {
  id: string;
  password: string;
  name: string;
  roleId: string;
  createdAt: CreationOptional<Date>;
  updatedAt: CreationOptional<Date>;
  
  // 관계 데이터
  roleInfo?: NonAttribute<RoleInstance>;
  posts?: NonAttribute<PostInstance[]>;
}

// ✅ User 클래스 정의
export class User extends Model<InferAttributes<UserInstance>, InferCreationAttributes<UserInstance>> 
  implements UserInstance {
  
  public id!: string;
  public password!: string;
  public name!: string;
  public roleId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // 관계 데이터 (런타임에만 존재)
  public roleInfo?: NonAttribute<RoleInstance>;
  public posts?: NonAttribute<PostInstance[]>;

  // 관계 메서드 정의
  public getPosts!: HasManyGetAssociationsMixin<PostInstance>;
  public getRoleInfo!: BelongsToGetAssociationMixin<RoleInstance>;

  // Association 정의
  public static associations: {
    posts: Association<User, PostInstance>;
    roleInfo: Association<User, RoleInstance>;
  };
}

// 모델 초기화
User.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    roleId: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'role', // 실제 DB 컬럼명은 'role'
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
    tableName: 'users',
    modelName: 'User',
  }
);

// 🚨 관계 정의는 models/index.ts에서만!