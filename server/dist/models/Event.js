"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
// ✅ Event 클래스 정의
class Event extends sequelize_1.Model {
}
exports.Event = Event;
// 모델 초기화
Event.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    calendarId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    body: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    isAllday: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    },
    start: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false
    },
    end: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false
    },
    category: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    location: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    attendees: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true
    },
    state: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    isReadOnly: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    },
    color: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    backgroundColor: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    dragBackgroundColor: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    borderColor: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    customStyle: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true
    },
    UserId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'Event',
    tableName: 'Events',
    timestamps: true,
});
exports.default = Event;
