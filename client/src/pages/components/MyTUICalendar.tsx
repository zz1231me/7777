import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Calendar from '@toast-ui/calendar';
import '@toast-ui/calendar/dist/toastui-calendar.min.css';
// ✅ 공식 문서: useFormPopup 사용 시 필수 CSS imports
import 'tui-date-picker/dist/tui-date-picker.css';
import 'tui-time-picker/dist/tui-time-picker.css';
import { createEvent, getEvents, updateEvent, deleteEvent } from '../../api/events';

// ✅ 공식 API 문서 기반 정확한 타입 정의
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  body?: string;
  calendarId: string;
  category: 'allday' | 'time';
  isAllday: boolean;
  isReadOnly: boolean;
}

interface ToastNotification {
  type: 'success' | 'error' | 'info';
  message: string;
  visible: boolean;
}

interface ApiEventData {
  id: string;
  title?: string;
  start: string | Date;
  end: string | Date;
  location?: string;
  body?: string;
  calendarId: string;
  isReadOnly?: boolean;
}

// ✅ 카테고리 라벨 매핑
const CATEGORY_LABELS: Record<string, string> = {
  'annual_leave': '연차',
  'morning_half': '오전반차',
  'afternoon_half': '오후반차',
  'meeting': '회의',
  'dinner': '회식',
  'etc': '기타'
};

