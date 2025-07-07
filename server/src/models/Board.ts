// server/src/models/Board.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/sequelize';

export class Board extends Model {
  public id!: string;
  public name!: string;
  public description?: string;
  public isActive!: boolean;
  public order!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Board.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Board',
    tableName: 'boards',
    timestamps: true,
  }
);

export default Board;