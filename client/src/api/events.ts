import api from '../api/axios';

// 🆕 관리자용 이벤트 API 함수들 추가

export const createEvent = (event: any) => {
  return api.post('/events', event);
};

export const getEvents = (start: Date, end: Date) => {
  return api.get('/events', {
    params: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  }).then(res => res.data);
};

export const updateEvent = (id: number | string, event: any) => {
  return api.put(`/events/${id}`, event);
};

export const deleteEvent = (id: number | string) => {
  return api.delete(`/events/${id}`);
};

// 🆕 관리자용 이벤트 관리 API
export const getAllEventsForAdmin = () => {
  return api.get('/admin/events').then(res => res.data);
};

export const updateEventAsAdmin = (id: number | string, event: any) => {
  return api.put(`/admin/events/${id}`, event);
};

export const deleteEventAsAdmin = (id: number | string) => {
  return api.delete(`/admin/events/${id}`);
};

// 🆕 이벤트 권한 관리 API
export const getEventPermissions = () => {
  return api.get('/admin/events/permissions').then(res => res.data);
};

export const setEventPermissions = (permissions: any[]) => {
  return api.put('/admin/events/permissions', { permissions });
};