import React, { useEffect, useState } from 'react';
import api from '../api/axios'; // ✅ 쿠키 기반 axios 사용

interface User {
  id: string;
  name: string;
  roleId: string;
  roleInfo?: {
    id: string;
    name: string;
  };
}

interface Role {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface Board {
  id: string;
  name: string;
  description: string;
  order: number;
  isActive: boolean;
}

interface BoardPermission {
  roleId: string;
  roleName: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

interface Event {
  id: number;
  title: string;
  start: string;
  end: string;
  location?: string;
  calendarId: string;
  user: {
    id: string;
    name: string;
    roleInfo?: {
      id: string;
      name: string;
    };
  };
  createdAt: string;
}

interface EventPermission {
  roleId: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  role?: {
    id: string;
    name: string;
  };
}

type TabType = 'users' | 'boards' | 'roles' | 'permissions' | 'events';

const AdminUserPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [boardPermissions, setBoardPermissions] = useState<Record<string, BoardPermission[]>>({});
  const [eventPermissions, setEventPermissions] = useState<EventPermission[]>([]);
  
  // 로딩 상태 관리
  const [loadingStates, setLoadingStates] = useState({
    users: false,
    roles: false,
    boards: false,
    permissions: false,
    events: false,
  });

  // 데이터 로드 상태 추적 (중복 로드 방지)
  const [dataLoaded, setDataLoaded] = useState({
    users: false,
    roles: false,
    boards: false,
    permissions: false,
    events: false,
  });
  
  // Forms
  const [userForm, setUserForm] = useState({ id: '', password: '', name: '', role: '' });
  const [roleForm, setRoleForm] = useState({ id: '', name: '', description: '' });
  const [boardForm, setBoardForm] = useState({ id: '', name: '', description: '', order: 0 });
  const [newUserInfo, setNewUserInfo] = useState<{ id: string; password: string } | null>(null);
  const [editingBoard, setEditingBoard] = useState<string | null>(null);
  const [editBoardData, setEditBoardData] = useState<Partial<Board>>({});

  // 탭 변경 시 필요한 데이터 로드
  useEffect(() => {
    handleTabChange(activeTab, false); // 초기 로드는 새로고침 아님
  }, [activeTab]);

  // API 호출 간 딜레이 함수
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleTabChange = async (tab: TabType, forceRefresh: boolean = false) => {
    // 이미 로딩 중인 경우 중복 호출 방지
    const currentLoadingKey = tab === 'permissions' ? 'permissions' : tab;
    if (loadingStates[currentLoadingKey] && !forceRefresh) return;

    switch (tab) {
      case 'users':
        if (!dataLoaded.users || forceRefresh) {
          await delay(250);
          await fetchUsers();
          await delay(250); // 150ms 딜레이
          await fetchRoles();
        }
        break;
      case 'boards':
        if (!dataLoaded.boards || forceRefresh) {
           await delay(250);
          await fetchBoards();
        }
        break;
      case 'roles':
        if (!dataLoaded.roles || forceRefresh) {
          await delay(250);
          await fetchRoles();
        }
        break;
      case 'permissions':
        if (!dataLoaded.boards || forceRefresh) {
          await delay(250);
          await fetchBoards(); // 150ms 딜레이
        }
        if (!dataLoaded.roles || forceRefresh) {
          await delay(250); // 150ms 딜레이  
          await fetchRoles();
        }
        if ((!dataLoaded.permissions && boards.length > 0) || forceRefresh) {
          await delay(250); // 권한 조회 전 추가 딜레이
          await fetchAllBoardPermissions();
        }
        break;
      case 'events':
        if (!dataLoaded.events || forceRefresh) {
          await delay(250);
          await fetchEvents();
          await delay(250); // 150ms 딜레이
          await fetchEventPermissions();
        }
        break;
    }
  };

  // 탭 클릭 핸들러 (새로고침 기능 포함)
  const handleTabClick = async (tab: TabType) => {
    if (activeTab === tab) {
      // 같은 탭을 다시 클릭하면 새로고침
      console.log(`🔄 ${tab} 탭 새로고침`);
      
      // 해당 탭의 로드 상태 초기화
      if (tab === 'permissions') {
        setDataLoadedState('permissions', false);
        setDataLoadedState('boards', false);
        setDataLoadedState('roles', false);
      } else {
        setDataLoadedState(tab, false);
      }
      
      await handleTabChange(tab, true);
    } else {
      // 다른 탭으로 변경
      setActiveTab(tab);
    }
  };

  // 권한 설정 탭에서 게시판 데이터가 로드된 후 권한 데이터 로드
  useEffect(() => {
    if (activeTab === 'permissions' && boards.length > 0 && !dataLoaded.permissions) {
      fetchAllBoardPermissions();
    }
  }, [boards, activeTab]);

