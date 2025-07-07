// client/src/hooks/useAuthInit.ts
import { useEffect } from 'react';
import { useAuth } from '../store/auth';
import { getCurrentUser } from '../api/auth';

/**
 * 앱 시작 시 인증 상태를 초기화하는 훅
 * 쿠키에 토큰이 있으면 자동으로 사용자 정보를 가져와서 로그인 상태로 설정
 */
export const useAuthInit = () => {
  const { setUser, clearUser, setLoading, isLoading } = useAuth();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        console.log('🔄 인증 상태 초기화 시작...');

        // 서버에서 현재 사용자 정보 조회 (쿠키의 토큰 사용)
        const response = await getCurrentUser();
        
        // 사용자 정보 설정
        setUser(response.user);
        console.log('✅ 인증 상태 복원 성공:', response.user.name);
        console.log('🔐 사용자 역할:', response.user.roleInfo.name);
        console.log('📋 권한 수:', response.user.permissions.length);
        
      } catch (error) {
        console.log('❌ 인증되지 않은 사용자 (쿠키 없음 또는 만료)');
        
        // 에러 타입에 따른 처리
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('419')) {
            console.log('🔄 토큰이 없거나 만료됨');
          } else {
            console.warn('⚠️ 예상치 못한 인증 오류:', error.message);
          }
        }
        
        // 인증되지 않은 상태로 설정
        clearUser();
      } finally {
        setLoading(false);
        console.log('✅ 인증 상태 초기화 완료');
      }
    };

    // 초기화 함수 실행
    initializeAuth();
  }, [setUser, clearUser, setLoading]);

  // 로딩 상태 반환 (컴포넌트에서 사용할 수 있도록)
  return { isLoading };
};