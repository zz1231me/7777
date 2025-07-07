// client/src/utils/jwt.ts
interface BoardPermission {
  boardId: string;
  boardName: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

interface JWTPayload {
  id: string;
  name: string;
  role: string;
  permissions: BoardPermission[];
  iat: number;
  exp: number;
}

// ✅ JWT 토큰 디코딩 (서명 검증 없이 페이로드만 읽기)
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT 디코딩 실패:', error);
    return null;
  }
};

// ✅ 토큰에서 권한 정보 추출
export const getUserPermissions = (): BoardPermission[] => {
  const token = sessionStorage.getItem('token');
  if (!token) return [];

  const payload = decodeJWT(token);
  return payload?.permissions || [];
};

// ✅ 특정 게시판 접근 권한 체크
export const canAccessBoard = (boardId: string, action: 'read' | 'write' | 'delete'): boolean => {
  const permissions = getUserPermissions();
  const boardPermission = permissions.find(p => p.boardId === boardId);
  
  if (!boardPermission) return false;

  switch (action) {
    case 'read': return boardPermission.canRead;
    case 'write': return boardPermission.canWrite;
    case 'delete': return boardPermission.canDelete;
    default: return false;
  }
};

// ✅ 접근 가능한 게시판 목록 (JWT에서 바로 추출)
export const getAccessibleBoards = (): BoardPermission[] => {
  console.log('🔍 getAccessibleBoards 함수 호출됨');
  
  const token = sessionStorage.getItem('token');
  if (!token) {
    console.log('❌ 토큰이 없습니다');
    return [];
  }

  const payload = decodeJWT(token);
  if (!payload) {
    console.log('❌ JWT 디코딩 실패');
    return [];
  }

  console.log('🔐 JWT 페이로드:', payload);
  console.log('📋 권한 목록:', payload.permissions);

  // permissions가 없거나 배열이 아닌 경우 빈 배열 반환
  if (!payload.permissions || !Array.isArray(payload.permissions)) {
    console.log('⚠️ 권한 정보가 없거나 잘못된 형식');
    return [];
  }

  return payload.permissions.filter(p => p.canRead);
};

// ✅ 관리자 권한 체크
export const isAdmin = (): boolean => {
  const token = sessionStorage.getItem('token');
  if (!token) return false;

  const payload = decodeJWT(token);
  return payload?.role === 'admin';
};