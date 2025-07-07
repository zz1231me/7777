// client/src/store/auth.ts
import { create } from 'zustand';

// 🆕 사용자 정보 타입 정의
interface User {
  id: string;
  name: string;
  role: string;
  roleInfo: {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
  };
  permissions: Array<{
    boardId: string;
    boardName: string;
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  }>;
}

// 🔄 완전히 새로운 AuthState 인터페이스
interface AuthState {
  // 🆕 새로운 상태들
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // 🔄 새로운 액션들
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  
  // 🔍 편의 기능들
  getUserId: () => string | null;
  getUserName: () => string | null;
  getUserRole: () => string | null;
  isAdmin: () => boolean;
  canAccessBoard: (boardId: string, action: 'read' | 'write' | 'delete') => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  // 🆕 초기 상태 - sessionStorage 완전 제거
  user: null,
  isAuthenticated: false,
  isLoading: true, // 앱 시작 시 로딩 상태

  // 🆕 사용자 설정 (로그인 성공 시)
  setUser: (user) => set({ 
    user, 
    isAuthenticated: true,
    isLoading: false
  }),

  // 🆕 사용자 정보 삭제 (로그아웃 시)
  clearUser: () => set({ 
    user: null, 
    isAuthenticated: false,
    isLoading: false
  }),

  // 🆕 로딩 상태 설정
  setLoading: (isLoading) => set({ isLoading }),

  // 🔍 편의 기능: 사용자 ID 조회
  getUserId: () => {
    const { user } = get();
    return user?.id || null;
  },

  // 🔍 편의 기능: 사용자 이름 조회
  getUserName: () => {
    const { user } = get();
    return user?.name || null;
  },

  // 🔍 편의 기능: 사용자 역할 조회
  getUserRole: () => {
    const { user } = get();
    return user?.role || null;
  },

  // 🔍 편의 기능: 관리자 권한 체크
  isAdmin: () => {
    const { user } = get();
    return user?.role === 'admin';
  },

  // 🔍 편의 기능: 게시판 접근 권한 체크
  canAccessBoard: (boardId: string, action: 'read' | 'write' | 'delete') => {
    const { user } = get();
    if (!user?.permissions) return false;

    const boardPermission = user.permissions.find(p => p.boardId === boardId);
    if (!boardPermission) return false;

    switch (action) {
      case 'read': return boardPermission.canRead;
      case 'write': return boardPermission.canWrite;
      case 'delete': return boardPermission.canDelete;
      default: return false;
    }
  }
}));