// server/src/models/EventPermission.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/sequelize';

export class EventPermission extends Model {
  public roleId!: string;
  public canCreate!: boolean;
  public canRead!: boolean;
  public canUpdate!: boolean; // 다른 사람 이벤트 수정 권한
  public canDelete!: boolean; // 다른 사람 이벤트 삭제 권한
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // 관계 데이터
  public role?: any;
}

EventPermission.init(
  {
    roleId: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    canCreate: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '이벤트 생성 권한'
    },
    canRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '이벤트 조회 권한'
    },
    canUpdate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '다른 사람 이벤트 수정 권한 (본인 이벤트는 항상 수정 가능)'
    },
    canDelete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '다른 사람 이벤트 삭제 권한 (본인 이벤트는 항상 삭제 가능)'
    },
  },
  {
    sequelize,
    modelName: 'EventPermission',
    tableName: 'event_permissions',
    timestamps: true,
  }
);

export default EventPermission;