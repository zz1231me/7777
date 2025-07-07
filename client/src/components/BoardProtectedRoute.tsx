// client/src/components/BoardProtectedRoute.tsx
import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../store/auth';
import api from '../api/axios'; // 🔄 쿠키 기반 axios 사용

interface Props {
  children: JSX.Element;
  action?: 'read' | 'write' | 'delete';
}

interface BoardAccessRole {
  roleId: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

interface BoardAccessResponse {
  boardType: string;
  roles: BoardAccessRole[];
}

const BoardProtectedRoute = ({ children, action = 'read' }: Props) => {
  const { isAuthenticated, isLoading, getUserRole, canAccessBoard } = useAuth();
  const { boardType } = useParams<{ boardType: string }>();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null); // null = 로딩중
  const [debugInfo, setDebugInfo] = useState<string>('');

  // 🔄 로딩 중이면 로딩 화면
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // 🔄 인증되지 않은 경우 로그인 페이지로
  if (!isAuthenticated) {
    console.log('❌ 인증되지 않은 사용자 - 로그인 페이지로 이동');
    return <Navigate to="/" replace />;
  }

  // 게시판 타입 없으면 대시보드로
  if (!boardType) {
    console.log('❌ boardType 없음 - 대시보드로 이동');
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    const checkBoardAccess = async () => {
      try {
        const userRole = getUserRole();
        console.log(`🔍 게시판 권한 체크 시작: boardType=${boardType}, action=${action}, role=${userRole}`);
        
        // 🔄 새로운 방법 1: 상태에서 바로 권한 체크 (빠름)
        const hasPermission = canAccessBoard(boardType, action);
        if (hasPermission) {
          console.log(`✅ 상태에서 권한 확인됨: ${boardType}/${action}`);
          setDebugInfo(`게시판: ${boardType}, 액션: ${action}, 권한: 허용 (캐시됨)`);
          setIsAllowed(true);
          return;
        }

        // 🔄 새로운 방법 2: 서버에서 최신 권한 확인 (느리지만 정확)
        console.log(`🔍 서버에서 권한 재확인 중...`);
        
        const res = await api.get(`/boards/access/${boardType}`);
        console.log(`🔍 API 응답:`, res.data);

        const data: BoardAccessResponse = res.data;

        // 내 역할 찾기
        const myRole = data.roles.find((r) => r.roleId === userRole);
        console.log(`🔍 내 역할 검색: ${userRole} -> ${myRole ? '찾음' : '못찾음'}`);
        
        if (!myRole) {
          console.warn(`❌ 내 역할(${userRole})에 대한 권한 없음`);
          setDebugInfo(`역할 '${userRole}'을 찾을 수 없습니다. 사용 가능한 역할: ${data.roles.map(r => r.roleId).join(', ')}`);
          setIsAllowed(false);
          return;
        }

        console.log(`🔍 내 역할 권한:`, {
          canRead: myRole.canRead,
          canWrite: myRole.canWrite,
          canDelete: myRole.canDelete
        });

        const permissionMap = {
          read: myRole.canRead,
          write: myRole.canWrite,
          delete: myRole.canDelete,
        };

        const result = permissionMap[action];
        console.log(`🔐 최종 권한 체크: ${boardType}/${action} = ${result}`);
        
        setDebugInfo(`게시판: ${boardType}, 액션: ${action}, 권한: ${result ? '허용' : '거부'}`);
        setIsAllowed(result);
        
      } catch (err) {
        console.error('❌ 게시판 권한 확인 실패:', err);
        setDebugInfo(`에러 발생: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
        setIsAllowed(false);
      }
    };

    checkBoardAccess();
  }, [boardType, action, getUserRole, canAccessBoard]);

  // 접근 불가
  if (isAllowed === false) {
    console.log(`❌ 게시판 접근 거부됨: ${debugInfo}`);
    return (
      <div className="text-center p-6">
        <h2 className="text-xl font-bold text-red-600 mb-4">접근 권한이 없습니다</h2>
        <p className="text-gray-600 mb-4">{debugInfo}</p>
        <button 
          onClick={() => window.history.back()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  // 접근 허용
  if (isAllowed === true) {
    console.log(`✅ 게시판 접근 허용됨: ${debugInfo}`);
    return children;
  }

  // 로딩 중
  return (
    <div className="text-center p-6 text-gray-500">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
      <p>권한 확인 중...</p>
      {debugInfo && <p className="text-sm text-gray-400 mt-2">{debugInfo}</p>}
    </div>
  );
};

export default BoardProtectedRoute;