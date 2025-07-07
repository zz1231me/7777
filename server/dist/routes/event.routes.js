"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const event_controller_1 = require("../controllers/event.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const eventPermission_middleware_1 = require("../middlewares/eventPermission.middleware");
const router = express_1.default.Router();
// ✅ EventPermission 기반 권한 체크 사용
router.post('/', auth_middleware_1.authenticate, (0, eventPermission_middleware_1.checkEventPermission)('create'), event_controller_1.createEvent);
router.get('/', auth_middleware_1.authenticate, (0, eventPermission_middleware_1.checkEventPermission)('read'), event_controller_1.getEvents);
router.put('/:id', auth_middleware_1.authenticate, (0, eventPermission_middleware_1.checkEventPermission)('update'), event_controller_1.updateEvent);
router.delete('/:id', auth_middleware_1.authenticate, (0, eventPermission_middleware_1.checkEventPermission)('delete'), event_controller_1.deleteEvent);
exports.default = router;
