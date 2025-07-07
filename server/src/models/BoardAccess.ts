// server/src/models/BoardAccess.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/sequelize';

export class BoardAccess extends Model {
  public boardId!: string;
  public roleId!: string;
  public canRead!: boolean;
  public canWrite!: boolean;
  public canDelete!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BoardAccess.init(
  {
    boardId: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    canRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    canWrite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    canDelete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'BoardAccess',
    tableName: 'board_accesses',
    timestamps: true,
  }
);

// 🚨 관계 정의 제거 - models/index.ts에서만!

export default BoardAccess;