function MonthlyCalendar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<Calendar | null>(null);
  const eventsCache = useRef<Map<string, CalendarEvent[]>>(new Map());
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);
  const currentViewDate = useRef(new Date());
  
  const [currentDate, setCurrentDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastNotification>({ type: 'info', message: '', visible: false });
  const [showControls, setShowControls] = useState(false); // ✅ 팝업 제어 상태
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null); // ✅ 자동 숨김 타이머

  // ✅ 토스트 알림 시스템 (빠른 사라짐)
  const showToast = useCallback((type: ToastNotification['type'], message: string) => {
    setToast({ type, message, visible: true });
    
    const duration = type === 'success' ? 1500 : type === 'error' ? 2000 : 2000;
    
    const timer = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  // ✅ 제목에 카테고리 라벨 추가 함수
  const addCategoryToTitle = useCallback((title: string, calendarId: string): string => {
    const categoryLabel = CATEGORY_LABELS[calendarId];
    if (!categoryLabel) return title;
    
    // 이미 카테고리가 포함되어 있으면 추가하지 않음
    if (title.startsWith(`[${categoryLabel}]`)) {
      return title;
    }
    
    return `[${categoryLabel}]${title}`;
  }, []);

  // ✅ 공식 문서 기반 정확한 Calendar 옵션 (수정된 카테고리 포함)
  const calendarOptions = useMemo(() => ({
    // 기본 뷰 설정
    defaultView: 'month',
    isReadOnly: false,
    usageStatistics: false,
    useFormPopup: true,
    useDetailPopup: true,
    
    // 타임존 설정 (공식 문서 기준)
    timezone: {
      zones: [
        {
          timezoneName: 'Asia/Seoul',
          displayLabel: 'Seoul',
          tooltip: 'Korea Standard Time',
        },
      ],
    },
    
    // ✅ 월 뷰 설정 - 기본 설정 유지
    month: {
      dayNames: ['일', '월', '화', '수', '목', '금', '토'],
      startDayOfWeek: 0,
      isAlways6Weeks: false,
      narrowWeekend: true,     // ✅ Toast UI 내장 기능 사용
      visibleEventCount: 6,    // ✅ 충분한 이벤트 표시
    },
    
    // 주 뷰 설정 (공식 문서 기준)
    week: {
      dayNames: ['일', '월', '화', '수', '목', '금', '토'],
      startDayOfWeek: 0,
      narrowWeekend: false,
      showNowIndicator: true,
      showTimezoneCollapseButton: false,
    },
    
    // ✅ 수정된 캘린더 목록 (연차와 회의 색상 교체)
    calendars: [
      { 
        id: 'annual_leave', 
        name: '연차', 
        backgroundColor: '#dbeafe',  // 파란색 (기존 회의 색상)
        borderColor: '#3b82f6', 
        color: '#1d4ed8',
      },
      { 
        id: 'morning_half', 
        name: '오전반차', 
        backgroundColor: '#fef3c7', 
        borderColor: '#f59e0b', 
        color: '#d97706',
      },
      { 
        id: 'afternoon_half', 
        name: '오후반차', 
        backgroundColor: '#fed7aa', 
        borderColor: '#ea580c', 
        color: '#c2410c',
      },
      { 
        id: 'meeting', 
        name: '회의', 
        backgroundColor: '#fee2e2',  // 빨간색 (기존 연차 색상)
        borderColor: '#ef4444', 
        color: '#dc2626',
      },
      { 
        id: 'dinner', 
        name: '회식', 
        backgroundColor: '#d1fae5', 
        borderColor: '#10b981', 
        color: '#047857',
      },
      { 
        id: 'etc', 
        name: '기타', 
        backgroundColor: '#e0e7ff', 
        borderColor: '#8b5cf6', 
        color: '#7c3aed',
      },
    ],
    
    // 템플릿 설정 (공식 문서 기준)
    template: {
      time(event: any) {
        const { start, end, title } = event;
        return `<div class="time-event">${title}</div>`;
      },
      allday(event: any) {
        return `<div class="allday-event">${event.title}</div>`;
      },
    },
  }), []);

  // ✅ 캐시 키 생성
  const getCacheKey = useCallback((year: number, month: number) => {
    return `${year}-${month.toString().padStart(2, '0')}`;
  }, []);

  // ✅ 날짜 변환 헬퍼 함수
  const parseDate = useCallback((dateInput: string | Date): Date => {
    if (dateInput instanceof Date) return dateInput;
    return new Date(dateInput);
  }, []);

  // ✅ 팝업 자동 숨김 함수
  const startHideTimer = useCallback(() => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000); // 3초 후 자동 숨김
  }, []);

  // ✅ 팝업 보이기/숨기기 함수
  const toggleControls = useCallback(() => {
    setShowControls(prev => {
      const newState = !prev;
      if (newState) {
        startHideTimer();
      } else if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
        hideControlsTimer.current = null;
      }
      return newState;
    });
  }, [startHideTimer]);

  // ✅ 요일 헤더 클릭 감지 (grid-header-month 영역)
  const handleCalendarClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // 요일 헤더 영역 클릭 감지
    const isHeaderClick = target.closest('[data-testid="grid-header-month"]') ||
                         target.closest('.toastui-calendar-day-names') ||
                         target.closest('.toastui-calendar-day-name-item');
    
    if (isHeaderClick) {
      e.stopPropagation();
      toggleControls();
    }
  }, [toggleControls]);

  // ✅ 현재 뷰 날짜 관리 (공식 API에서 제공하지 않으므로 직접 관리)
  const getCurrentDate = useCallback(() => {
    return currentViewDate.current;
  }, []);
  const applyWeekendStyles = useCallback(() => {
    setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      try {
        // 주말 배경색과 헤더 전체 회색 적용
        const applyStyles = () => {
          // 헤더 전체를 회색으로
          const headerMonth = container.querySelector('[data-testid="grid-header-month"]');
          if (headerMonth) {
            (headerMonth as HTMLElement).style.backgroundColor = '#f9fafb';
          }

          // 일요일 헤더
          const sundayHeaders = container.querySelectorAll('.toastui-calendar-day-name-item:first-child');
          sundayHeaders.forEach(el => (el as HTMLElement).style.backgroundColor = '#f9fafb');

          // 토요일 헤더  
          const saturdayHeaders = container.querySelectorAll('.toastui-calendar-day-name-item:last-child');
          saturdayHeaders.forEach(el => (el as HTMLElement).style.backgroundColor = '#f9fafb');

          // 일요일 셀
          const sundayCells = container.querySelectorAll('.toastui-calendar-daygrid-cell:first-child');
          sundayCells.forEach(el => (el as HTMLElement).style.backgroundColor = '#f9fafb');

          // 토요일 셀
          const saturdayCells = container.querySelectorAll('.toastui-calendar-daygrid-cell:last-child');
          saturdayCells.forEach(el => (el as HTMLElement).style.backgroundColor = '#f9fafb');
        };

        // 즉시 실행하고 잠시 후 다시 실행 (DOM 변경 대응)
        applyStyles();
        setTimeout(applyStyles, 200);
        setTimeout(applyStyles, 500);

      } catch (error) {
        console.warn('주말 스타일 적용 중 오류:', error);
      }
    }, 300);
  }, []);
  // ✅ 안전한 이벤트 로드 (성능 최적화)
  const loadEvents = useCallback(async () => {
    const calendar = calendarRef.current;
    if (!calendar || loading || !isInitialized.current) return;

    setLoading(true);
    
    try {
      const baseDate = getCurrentDate();
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const cacheKey = getCacheKey(year, month);

      // 캐시 확인
      if (eventsCache.current.has(cacheKey)) {
        const cachedEvents = eventsCache.current.get(cacheKey)!;
        try {
          calendar.clear();
          if (cachedEvents.length > 0) {
            calendar.createEvents(cachedEvents);
          }
          // 스타일 재적용
          applyWeekendStyles();
          showToast('success', `조회완료`);
          return;
        } catch (error) {
          console.warn('캐시된 이벤트 로드 실패:', error);
          eventsCache.current.delete(cacheKey);
        }
      }

      // 더 넓은 범위로 데이터 로드 (이전/다음 달 포함)
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month + 2, 0, 23, 59, 59, 999);
      
      const data: ApiEventData[] = await getEvents(start, end);
      
      const events: CalendarEvent[] = data.map((e) => ({
        id: e.id,
        title: e.title ?? '(제목 없음)',
        start: parseDate(e.start),
        end: parseDate(e.end),
        location: e.location ?? '',
        body: e.body ?? '',
        calendarId: e.calendarId,
        category: 'allday',
        isAllday: true,
        isReadOnly: e.isReadOnly ?? false,
      }));
      
      eventsCache.current.set(cacheKey, events);
      
      // 공식 API 사용
      try {
        calendar.clear();
        if (events.length > 0) {
          calendar.createEvents(events);
        }
      } catch (createError) {
        console.warn('이벤트 생성 실패:', createError);
        // 대안: 개별 생성 시도
        events.forEach((event, index) => {
          try {
            calendar.createEvents([event]);
          } catch (individualError) {
            console.warn(`이벤트 ${index + 1} 생성 실패:`, individualError);
          }
        });
      }
      
      // 스타일 재적용
      applyWeekendStyles();
      showToast('success', `조회완료`);
    } catch (err) {
      console.error('일정 불러오기 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      showToast('error', `일정을 불러오는데 실패했습니다: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [loading, getCacheKey, showToast, parseDate, getCurrentDate, applyWeekendStyles]);

  // ✅ 캐시 무효화
  const invalidateCache = useCallback((date?: Date) => {
    if (date) {
      const cacheKey = getCacheKey(date.getFullYear(), date.getMonth());
      eventsCache.current.delete(cacheKey);
    } else {
      eventsCache.current.clear();
    }
  }, [getCacheKey]);

  // ✅ 공식 API 기반 이벤트 핸들러들 (제목 자동 추가 기능 포함)
  const handleCreateEvent = useCallback(async (eventData: any) => {
    if (!eventData.title?.trim()) {
      showToast('error', '일정 제목을 입력해주세요.');
      return;
    }

    const { calendarId, title, body, start, end, location } = eventData;
    
    // ✅ 카테고리 라벨을 제목에 자동 추가
    const titleWithCategory = addCategoryToTitle(title.trim(), calendarId);

    try {
      const res = await createEvent({
        calendarId,
        title: titleWithCategory,
        body: body?.trim() || '',
        category: 'allday',
        isAllday: true,
        location: location?.trim() || '',
        isReadOnly: false,
        start: start instanceof Date ? start : new Date(start),
        end: end instanceof Date ? end : new Date(end),
      });

      const newEvent: CalendarEvent = {
        ...res.data,
        title: titleWithCategory,
        start: parseDate(res.data.start),
        end: parseDate(res.data.end),
      };

      // 공식 API 사용 - createEvents 메서드는 배열을 받음
      try {
        calendarRef.current?.createEvents([newEvent]);
      } catch (createError) {
        console.warn('새 이벤트 UI 생성 실패:', createError);
        // ✅ 대안: 전체 다시 로드
        loadEvents();
      }
      
      invalidateCache(newEvent.start);
      showToast('success', '일정 생성됨');
    } catch (err) {
      console.error('일정 저장 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      showToast('error', `일정 저장에 실패했습니다: ${errorMessage}`);
    }
  }, [invalidateCache, showToast, parseDate, loadEvents, addCategoryToTitle]);

  const handleUpdateEvent = useCallback(async ({ event, changes }: any) => {
    try {
      // ✅ 제목이 변경되었을 때 카테고리 라벨 자동 추가
      let updatedTitle = changes.title?.trim() || event.title || '(제목 없음)';
      if (changes.title && changes.title.trim()) {
        updatedTitle = addCategoryToTitle(changes.title.trim(), event.calendarId);
      }

      const payload = {
        ...event,
        ...changes,
        title: updatedTitle,
        start: changes.start instanceof Date ? changes.start : 
               (event.start instanceof Date ? event.start : new Date(event.start)),
        end: changes.end instanceof Date ? changes.end : 
             (event.end instanceof Date ? event.end : new Date(event.end)),
        location: changes.location ?? event.location ?? '',
        body: changes.body?.trim() ?? event.body ?? '',
        isAllday: true,
        category: 'allday',
      };

      await updateEvent(event.id, payload);
      
      // 공식 API 사용 - updateEvent는 세 개의 매개변수를 받음
      try {
        calendarRef.current?.updateEvent(event.id, event.calendarId, { ...changes, title: updatedTitle });
      } catch (updateError) {
        console.warn('이벤트 UI 업데이트 실패:', updateError);
        // ✅ 대안: 전체 다시 로드
        loadEvents();
      }
      
      invalidateCache(payload.start);
      showToast('success', '일정 수정됨');
    } catch (err) {
      console.error('일정 수정 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      showToast('error', `일정 수정에 실패했습니다: ${errorMessage}`);
    }
  }, [invalidateCache, showToast, loadEvents, addCategoryToTitle]);

  const handleDeleteEvent = useCallback(async ({ id, calendarId }: any) => {
    const confirmDelete = window.confirm('정말 이 일정을 삭제하시겠습니까?');
    if (!confirmDelete) return;

    try {
      await deleteEvent(id);
      
      // 공식 API 사용 - deleteEvent는 두 개의 매개변수를 받음
      try {
        calendarRef.current?.deleteEvent(id, calendarId);
      } catch (deleteError) {
        console.warn('이벤트 UI 삭제 실패:', deleteError);
        // ✅ 대안: 전체 다시 로드
        loadEvents();
      }
      
      eventsCache.current.clear();
      showToast('success', '일정 삭제됨');
    } catch (err) {
      console.error('일정 삭제 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      showToast('error', `일정 삭제에 실패했습니다: ${errorMessage}`);
    }
  }, [showToast, loadEvents]);

  // ✅ 날짜 표시 업데이트 (한 달 뷰)
  const updateCurrentDateDisplay = useCallback(() => {
    try {
      const currentDate = getCurrentDate();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      setCurrentDate(`${year}년 ${month}월`);
    } catch (error) {
      console.error('날짜 표시 업데이트 오류:', error);
      setCurrentDate(new Date().toLocaleDateString('ko-KR'));
    }
  }, [getCurrentDate]);

  // ✅ 공식 문서 기반 캘린더 초기화
  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return;

    try {
      // 공식 문서: DOM 요소를 직접 전달
      const calendar = new Calendar(containerRef.current, calendarOptions);

      // 공식 문서 기반 이벤트 리스너 등록
      calendar.on('beforeCreateEvent', handleCreateEvent);
      calendar.on('beforeUpdateEvent', handleUpdateEvent);
      calendar.on('beforeDeleteEvent', handleDeleteEvent);

      calendarRef.current = calendar;
      isInitialized.current = true;
      
      // 초기화 완료 후 데이터 로드
      setTimeout(() => {
        updateCurrentDateDisplay();
        loadEvents();
        // 초기 스타일 적용
        applyWeekendStyles();
      }, 100);

      return () => {
        try {
          if (calendarRef.current) {
            // 공식 API: 이벤트 리스너 해제 후 인스턴스 파괴
            calendarRef.current.off('beforeCreateEvent');
            calendarRef.current.off('beforeUpdateEvent');
            calendarRef.current.off('beforeDeleteEvent');
            calendarRef.current.destroy();
            calendarRef.current = null;
          }
          
          if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
            debounceTimer.current = null;
          }
          
          if (hideControlsTimer.current) {
            clearTimeout(hideControlsTimer.current);
            hideControlsTimer.current = null;
          }
          
          isInitialized.current = false;
        } catch (cleanupError) {
          console.error('Cleanup 오류:', cleanupError);
        }
      };
    } catch (error) {
      console.error('캘린더 초기화 오류:', error);
      showToast('error', '캘린더 초기화에 실패했습니다.');
    }
  }, []); // 의존성 배열 비움 - 한 번만 실행

  // ✅ 공식 API 기반 월 이동 (상태 동기화 개선)
  const moveCalendar = useCallback((type: 'prev' | 'next' | 'today') => {
    const calendar = calendarRef.current;
    if (!calendar || loading || !isInitialized.current) return;

    try {
      // 공식 API 메서드 사용
      if (type === 'prev') {
        calendar.prev();
        const newDate = new Date(currentViewDate.current);
        newDate.setMonth(newDate.getMonth() - 1);
        currentViewDate.current = newDate;
      } else if (type === 'next') {
        calendar.next();
        const newDate = new Date(currentViewDate.current);
        newDate.setMonth(newDate.getMonth() + 1);
        currentViewDate.current = newDate;
      } else {
        calendar.today();
        currentViewDate.current = new Date();
      }

      // UI 업데이트를 즉시 실행
      updateCurrentDateDisplay();

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      
      debounceTimer.current = setTimeout(() => {
        loadEvents();
        // 월 이동 후 스타일 재적용
        applyWeekendStyles();
      }, 150); // 응답성 개선을 위해 200ms → 150ms
      
      // ✅ 월 이동 후 타이머 재시작
      if (showControls) {
        startHideTimer();
      }
    } catch (error) {
      console.error('캘린더 이동 실패:', error);
      showToast('error', '캘린더 이동에 실패했습니다.');
    }
  }, [loading, updateCurrentDateDisplay, loadEvents, showToast, showControls, startHideTimer]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col relative">
      {/* 토스트 알림 */}
      {toast.visible && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform ${
          toast.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        } ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center space-x-2 text-sm">
            <span>
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* ✅ 팝업 컨트롤 바 */}
      {showControls && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => {
                moveCalendar('today');
              }}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => moveCalendar('prev')}
                disabled={loading}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button 
                onClick={() => moveCalendar('next')}
                disabled={loading}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <h1 className="text-lg font-semibold text-gray-900">
              {currentDate}
            </h1>

            {loading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm">로딩중...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ 팝업 외부 클릭 시 닫기 */}
      {showControls && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => {
            setShowControls(false);
            if (hideControlsTimer.current) {
              clearTimeout(hideControlsTimer.current);
              hideControlsTimer.current = null;
            }
          }}
        />
      )}

      {/* 캘린더 영역 - 전체 화면 */}
      <div className="flex-1 p-6">
        <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200">
          <div 
            ref={containerRef} 
            className="h-full w-full cursor-pointer"
            onClick={handleCalendarClick}
            style={{ 
              height: 'calc(100vh - 48px)', // ✅ 헤더 제거로 더 큰 공간
              minHeight: '700px'           // ✅ 최소 높이 증가
            }}
          />
        </div>
        
        {/* ✅ 기본 스타일링 + 헤더 전체 회색 */}
        <style jsx>{`
          /* 헤더 전체 회색 배경 */
          :global([data-testid="grid-header-month"]) {
            background-color: #f9fafb !important;
          }

          /* 헤더 컨테이너도 회색으로 */
          :global(.toastui-calendar-day-names) {
            background-color: #f9fafb !important;
          }

          /* 이벤트 블록 최적화 */
          :global(.toastui-calendar-weekday-event) {
            font-size: 11px !important;
            padding: 1px 4px !important;
            border-radius: 3px !important;
            margin-bottom: 1px !important;
          }

          /* 캘린더 전체 최적화 */
          :global(.toastui-calendar-layout) {
            border-radius: 8px !important;
          }

          /* More 버튼 스타일링 */
          :global(.toastui-calendar-grid-cell-more-events) {
            font-size: 10px !important;
            opacity: 0.7 !important;
          }

          /* 요일 헤더 클릭 가능 표시 */
          :global(.toastui-calendar-day-names),
          :global(.toastui-calendar-day-name-item) {
            cursor: pointer !important;
          }

          :global(.toastui-calendar-day-name-item:hover) {
            background-color: #f3f4f6 !important;
          }

          /* 팝업 애니메이션 */
          .fixed.top-4.left-1\\/2 {
            animation: slideDown 0.2s ease-out;
          }

          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translate(-50%, -10px);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default MonthlyCalendar;