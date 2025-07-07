import { Response } from 'express';
import { Op } from 'sequelize';
import Event from '../models/Event';
import { User } from '../models/User';
import EventPermission from '../models/EventPermission';
import { AuthRequest } from '../types/auth-request';

// ✅ 이벤트 생성 - 작성자 정보 추가
export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: '로그인이 필요합니다.' });
    return;
  }

  try {
    // ✅ 작성자 정보와 함께 이벤트 생성
    const eventData = {
      ...req.body,
      UserId: userId, // 작성자 ID 추가
    };

    const event = await Event.create(eventData);

    // ✅ 생성된 이벤트와 작성자 정보 함께 조회
    const eventWithUser = await Event.findByPk(event.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      }]
    });

    res.status(201).json(eventWithUser);
  } catch (err) {
    console.error('❌ createEvent error:', err);
    res.status(500).json({ message: 'Failed to create event', error: err });
  }
};

// ✅ 이벤트 조회 - 작성자 정보 포함
export const getEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  const { start, end } = req.query;

  try {
    const whereClause = start && end
      ? {
          start: { [Op.lte]: end },
          end: { [Op.gte]: start },
        }
      : {};

    const events = await Event.findAll({ 
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      }],
      order: [['start', 'ASC']]
    });

    res.json(events);
  } catch (err) {
    console.error('❌ getEvents error:', err);
    res.status(500).json({ message: 'Failed to fetch events', error: err });
  }
};

// ✅ 이벤트 수정 - 권한 체크 개선
export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ message: '로그인이 필요합니다.' });
    return;
  }

  try {
    // 기존 이벤트 조회
    const existingEvent = await Event.findByPk(id);

    if (!existingEvent) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // ✅ 수정된 권한 체크 로직
    const isOwner = existingEvent.UserId === userId;
    
    // 본인 이벤트가 아닌 경우, EventPermission의 canUpdate 권한 체크
    if (!isOwner) {
      const eventPermission = await EventPermission.findOne({
        where: { roleId: userRole }
      });

      const canUpdateOthers = eventPermission?.canUpdate || false;
      
      if (!canUpdateOthers) {
        console.log(`❌ 타인 이벤트 수정 권한 없음: 사용자="${userId}", 역할="${userRole}"`);
        res.status(403).json({ message: '다른 사용자의 일정을 수정할 권한이 없습니다.' });
        return;
      }
      
      console.log(`✅ 타인 이벤트 수정 권한 확인됨: 사용자="${userId}", 역할="${userRole}"`);
    } else {
      console.log(`✅ 본인 이벤트 수정: 사용자="${userId}"`);
    }

    // 이벤트 수정
    const [updated] = await Event.update(req.body, { where: { id } });

    if (updated === 0) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // 수정된 이벤트와 작성자 정보 함께 조회
    const updatedEvent = await Event.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      }]
    });

    res.json(updatedEvent);
  } catch (err) {
    console.error('❌ updateEvent error:', err);
    res.status(500).json({ message: 'Failed to update event', error: err });
  }
};

// ✅ 이벤트 삭제 - 권한 체크 개선
export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ message: '로그인이 필요합니다.' });
    return;
  }

  try {
    // 기존 이벤트 조회
    const existingEvent = await Event.findByPk(id);

    if (!existingEvent) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // ✅ 수정된 권한 체크 로직
    const isOwner = existingEvent.UserId === userId;
    
    // 본인 이벤트가 아닌 경우, EventPermission의 canDelete 권한 체크
    if (!isOwner) {
      const eventPermission = await EventPermission.findOne({
        where: { roleId: userRole }
      });

      const canDeleteOthers = eventPermission?.canDelete || false;
      
      if (!canDeleteOthers) {
        console.log(`❌ 타인 이벤트 삭제 권한 없음: 사용자="${userId}", 역할="${userRole}"`);
        res.status(403).json({ message: '다른 사용자의 일정을 삭제할 권한이 없습니다.' });
        return;
      }
      
      console.log(`✅ 타인 이벤트 삭제 권한 확인됨: 사용자="${userId}", 역할="${userRole}"`);
    } else {
      console.log(`✅ 본인 이벤트 삭제: 사용자="${userId}"`);
    }

    // 이벤트 삭제
    const deleted = await Event.destroy({ where: { id } });

    if (deleted === 0) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    res.status(200).json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('❌ deleteEvent error:', err);
    res.status(500).json({ message: 'Failed to delete event', error: err });
  }
};