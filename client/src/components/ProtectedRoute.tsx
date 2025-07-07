import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // 🔄 로딩 중이면 로딩 화면 표시
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

  // 🔄 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    console.log('❌ 인증되지 않은 사용자, 로그인 페이지로 이동');
    return <Navigate to="/" replace />;
  }

  // ✅ 인증된 사용자는 자식 컴포넌트 렌더링
  return children;
};

export default ProtectedRoute;