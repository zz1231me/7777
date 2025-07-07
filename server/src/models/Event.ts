import { 
  DataTypes, 
  Model, 
  InferAttributes, 
  InferCreationAttributes, 
  CreationOptional, 
  ForeignKey,
  NonAttribute 
} from 'sequelize';
import { sequelize } from '../config/sequelize';

// 타입 전용 import
import type { UserInstance } from './User';

// ✅ EventInstance 타입 정의
export interface EventInstance
  extends Model<InferAttributes<EventInstance>, InferCreationAttributes<EventInstance>> {
  id: CreationOptional<number>;
  calendarId: string;
  title: string;
  body?: string;
  isAllday: boolean;
  start: Date;
  end: Date;
  category?: string;
  location?: string;
  attendees?: any;
  state?: string;
  isReadOnly: boolean;
  color?: string;
  backgroundColor?: string;
  dragBackgroundColor?: string;
  borderColor?: string;
  customStyle?: any;
  UserId: ForeignKey<string>; // ✅ 작성자 필드 추가
  createdAt: CreationOptional<Date>;
  updatedAt: CreationOptional<Date>;

  // 관계 데이터
  user?: NonAttribute<UserInstance>;
}

// ✅ Event 클래스 정의
export class Event extends Model<InferAttributes<EventInstance>, InferCreationAttributes<EventInstance>> 
  implements EventInstance {
  
  public id!: CreationOptional<number>;
  public calendarId!: string;
  public title!: string;
  public body?: string;
  public isAllday!: boolean;
  public start!: Date;
  public end!: Date;
  public category?: string;
  public location?: string;
  public attendees?: any;
  public state?: string;
  public isReadOnly!: boolean;
  public color?: string;
  public backgroundColor?: string;
  public dragBackgroundColor?: string;
  public borderColor?: string;
  public customStyle?: any;
  public UserId!: ForeignKey<string>; // ✅ 작성자 필드
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // 관계 데이터
  public user?: NonAttribute<UserInstance>;
}

// 모델 초기화
Event.init(
  {
    id: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
    },
    calendarId: { 
      type: DataTypes.STRING,
      allowNull: false 
    },
    title: { 
      type: DataTypes.STRING,
      allowNull: false 
    },
    body: { 
      type: DataTypes.TEXT,
      allowNull: true 
    },
    isAllday: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false 
    },
    start: { 
      type: DataTypes.DATE,
      allowNull: false 
    },
    end: { 
      type: DataTypes.DATE,
      allowNull: false 
    },
    category: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    location: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    attendees: { 
      type: DataTypes.JSON,
      allowNull: true 
    },
    state: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    isReadOnly: { 
      type: DataTypes.BOOLEAN,
      defaultValue: false 
    },
    color: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    backgroundColor: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    dragBackgroundColor: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    borderColor: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    customStyle: { 
      type: DataTypes.JSON,
      allowNull: true 
    },
    UserId: { // ✅ 작성자 필드 추가
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
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
    modelName: 'Event',
    tableName: 'Events',
    timestamps: true,
  }
);

export default Event;