import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

interface Props {
  children: JSX.Element;
  allowedRoles: string[];
}

const RoleProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { isAuthenticated, isLoading, getUserRole } = useAuth();
  
  // 🔄 로딩 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  // 🔄 인증되지 않은 경우 로그인 페이지로
  if (!isAuthenticated) {
    console.log('❌ 인증되지 않은 사용자');
    return <Navigate to="/" replace />;
  }

  const userRole = getUserRole();
  
  // 🔄 역할 권한 체크
  if (!userRole || !allowedRoles.includes(userRole)) {
    console.log(`❌ 권한 없음: 필요 역할 [${allowedRoles.join(', ')}], 현재 역할: ${userRole}`);
    return <Navigate to="/unauthorized" replace />;
  }

  console.log(`✅ 역할 권한 확인: ${userRole}`);
  return children;
};

export default RoleProtectedRoute;