// client/src/components/AuthProvider.tsx
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../store/auth';
import { useAuthInit } from '../hooks/useAuthInit';
import { refreshToken } from '../api/auth';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * 인증 상태를 관리하는 프로바이더 컴포넌트
 * 앱 시작 시 쿠키의 토큰을 확인해서 자동 로그인 처리
 * 백그라운드에서 주기적으로 토큰 갱신
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isAuthenticated, user, clearUser } = useAuth();
  const { isLoading } = useAuthInit();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🔄 백그라운드 토큰 갱신 설정
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔄 백그라운드 토큰 갱신 타이머 시작');
      
      // 10분마다 토큰 갱신 (Access Token 15분 만료 전에 미리 갱신)
      intervalRef.current = setInterval(async () => {
        try {
          console.log('🔄 백그라운드 토큰 갱신 시도...');
          await refreshToken();
          console.log('✅ 백그라운드 토큰 갱신 성공');
        } catch (error) {
          console.error('❌ 백그라운드 토큰 갱신 실패:', error);
          
          // 갱신 실패 시 로그아웃 처리
          console.log('🚪 토큰 갱신 실패로 인한 자동 로그아웃');
          clearUser();
          window.location.href = '/';
        }
      }, 10 * 60 * 1000); // 20분마다 실행

      // 정리 함수
      return () => {
        if (intervalRef.current) {
          console.log('🛑 백그라운드 토큰 갱신 타이머 정리');
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // 로그아웃 상태일 때 타이머 정리
      if (intervalRef.current) {
        console.log('🛑 로그아웃으로 인한 토큰 갱신 타이머 정리');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isAuthenticated, user, clearUser]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 인증 상태 초기화 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">인증 상태 확인 중...</p>
          <p className="text-gray-400 text-sm mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  // 인증 상태 초기화 완료 후 자식 컴포넌트 렌더링
  return (
    <>
      {children}
      
      {/* 개발 환경에서만 보이는 인증 상태 디버깅 정보 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50">
          <div>🔐 Login : {isAuthenticated ? '✅' : '❌'}</div>
          {user && (
            <>
              <div>👤 사용자: {user.name}</div>
              <div>🔄 자동갱신: {intervalRef.current ? '✅' : '❌'}</div>
            </>
          )}
        </div>
      )}
    </>
  );
};