  const setLoading = (key: keyof typeof loadingStates, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };

  const setDataLoadedState = (key: keyof typeof dataLoaded, loaded: boolean) => {
    setDataLoaded(prev => ({ ...prev, [key]: loaded }));
  };

  const fetchUsers = async () => {
    if (loadingStates.users) return;
    
    try {
      setLoading('users', true);
      const res = await api.get('/admin/users');
      setUsers(res.data);
      setDataLoadedState('users', true);
    } catch (err) {
      console.error('사용자 목록 오류:', err);
      alert('사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading('users', false);
    }
  };

  const fetchRoles = async () => {
    if (loadingStates.roles) return;
    
    try {
      setLoading('roles', true);
      const res = await api.get('/admin/roles');
      setRoles(res.data);
      setDataLoadedState('roles', true);
      
      // 사용자 폼의 기본 권한 설정
      if (res.data.length > 0 && !userForm.role) {
        setUserForm(prev => ({ ...prev, role: res.data[0].id }));
      }
    } catch (err) {
      console.error('권한 목록 오류:', err);
      alert('권한 목록을 불러오지 못했습니다.');
    } finally {
      setLoading('roles', false);
    }
  };

  const fetchBoards = async () => {
    if (loadingStates.boards) return;
    
    try {
      setLoading('boards', true);
      const res = await api.get('/admin/boards');
      setBoards(res.data);
      setDataLoadedState('boards', true);
    } catch (err) {
      console.error('게시판 목록 오류:', err);
      alert('게시판 목록을 불러오지 못했습니다.');
    } finally {
      setLoading('boards', false);
    }
  };

  const fetchEvents = async () => {
    if (loadingStates.events) return;
    
    try {
      setLoading('events', true);
      const res = await api.get('/admin/events');
      setEvents(res.data);
      setDataLoadedState('events', true);
    } catch (err) {
      console.error('이벤트 목록 오류:', err);
      alert('이벤트 목록을 불러오지 못했습니다.');
    } finally {
      setLoading('events', false);
    }
  };

  const fetchEventPermissions = async () => {
    try {
      const res = await api.get('/admin/events/permissions');
      setEventPermissions(res.data);
    } catch (err) {
      console.error('이벤트 권한 오류:', err);
    }
  };

  const fetchAllBoardPermissions = async () => {
    if (loadingStates.permissions || boards.length === 0) return;
    
    try {
      setLoading('permissions', true);
      const permissionsState: Record<string, BoardPermission[]> = {};
      
      // 각 게시판별로 순차적으로 권한 조회 (딜레이 포함)
      for (let i = 0; i < boards.length; i++) {
        const board = boards[i];
        console.log(`📁 ${board.name} 권한 조회 중... (${i + 1}/${boards.length})`);
        
        const res = await api.get(`/admin/boards/${board.id}/permissions`);
        permissionsState[board.id] = res.data;
        
        // 마지막 게시판이 아니면 딜레이
        if (i < boards.length - 1) {
          await delay(200); // 200ms 딜레이
        }
      }
      
      setBoardPermissions(permissionsState);
      setDataLoadedState('permissions', true);
      console.log('✅ 모든 게시판 권한 조회 완료');
    } catch (err) {
      console.error('권한 설정 불러오기 실패:', err);
    } finally {
      setLoading('permissions', false);
    }
  };

  // User Management
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddUser = async () => {
    try {
      const randomPassword = generateRandomPassword();
      const userData = {
        ...userForm,
        password: randomPassword
      };
      
      await api.post('/admin/users', userData);
      
      // 새 사용자 정보 표시
      setNewUserInfo({
        id: userForm.id,
        password: randomPassword
      });
      
      // 10초 후 정보 삭제
      setTimeout(() => {
        setNewUserInfo(null);
      }, 10000);
      
      setUserForm({ id: '', password: '', name: '', role: roles[0]?.id || '' });
      fetchUsers();
    } catch (err) {
      console.error('사용자 추가 실패:', err);
      alert('사용자 추가 실패');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await api.put(`/admin/users/${userId}`, { role: newRole });
      fetchUsers();
      alert('사용자 권한이 변경되었습니다.');
    } catch (err) {
      console.error('권한 변경 실패:', err);
      alert('권한 변경 실패');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchUsers();
      alert('사용자가 삭제되었습니다.');
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제 실패');
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      await api.post(`/admin/users/${id}/reset-password`);
      alert('비밀번호가 1234로 초기화되었습니다.');
    } catch (err) {
      console.error('초기화 실패:', err);
      alert('비밀번호 초기화 실패');
    }
  };

  // Role Management
  const handleAddRole = async () => {
    try {
      await api.post('/admin/roles', roleForm);
      setRoleForm({ id: '', name: '', description: '' });
      fetchRoles();
      alert('권한이 추가되었습니다.');
    } catch (err) {
      console.error('권한 추가 실패:', err);
      alert('권한 추가 실패');
    }
  };

  const handleUpdateRole = async (roleId: string, updates: Partial<Role>) => {
    try {
      await api.put(`/admin/roles/${roleId}`, updates);
      fetchRoles();
      alert('권한이 수정되었습니다.');
    } catch (err) {
      console.error('권한 수정 실패:', err);
      alert('권한 수정 실패');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/admin/roles/${id}`);
      fetchRoles();
      alert('권한이 삭제되었습니다.');
    } catch (err) {
      console.error('권한 삭제 실패:', err);
      alert('권한 삭제 실패');
    }
  };

  // Board Management
  const handleAddBoard = async () => {
    try {
      await api.post('/admin/boards', boardForm);
      setBoardForm({ id: '', name: '', description: '', order: 0 });
      fetchBoards();
      alert('게시판이 추가되었습니다.');
    } catch (err) {
      console.error('게시판 추가 실패:', err);
      alert('게시판 추가 실패');
    }
  };

  const handleUpdateBoard = async (boardId: string, updates: Partial<Board>) => {
    try {
      await api.put(`/admin/boards/${boardId}`, updates);
      
      // 비활성화 시 모든 권한 제거
      if (updates.isActive === false) {
        await api.put(`/admin/boards/${boardId}/permissions`, {
          permissions: []
        });
        // 로컬 상태도 업데이트
        setBoardPermissions(prev => ({
          ...prev,
          [boardId]: []
        }));
      }
      
      // 활성화 시 관리자에게 모든 권한 부여
      if (updates.isActive === true) {
        const adminRole = roles.find(role => role.id === 'admin');
        if (adminRole) {
          const adminPermissions = [{
            roleId: 'admin',
            canRead: true,
            canWrite: true,
            canDelete: true
          }];
          
          await api.put(`/admin/boards/${boardId}/permissions`, {
            permissions: adminPermissions
          });
          
          // 로컬 상태도 업데이트
          setBoardPermissions(prev => ({
            ...prev,
            [boardId]: [{
              roleId: 'admin',
              roleName: adminRole.name,
              canRead: true,
              canWrite: true,
              canDelete: true
            }]
          }));
        }
      }
      
      fetchBoards();
      alert('게시판이 수정되었습니다.');
    } catch (err) {
      console.error('게시판 수정 실패:', err);
      alert('게시판 수정 실패');
    }
  };

  const handleDeleteBoard = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/admin/boards/${id}`);
      fetchBoards();
      alert('게시판이 삭제되었습니다.');
    } catch (err) {
      console.error('게시판 삭제 실패:', err);
      alert('게시판 삭제 실패');
    }
  };

