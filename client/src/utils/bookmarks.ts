// client/src/utils/bookmarks.ts
export interface Bookmark {
  id: string;
  name: string;
  url: string;
  icon?: string;
  order: number;
}

// 정적 북마크 데이터
const COMPANY_BOOKMARKS: Bookmark[] = [
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    url: 'https://workspace.google.com',
    icon: 'https://www.google.com/s2/favicons?domain=workspace.google.com&sz=16',
    order: 0
  },
  {
    id: 'aws-console',
    name: 'AWS Console',
    url: 'https://aws.amazon.com/console',
    icon: 'https://www.google.com/s2/favicons?domain=aws.amazon.com&sz=16',
    order: 1
  }
];

/**
 * 회사에서 설정한 북마크 목록을 반환
 * 나중에 API로 변경하거나 설정 파일에서 읽어올 수 있음
 */
export const getBookmarks = (): Bookmark[] => {
  try {
    // 개발 환경에서는 정적 데이터 사용
    if (process.env.NODE_ENV === 'development') {
      console.log('📖 개발 환경: 정적 북마크 데이터 사용');
      return COMPANY_BOOKMARKS;
    }

    // 프로덕션에서는 여기서 API 호출하거나 환경변수에서 읽어올 수 있음
    // const response = await fetch('/api/bookmarks');
    // return response.json();
    
    return COMPANY_BOOKMARKS;
  } catch (error) {
    console.error('북마크 로딩 중 오류:', error);
    return [];
  }
};

/**
 * 북마크 URL 유효성 검사
 */
export const validateBookmarkUrl = (url: string): boolean => {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
};

/**
 * 도메인에서 파비콘 URL 생성
 */
export const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return '';
  }
};