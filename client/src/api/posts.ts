import axios from './axios';

// ✅ 깔끔한 타입 정의
type PostPayload = {
  title: string;
  content: string;
  boardType: string;
  files?: File[];
};

export interface PostListResponse {
  posts: Array<{
    id: string;
    title: string;
    author: string;
    createdAt: string;
    UserId: string;
    commentCount: number;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface FetchPostsOptions {
  page?: number;
  limit?: number;
  search?: string;
}

// ✅ 게시글 목록 조회 - 페이지네이션 및 검색 지원
export async function fetchPostsByType(
  boardType: string, 
  options: FetchPostsOptions = {}
): Promise<PostListResponse> {
  try {
    const { page = 1, limit = 10, search = '' } = options;
    
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search.trim()) {
      params.append('search', search.trim());
    }

    const res = await axios.get(`/posts/${boardType}?${params.toString()}`);
    console.log('📄 게시글 목록 조회 성공:', res.data);
    
    if (!res.data.posts || !res.data.pagination) {
      throw new Error('잘못된 API 응답 구조');
    }
    
    return res.data;
  } catch (error: any) {
    console.error('❌ fetchPostsByType error:', error);
    
    return {
      posts: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        limit: 10,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }
}

// ✅ 게시글 단건 조회
export async function fetchPostById(boardType: string, postId: string) {
  const res = await axios.get(`/posts/${boardType}/${postId}`);
  console.log('📄 게시글 단건 조회 성공:', res.data);
  return res.data;
}

// ✅ 게시글 생성 - 한글 파일명 완벽 지원
export async function createPost({ title, content, boardType, files }: PostPayload) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  formData.append('boardType', boardType);
  
  // ✅ 다중 파일 추가 - 한글 파일명 안전 처리
  if (files && files.length > 0) {
    const limitedFiles = files.slice(0, 3);
    
    // 원본 파일명을 JSON으로 별도 전송
    const originalNames = limitedFiles.map(file => file.name);
    formData.append('originalFilenames', JSON.stringify(originalNames));
    
    // 파일 자체는 그대로 추가 (multer가 처리)
    limitedFiles.forEach(file => {
      formData.append('files', file);
    });
    
    console.log('📤 전송할 파일들:', limitedFiles.map(f => f.name));
    console.log('📤 원본 파일명 목록:', originalNames);
  }

  const res = await axios.post(`/posts/${boardType}`, formData, {
    headers: { 
      'Content-Type': 'multipart/form-data',
      'Accept': 'application/json'
    },
  });

  console.log('📝 게시글 생성 성공:', res.data);
  return res.data;
}

// ✅ 게시글 수정 - deletedFileNames 지원 추가
export async function updatePost(
  boardType: string, 
  postId: string, 
  { title, content, files, keepExistingFiles = false, deletedFileNames }: Omit<PostPayload, 'boardType'> & { 
    keepExistingFiles?: boolean;
    deletedFileNames?: string[]; // ✅ 추가
  }
) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  formData.append('keepExistingFiles', keepExistingFiles.toString());
  
  // ✅ 삭제된 파일명 목록 전송
  if (deletedFileNames && deletedFileNames.length > 0) {
    formData.append('deletedFileNames', JSON.stringify(deletedFileNames));
    console.log('🗑️ 삭제할 파일명 목록 전송:', deletedFileNames);
  }
  
  // ✅ 새로운 파일들 추가 - 한글 파일명 안전 처리
  if (files && files.length > 0) {
    const limitedFiles = files.slice(0, 3);
    
    // 원본 파일명을 JSON으로 별도 전송
    const originalNames = limitedFiles.map(file => file.name);
    formData.append('originalFilenames', JSON.stringify(originalNames));
    
    // 파일 자체는 그대로 추가 (multer가 처리)
    limitedFiles.forEach(file => {
      formData.append('files', file);
    });
    
    console.log('📤 전송할 파일들:', limitedFiles.map(f => f.name));
    console.log('📤 원본 파일명 목록:', originalNames);
  }

  console.log('🚀 서버로 전송하는 데이터:', {
    title,
    keepExistingFiles,
    deletedFileNames,
    newFilesCount: files?.length || 0
  });

  const res = await axios.put(`/posts/${boardType}/${postId}`, formData, {
    headers: { 
      'Content-Type': 'multipart/form-data',
      'Accept': 'application/json'
    },
  });

  console.log('🛠 게시글 수정 성공:', res.data);
  return res.data;
}

// ✅ 게시글 삭제
export async function deletePost(boardType: string, postId: string) {
  const res = await axios.delete(`/posts/${boardType}/${postId}`);
  console.log('🗑 게시글 삭제 성공:', res.data);
  return res.data;
}

// ✅ 파일 크기 포맷팅 유틸리티
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ✅ 파일 타입 확인 유틸리티
export function getFileType(filename: string): 'image' | 'document' | 'archive' | 'video' | 'audio' | 'file' {
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
}