  const startEditBoard = (board: Board) => {
    setEditingBoard(board.id);
    setEditBoardData({
      name: board.name,
      description: board.description,
      order: board.order
    });
  };

  const cancelEditBoard = () => {
    setEditingBoard(null);
    setEditBoardData({});
  };

  const saveEditBoard = async (boardId: string) => {
    try {
      await api.put(`/admin/boards/${boardId}`, editBoardData);
      setEditingBoard(null);
      setEditBoardData({});
      fetchBoards();
    } catch (err) {
      console.error('게시판 수정 실패:', err);
      alert('게시판 수정 실패');
    }
  };

  // Event Management
  const handleDeleteEvent = async (id: number) => {
    if (!confirm('정말 이 일정을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/admin/events/${id}`);
      fetchEvents();
      alert('일정이 삭제되었습니다.');
    } catch (err) {
      console.error('일정 삭제 실패:', err);
      alert('일정 삭제 실패');
    }
  };

  const handleUpdateEvent = async (id: number, updates: any) => {
    try {
      await api.put(`/admin/events/${id}`, updates);
      fetchEvents();
      alert('일정이 수정되었습니다.');
    } catch (err) {
      console.error('일정 수정 실패:', err);
      alert('일정 수정 실패');
    }
  };

  // Board Permission Management
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const handlePermissionToggle = async (boardId: string, roleId: string, permissionType: 'canRead' | 'canWrite' | 'canDelete') => {
    // 이미 저장 중이면 무시
    if (saving[boardId]) return;

    setBoardPermissions(prev => {
      const boardPerms = prev[boardId] || [];
      const existingPermIndex = boardPerms.findIndex(p => p.roleId === roleId);
      
      let updatedPerms;
      if (existingPermIndex >= 0) {
        // 기존 권한 수정
        updatedPerms = boardPerms.map(perm => 
          perm.roleId === roleId 
            ? { ...perm, [permissionType]: !perm[permissionType] }
            : perm
        );
      } else {
        // 새 권한 추가
        const role = roles.find(r => r.id === roleId);
        if (role) {
          const newPermission = {
            roleId,
            roleName: role.name,
            canRead: permissionType === 'canRead',
            canWrite: permissionType === 'canWrite',
            canDelete: permissionType === 'canDelete'
          };
          updatedPerms = [...boardPerms, newPermission];
        } else {
          updatedPerms = boardPerms;
        }
      }
      
      const newState = { ...prev, [boardId]: updatedPerms };
      
      // 디바운스된 자동 저장
      setSaving(prev => ({ ...prev, [boardId]: true }));
      
      // 기존 타이머가 있으면 취소
      if (window.boardPermissionTimer) {
        clearTimeout(window.boardPermissionTimer);
      }
      
      window.boardPermissionTimer = setTimeout(async () => {
        try {
          // 유효한 권한만 필터링
          const validPermissions = updatedPerms
            .filter(p => p.roleId && typeof p.canRead === 'boolean' && typeof p.canWrite === 'boolean' && typeof p.canDelete === 'boolean')
            .map(p => ({
              roleId: p.roleId,
              canRead: p.canRead,
              canWrite: p.canWrite,
              canDelete: p.canDelete
            }));

          await api.put(`/admin/boards/${boardId}/permissions`, {
            permissions: validPermissions
          });
          
          console.log(`✅ 게시판 ${boardId} 권한 저장 완료`);
        } catch (err) {
          console.error('권한 자동 저장 실패:', err);
        } finally {
          setSaving(prev => ({ ...prev, [boardId]: false }));
        }
      }, 500);
      
      return newState;
    });
  };

  // Event Permission Management
  const [savingEvents, setSavingEvents] = useState(false);

  const handleEventPermissionToggle = async (roleId: string, permissionType: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete') => {
    // 이미 저장 중이면 무시
    if (savingEvents) return;

    setEventPermissions(prev => {
      const updatedPermissions = prev.map(perm => 
        perm.roleId === roleId 
          ? { ...perm, [permissionType]: !perm[permissionType] }
          : perm
      );
      
      // 디바운스된 자동 저장
      setSavingEvents(true);
      
      // 기존 타이머가 있으면 취소
      if (window.eventPermissionTimer) {
        clearTimeout(window.eventPermissionTimer);
      }
      
      window.eventPermissionTimer = setTimeout(async () => {
        try {
          // 유효한 권한만 필터링
          const validPermissions = updatedPermissions.filter(p => 
            p.roleId && 
            typeof p.canCreate === 'boolean' && 
            typeof p.canRead === 'boolean' && 
            typeof p.canUpdate === 'boolean' && 
            typeof p.canDelete === 'boolean'
          );

          await api.put('/admin/events/permissions', {
            permissions: validPermissions
          });
          
          console.log('✅ 이벤트 권한 저장 완료');
        } catch (err) {
          console.error('이벤트 권한 자동 저장 실패:', err);
        } finally {
          setSavingEvents(false);
        }
      }, 500);
      
      return updatedPermissions;
    });
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCalendarName = (calendarId: string) => {
    const calendarNames: Record<string, string> = {
      vacation: '휴가',
      meeting: '회의',
      deadline: '마감',
      out: '외근',
      etc: '기타'
    };
    return calendarNames[calendarId] || calendarId;
  };

  const tabs = [
    { id: 'users', label: '👥 사용자 관리' },
    { id: 'boards', label: '📁 게시판 관리' },
    { id: 'roles', label: '🔑 권한 관리' },
    { id: 'permissions', label: '⚙️ 권한 설정' },
    { id: 'events', label: '📅 일정 관리' },
  ];

  // 로딩 컴포넌트
  const LoadingSpinner = ({ message = "데이터를 불러오는 중..." }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600">{message}</p>
      <div className="mt-2 text-sm text-gray-400">
        🔄 같은 탭을 다시 클릭하면 새로고침됩니다
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 py-12 px-6">
      <div className="max-w-7xl mx-auto bg-white shadow-2xl rounded-3xl p-10">
        <h1 className="text-4xl font-bold text-gray-800 border-b pb-6 mb-8">👑 관리자 페이지</h1>

        {/* 탭 네비게이션 */}
        <div className="flex flex-wrap gap-2 mb-8 bg-gray-100 p-2 rounded-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id as TabType)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all relative ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title={activeTab === tab.id ? '클릭하면 새로고침됩니다' : ''}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
              )}
            </button>
          ))}
        </div>

        {/* 사용자 관리 탭 */}
        {activeTab === 'users' && (
          <div className="space-y-12">
            {loadingStates.users ? (
              <LoadingSpinner message="사용자 데이터를 불러오는 중..." />
            ) : (
              <>
                {/* 사용자 추가 */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-700 mb-6">➕ 사용자 추가</h2>
                  
                  {/* 새 사용자 정보 표시 */}
                  {newUserInfo && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-green-800 mb-2">✅ 사용자가 성공적으로 등록되었습니다!</h3>
                          <div className="space-y-1">
                            <p className="text-green-700">
                              <span className="font-medium">ID:</span> 
                              <span className="ml-2 font-mono bg-white px-2 py-1 rounded border">{newUserInfo.id}</span>
                            </p>
                            <p className="text-green-700">
                              <span className="font-medium">PW:</span> 
                              <span className="ml-2 font-mono bg-white px-2 py-1 rounded border">{newUserInfo.password}</span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setNewUserInfo(null)}
                          className="text-green-600 hover:text-green-800 text-xl font-bold"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-sm text-green-600 mt-2">
                        ⏰ 이 정보는 10초 후 자동으로 사라집니다. 지금 복사해두세요!
                      </p>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* 한 줄로 고정 너비 지정 */}
                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-600">아이디</label>
                        <input
                          type="text"
                          value={userForm.id}
                          onChange={(e) => setUserForm({ ...userForm, id: e.target.value })}
                          className="w-48 rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="사용자 아이디"
                        />
                      </div>
                      
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-600">이름</label>
                        <input
                          type="text"
                          value={userForm.name}
                          onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                          className="w-48 rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="사용자 이름"
                        />
                      </div>
                      
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-600">권한</label>
                        <select
                          value={userForm.role}
                          onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                          className="w-48 rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">권한 선택</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <button
                          onClick={handleAddUser}
                          disabled={!userForm.id || !userForm.name || !userForm.role}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-8 py-3 text-base font-semibold rounded-xl shadow-md transition"
                        >
                          사용자 등록
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                    💡 비밀번호는 8자리 난수로 자동 생성되며, 등록 완료 시 표시됩니다.
                  </div>
                </section>

                {/* 사용자 목록 */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-700 mb-6">👥 사용자 목록</h2>
                  <div className="overflow-x-auto rounded-xl border shadow">
                    <table className="min-w-full text-sm text-center border-collapse">
                      <thead className="bg-blue-100 text-blue-800 text-sm font-semibold">
                        <tr>
                          <th className="px-4 py-3 border">아이디</th>
                          <th className="px-4 py-3 border">이름</th>
                          <th className="px-4 py-3 border">권한</th>
                          <th className="px-4 py-3 border">작업</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              등록된 사용자가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 border font-mono">{user.id}</td>
                              <td className="px-4 py-3 border font-medium">{user.name}</td>
                              <td className="px-4 py-3 border">
                                <select
                                  value={user.roleId}
                                  onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border-none outline-none"
                                >
                                  {roles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 border">
                                <div className="flex flex-col items-center gap-2">
                                  <button
                                    onClick={() => handleResetPassword(user.id)}
                                    className="w-32 bg-yellow-100 text-yellow-700 px-4 py-1 rounded-md text-sm hover:bg-yellow-200 transition border-0 outline-none whitespace-nowrap"
                                  >
                                    🔁 암호 재설정
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="w-32 bg-red-100 text-red-600 px-4 py-1 rounded-md text-sm hover:bg-red-200 transition border-0 outline-none whitespace-nowrap"
                                  >
                                    🗑️ 계정삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {/* 게시판 관리 탭 */}
        {activeTab === 'boards' && (
          <div className="space-y-12">
            {loadingStates.boards ? (
              <LoadingSpinner message="게시판 데이터를 불러오는 중..." />
            ) : (
              <>
                {/* 게시판 추가 */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-700 mb-6">➕ 게시판 추가</h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm font-medium text-gray-600">게시판 ID</label>
                      <input
                        type="text"
                        value={boardForm.id}
                        onChange={(e) => setBoardForm({ ...boardForm, id: e.target.value })}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="영문, 숫자만"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm font-medium text-gray-600">게시판 이름</label>
                      <input
                        type="text"
                        value={boardForm.name}
                        onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="게시판 이름"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm font-medium text-gray-600">설명</label>
                      <input
                        type="text"
                        value={boardForm.description}
                        onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="게시판 설명"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm font-medium text-gray-600">순서</label>
                      <input
                        type="number"
                        value={boardForm.order}
                        onChange={(e) => setBoardForm({ ...boardForm, order: parseInt(e.target.value) || 0 })}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="mt-8 text-right">
                    <button
                      onClick={handleAddBoard}
                      disabled={!boardForm.id || !boardForm.name}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 text-base font-semibold rounded-xl shadow-md transition"
                    >
                      게시판 등록
                    </button>
                  </div>
                </section>

                {/* 게시판 목록 */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-700 mb-6">📁 게시판 목록</h2>
                  <div className="overflow-x-auto rounded-xl border shadow">
                    <table className="min-w-full text-sm text-center border-collapse">
                      <thead className="bg-green-100 text-green-800 text-sm font-semibold">
                        <tr>
                          <th className="px-4 py-3 border">ID</th>
                          <th className="px-4 py-3 border">이름</th>
                          <th className="px-4 py-3 border">설명</th>
                          <th className="px-4 py-3 border">순서</th>
                          <th className="px-4 py-3 border">상태</th>
                          <th className="px-4 py-3 border">작업</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {boards.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              등록된 게시판이 없습니다.
                            </td>
                          </tr>
                        ) : (
                          boards.map((board) => (
                            <tr key={board.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 border font-mono">{board.id}</td>
                              <td className="px-4 py-3 border">
                                {editingBoard === board.id ? (
                                  <input
                                    type="text"
                                    value={editBoardData.name || ''}
                                    onChange={(e) => setEditBoardData({...editBoardData, name: e.target.value})}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                ) : (
                                  <span className="font-semibold">{board.name}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 border">
                                {editingBoard === board.id ? (
                                  <input
                                    type="text"
                                    value={editBoardData.description || ''}
                                    onChange={(e) => setEditBoardData({...editBoardData, description: e.target.value})}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                ) : (
                                  <span className="text-gray-600">{board.description}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 border">
                                {editingBoard === board.id ? (
                                  <input
                                    type="number"
                                    value={editBoardData.order || 0}
                                    onChange={(e) => setEditBoardData({...editBoardData, order: parseInt(e.target.value) || 0})}
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                ) : (
                                  board.order
                                )}
                              </td>
                              <td className="px-4 py-3 border">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                  board.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {board.isActive ? '활성' : '비활성'}
                                </span>
                              </td>
                              <td className="px-4 py-3 border">
                                <div className="flex flex-col items-center gap-2">
                                  {editingBoard === board.id ? (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => saveEditBoard(board.id)}
                                        className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs hover:bg-green-200 transition whitespace-nowrap"
                                      >
                                        ✅ 저장
                                      </button>
                                      <button
                                        onClick={cancelEditBoard}
                                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs hover:bg-gray-200 transition whitespace-nowrap"
                                      >
                                        ❌ 취소
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => startEditBoard(board)}
                                        className="bg-blue-100 text-blue-700 px-4 py-1 rounded-md text-sm hover:bg-blue-200 transition"
                                      >
                                        ✏️ 수정
                                      </button>
                                      <button
                                        onClick={() => {
                                          const newStatus = !board.isActive;
                                          if (confirm(`게시판을 ${newStatus ? '활성화' : '비활성화'}하시겠습니까?`)) {
                                            handleUpdateBoard(board.id, { isActive: newStatus });
                                          }
                                        }}
                                        className={`px-3 py-1 rounded-md text-sm transition whitespace-nowrap ${
                                          board.isActive 
                                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                      >
                                        {board.isActive ? '🔒 비활성' : '🔓 활성화'}
                                      </button>
                                      <button
                                        onClick={() => handleDeleteBoard(board.id)}
                                        className="bg-red-100 text-red-600 px-4 py-1 rounded-md text-sm hover:bg-red-200 transition"
                                      >
                                        🗑️ 삭제
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {/* 권한 관리 탭 */}
        {activeTab === 'roles' && (
          <div className="space-y-12">
            {loadingStates.roles ? (
              <LoadingSpinner message="권한 데이터를 불러오는 중..." />
            ) : (
              <>
                {/* 권한 추가 */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-700 mb-6">➕ 권한 추가</h2>
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm font-medium text-gray-600">권한 ID</label>
                      <input
                        type="text"
                        value={roleForm.id}
                        onChange={(e) => setRoleForm({ ...roleForm, id: e.target.value })}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="영문, 숫자만"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm font-medium text-gray-600">권한 이름</label>
                      <input
                        type="text"
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="권한 이름"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm font-medium text-gray-600">설명</label>
                      <input
                        type="text"
                        value={roleForm.description}
                        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="권한 설명"
                      />
                    </div>
                  </div>
                  <div className="mt-8 text-right">
                    <button
                      onClick={handleAddRole}
                      disabled={!roleForm.id || !roleForm.name}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 text-base font-semibold rounded-xl shadow-md transition"
                    >
                      권한 등록
                    </button>
                  </div>
                </section>

                {/* 권한 목록 */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-700 mb-6">🔑 권한 목록</h2>
                  <div className="overflow-x-auto rounded-xl border shadow">
                    <table className="min-w-full text-sm text-center border-collapse">
                      <thead className="bg-purple-100 text-purple-800 text-sm font-semibold">
                        <tr>
                          <th className="px-4 py-3 border">ID</th>
                          <th className="px-4 py-3 border">이름</th>
                          <th className="px-4 py-3 border">설명</th>
                          <th className="px-4 py-3 border">상태</th>
                          <th className="px-4 py-3 border">작업</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {roles.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                              등록된 권한이 없습니다.
                            </td>
                          </tr>
                        ) : (
                          roles.map((role) => (
                            <tr key={role.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 border font-mono">{role.id}</td>
                              <td className="px-4 py-3 border font-semibold">{role.name}</td>
                              <td className="px-4 py-3 border text-gray-600">{role.description}</td>
                              <td className="px-4 py-3 border">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  role.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {role.isActive ? '활성' : '비활성'}
                                </span>
                              </td>
                              <td className="px-4 py-3 border">
                                <div className="flex flex-col items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const newName = prompt('새 권한 이름:', role.name);
                                      if (newName && newName !== role.name) {
                                        handleUpdateRole(role.id, { name: newName });
                                      }
                                    }}
                                    className="bg-blue-100 text-blue-700 px-4 py-1 rounded-md text-sm hover:bg-blue-200 transition"
                                  >
                                    ✏️ 수정
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRole(role.id)}
                                    className="bg-red-100 text-red-600 px-4 py-1 rounded-md text-sm hover:bg-red-200 transition"
                                  >
                                    🗑️ 삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {/* 게시판 권한 설정 탭 */}
        {activeTab === 'permissions' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-700">⚙️ 게시판별 권한 설정</h2>
              {loadingStates.permissions && (
                <div className="flex items-center text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  권한 정보를 순차적으로 불러오는 중...
                </div>
              )}
            </div>
            {loadingStates.permissions ? (
              <LoadingSpinner message="게시판 권한 설정을 불러오는 중..." />
            ) : (
              <div className="space-y-6">
                {boards.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    게시판이 없습니다. 먼저 게시판을 생성해주세요.
                  </div>
                ) : (
                  boards.map((board) => (
                    <div key={board.id} className="border rounded-xl p-6 shadow bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                          📁 {board.name} ({board.id})
                        </h3>
                        <span className={`text-sm px-3 py-1 rounded-full ${
                          saving[board.id] 
                            ? 'text-yellow-600 bg-yellow-50' 
                            : 'text-gray-500 bg-green-50'
                        }`}>
                          {saving[board.id] ? '💾 저장 중...' : '✅ 자동 저장됨'}
                        </span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-gray-700">권한</th>
                              <th className="px-4 py-2 text-center font-medium text-gray-700">읽기</th>
                              <th className="px-4 py-2 text-center font-medium text-gray-700">쓰기</th>
                              <th className="px-4 py-2 text-center font-medium text-gray-700">삭제</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {roles.map((role) => {
                              const permission = boardPermissions[board.id]?.find(p => p.roleId === role.id) || {
                                roleId: role.id,
                                roleName: role.name,
                                canRead: false,
                                canWrite: false,
                                canDelete: false
                              };
                              
                              return (
                                <tr key={role.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 font-medium text-gray-900">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                                      {role.name}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={permission.canRead}
                                      onChange={() => handlePermissionToggle(board.id, role.id, 'canRead')}
                                      className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={permission.canWrite}
                                      onChange={() => handlePermissionToggle(board.id, role.id, 'canWrite')}
                                      className="form-checkbox h-4 w-4 text-green-600 rounded focus:ring-green-500"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={permission.canDelete}
                                      onChange={() => handlePermissionToggle(board.id, role.id, 'canDelete')}
                                      className="form-checkbox h-4 w-4 text-red-600 rounded focus:ring-red-500"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="mt-4 text-xs text-gray-500">
                        💡 읽기: 게시판 목록 및 게시글 조회 권한 | 쓰기: 게시글 작성 권한 | 삭제: 게시글 삭제 권한
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 일정 관리 탭 */}
        {activeTab === 'events' && (
          <div className="space-y-12">
            {loadingStates.events ? (
              <LoadingSpinner message="일정 데이터를 불러오는 중..." />
            ) : (
              <>
                {/* 일정 권한 설정 */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-700">📅 이벤트 권한 설정</h2>
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      savingEvents 
                        ? 'text-yellow-600 bg-yellow-50' 
                        : 'text-gray-500 bg-green-50'
                    }`}>
                      {savingEvents ? '💾 저장 중...' : '✅ 자동 저장됨'}
                    </span>
                  </div>
                  
                  <div className="bg-white border rounded-xl p-6 shadow">
                    {eventPermissions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        이벤트 권한 설정을 불러오는 중...
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-blue-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-blue-800">권한</th>
                              <th className="px-4 py-3 text-center font-medium text-blue-800">생성</th>
                              <th className="px-4 py-3 text-center font-medium text-blue-800">조회</th>
                              <th className="px-4 py-3 text-center font-medium text-blue-800">타인 수정</th>
                              <th className="px-4 py-3 text-center font-medium text-blue-800">타인 삭제</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {eventPermissions.map((permission) => (
                              <tr key={permission.roleId} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                    {permission.role?.name || permission.roleId}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={permission.canCreate}
                                    onChange={() => handleEventPermissionToggle(permission.roleId, 'canCreate')}
                                    className="form-checkbox h-5 w-5 text-green-600 rounded focus:ring-green-500"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={permission.canRead}
                                    onChange={() => handleEventPermissionToggle(permission.roleId, 'canRead')}
                                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={permission.canUpdate}
                                    onChange={() => handleEventPermissionToggle(permission.roleId, 'canUpdate')}
                                    className="form-checkbox h-5 w-5 text-yellow-600 rounded focus:ring-yellow-500"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={permission.canDelete}
                                    onChange={() => handleEventPermissionToggle(permission.roleId, 'canDelete')}
                                    className="form-checkbox h-5 w-5 text-red-600 rounded focus:ring-red-500"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                      💡 <strong>생성:</strong> 새 일정 등록 권한 | 
                      <strong> 조회:</strong> 일정 목록 보기 권한 | 
                      <strong> 타인 수정:</strong> 다른 사람이 만든 일정 수정 권한 | 
                      <strong> 타인 삭제:</strong> 다른 사람이 만든 일정 삭제 권한<br/>
                      📌 본인이 만든 일정은 권한 설정과 관계없이 항상 수정/삭제 가능합니다.
                    </div>
                  </div>
                </section>

                {/* 일정 목록 */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-700 mb-6">📋 전체 일정 목록</h2>
                  <div className="overflow-x-auto rounded-xl border shadow">
                    <table className="min-w-full text-sm border-collapse">
                      <thead className="bg-blue-100 text-blue-800 text-sm font-semibold">
                        <tr>
                          <th className="px-4 py-3 border text-left">제목</th>
                          <th className="px-4 py-3 border text-center">카테고리</th>
                          <th className="px-4 py-3 border text-center">작성자</th>
                          <th className="px-4 py-3 border text-center">시작일</th>
                          <th className="px-4 py-3 border text-center">종료일</th>
                          <th className="px-4 py-3 border text-center">장소</th>
                          <th className="px-4 py-3 border text-center">작업</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {events.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                              등록된 일정이 없습니다.
                            </td>
                          </tr>
                        ) : (
                          events.map((event) => (
                            <tr key={event.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 border">
                                <div className="font-medium text-gray-900">{event.title}</div>
                              </td>
                              <td className="px-4 py-3 border text-center">
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                                  {getCalendarName(event.calendarId)}
                                </span>
                              </td>
                              <td className="px-4 py-3 border text-center">
                                <div className="flex flex-col items-center">
                                  <span className="font-medium">{event.user.name}</span>
                                  <span className="text-xs text-gray-500">
                                    ({event.user.roleInfo?.name || '권한없음'})
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 border text-center text-xs">
                                {formatDate(event.start)}
                              </td>
                              <td className="px-4 py-3 border text-center text-xs">
                                {formatDate(event.end)}
                              </td>
                              <td className="px-4 py-3 border text-center">
                                <span className="text-sm text-gray-600">
                                  {event.location || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 border">
                                <div className="flex flex-col items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const newTitle = prompt('새 일정 제목:', event.title);
                                      if (newTitle && newTitle.trim() && newTitle !== event.title) {
                                        handleUpdateEvent(event.id, { title: newTitle.trim() });
                                      }
                                    }}
                                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-xs hover:bg-blue-200 transition"
                                  >
                                    ✏️ 수정
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="bg-red-100 text-red-600 px-3 py-1 rounded-md text-xs hover:bg-red-200 transition"
                                  >
                                    🗑️ 삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
                    📊 <strong>현재 총 {events.length}개의 일정이 등록되어 있습니다.</strong><br/>
                    관리자는 모든 일정을 수정/삭제할 수 있으며, 각 권한별 일정 생성/조회 권한은 위의 권한 설정에서 관리할 수 있습니다.
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// window 타입 확장 (TypeScript 에러 방지)
declare global {
  interface Window {
    boardPermissionTimer?: number;
    eventPermissionTimer?: number;
  }
}

export default AdminUserPage;