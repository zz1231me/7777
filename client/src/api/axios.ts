// client/src/api/axios.ts
import axios from 'axios';
import { refreshToken } from './auth';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // ✅ 쿠키 포함하여 요청
});

// 🔄 요청 인터셉터 - sessionStorage 관련 코드 제거
api.interceptors.request.use(
  (config) => {
    // 쿠키는 자동으로 전송되므로 추가 설정 불필요
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔄 응답 인터셉터 - 자동 토큰 갱신 포함
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 419 상태 코드: Access Token 만료 (자동 갱신 시도)
    if (error.response?.status === 419 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log('🔄 Access Token 만료 감지, 자동 갱신 시도...');
        
        // Refresh Token으로 새 Access Token 발급
        await refreshToken();
        console.log('✅ 토큰 갱신 성공, 원래 요청 재시도');
        
        // 원래 요청 재시도
        return api(originalRequest);
      } catch (refreshError) {
        console.error('❌ 토큰 갱신 실패:', refreshError);
        
        // 갱신 실패 시 로그인 페이지로 이동
        console.log('🚪 로그인 페이지로 리다이렉트');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    // 401 상태 코드: 인증 실패 (로그인 페이지로 이동)
    if (error.response?.status === 401) {
      console.warn('❌ 인증 실패, 로그인 페이지로 이동');
      window.location.href = '/';
    }

    // 403 상태 코드: 권한 없음
    if (error.response?.status === 403) {
      console.warn('❌ 접근 권한 없음');
      // 필요시 권한 없음 페이지로 리다이렉트
      // window.location.href = '/unauthorized';
    }

    return Promise.reject(error);
  }
);

export default api;