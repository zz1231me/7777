// src/utils/downloadUtils.ts - 쿠키 기반 인증으로 완전 수정
/**
 * ✅ 쿠키 기반 파일 다운로드 함수
 */
export const downloadFile = async (fileInfo: {
  storedName: string;
  originalName: string;
  url?: string;
}) => {
  try {
    console.log('📥 다운로드 시작:', fileInfo);
    
    // 🔄 sessionStorage 체크 제거 - 쿠키 기반에서는 불필요
    // 서버에서 HttpOnly 쿠키로 인증을 처리하므로 클라이언트에서 토큰 확인 불필요

    const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
    
    // ✅ 원본 파일명을 URL 파라미터로 전달
    const downloadUrl = `${baseUrl}/api/uploads/download/${fileInfo.storedName}?originalName=${encodeURIComponent(fileInfo.originalName)}`;
    
    console.log('🌐 다운로드 URL:', downloadUrl);
    
    // 🔄 쿠키 기반 fetch - Authorization 헤더 제거, credentials 추가
    const response = await fetch(downloadUrl, {
      method: 'GET',
      credentials: 'include', // ✅ 쿠키 자동 포함
      // Authorization 헤더 제거 - 쿠키로 인증 처리
    });
    
    console.log('📡 응답 상태:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 다운로드 실패:', errorText);
      
      // 🔄 401 에러 시 더 명확한 메시지
      if (response.status === 401) {
        throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
      } else if (response.status === 403) {
        throw new Error('파일에 접근할 권한이 없습니다.');
      } else if (response.status === 404) {
        throw new Error('파일을 찾을 수 없습니다.');
      } else {
        throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
      }
    }
    
    // Blob으로 변환
    const blob = await response.blob();
    console.log('📦 Blob 생성 완료:', blob.size, 'bytes');
    
    // 브라우저 다운로드 실행
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileInfo.originalName; // 원본 파일명으로 다운로드
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 메모리 정리
    window.URL.revokeObjectURL(url);
    
    console.log(`✅ 다운로드 완료: ${fileInfo.originalName}`);
    
  } catch (error) {
    console.error('❌ 파일 다운로드 오류:', error);
    
    // 🔄 에러 타입에 따른 더 자세한 안내
    let errorMessage = '파일 다운로드에 실패했습니다.';
    
    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        errorMessage = error.message + '\n페이지를 새로고침하거나 다시 로그인해보세요.';
      } else {
        errorMessage = error.message;
      }
    }
    
    alert(errorMessage);
  }
};

/**
 * ✅ 파일 크기 포맷팅 유틸리티
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * ✅ 파일 타입 확인 유틸리티
 */
export const getFileType = (filename: string): 'image' | 'document' | 'archive' | 'video' | 'audio' | 'file' => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return 'file';
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const documentExts = ['pdf', 'doc', 'docx', 'txt', 'hwp', 'ppt', 'pptx', 'xls', 'xlsx'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg'];
  
  if (imageExts.includes(ext)) return 'image';
  if (documentExts.includes(ext)) return 'document';
  if (archiveExts.includes(ext)) return 'archive';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  return 'file';
};

/**
 * ✅ 파일 검증 함수
 */
export const validateFileInfo = (fileInfo: any): boolean => {
  return (
    fileInfo &&
    typeof fileInfo === 'object' &&
    fileInfo.storedName &&
    fileInfo.originalName
  );
};

/**
 * 🆕 쿠키 기반 이미지 URL 생성 함수 (필요시 사용)
 */
export const getImageUrl = (storedName: string): string => {
  const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
  return `${baseUrl}/uploads/images/${storedName}`;
};