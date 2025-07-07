// src/pages/boards/PostDetail.tsx - 가로폭을 다른 컴포넌트와 동일하게 수정
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { fetchPostById, deletePost, getFileType } from '../../api/posts';
import { downloadFile } from '../../utils/downloadUtils';
import { Avatar } from '../../components/Avatar';
import CommentSection from './CommentSection';
import { Viewer } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor-viewer.css';

// ✅ 새로운 파일 시스템에 맞는 타입
type Post = {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  boardType: string;
  attachments?: Array<{
    url: string;
    originalName: string;
    storedName: string;
    size?: number;
    mimeType?: string;
  }>; // 새로운 파일 시스템 구조
};

type FileType = 'image' | 'document' | 'archive' | 'video' | 'audio' | 'file';

const BOARD_TITLES: Record<string, string> = {
  notice: '공지사항',
  onboarding: '온보딩',
  shared: '공유 자료',
  internal: '내부 문서',
  free: '자유게시판'
} as const;

const FILE_TYPE_CONFIG = {
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
    color: 'text-green-600 bg-green-100'
  },
  document: {
    extensions: ['pdf', 'doc', 'docx', 'txt', 'hwp', 'ppt', 'pptx', 'xls', 'xlsx'],
    color: 'text-blue-600 bg-blue-100'
  },
  archive: {
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
    color: 'text-orange-600 bg-orange-100'
  },
  video: {
    extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'],
    color: 'text-purple-600 bg-purple-100'
  },
  audio: {
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg'],
    color: 'text-pink-600 bg-pink-100'
  }
} as const;

const PostDetail = () => {
  const { boardType, id } = useParams<{ boardType: string; id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  
  // 🔄 Zustand 스토어에서 사용자 정보 가져오기 (sessionStorage 대신)
  const { user, getUserId, getUserName, isAdmin } = useAuth();

  const canEditOrDelete = useMemo(() => {
    if (!post || !user) return false;
    
    // 🔄 Zustand 스토어의 사용자 정보로 권한 확인
    const currentUserId = getUserId();
    const currentUserName = getUserName();
    const isAdminUser = isAdmin();
    
    return (
      post.author === currentUserId || 
      post.author === currentUserName || 
      isAdminUser
    );
  }, [post, user, getUserId, getUserName, isAdmin]);

  const getBoardTitle = useCallback((type: string) => {
    return BOARD_TITLES[type] || type?.toUpperCase() || '게시판';
  }, []);

  const fileUtils = useMemo(() => ({
    getFileType: (filePath: string): FileType => {
      if (!filePath || typeof filePath !== 'string') return 'file';
      const filename = filePath.split('/').pop() || filePath;
      return getFileType(filename) as FileType;
    },

    getFileConfig: (fileType: FileType) => {
      return FILE_TYPE_CONFIG[fileType] || { color: 'text-gray-600 bg-gray-100' };
    },

    getFileIcon: (fileType: FileType) => {
      const iconProps = { 
        className: "w-5 h-5", 
        fill: "none", 
        stroke: "currentColor", 
        viewBox: "0 0 24 24",
        strokeWidth: 2,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const
      };
      
      switch (fileType) {
        case 'image':
          return (
            <svg {...iconProps}>
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          );
        case 'document':
          return (
            <svg {...iconProps}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          );
        case 'archive':
          return (
            <svg {...iconProps}>
              <polyline points="21,8 21,21 3,21 3,8"/>
              <rect width="18" height="5" x="3" y="3"/>
              <line x1="10" y1="12" x2="14" y2="12"/>
            </svg>
          );
        case 'video':
          return (
            <svg {...iconProps}>
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect width="15" height="14" x="1" y="5" rx="2" ry="2"/>
            </svg>
          );
        case 'audio':
          return (
            <svg {...iconProps}>
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          );
        default:
          return (
            <svg {...iconProps}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
          );
      }
    }
  }), []);

  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 24) {
        if (diffInHours < 1) return '방금 전';
        return `${diffInHours}시간 전`;
      } else if (diffInHours < 24 * 7) {
        const days = Math.floor(diffInHours / 24);
        return `${days}일 전`;
      } else {
        return date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  }, []);

  const fetchPost = useCallback(async () => {
    if (!boardType || !id) {
      setError('잘못된 접근입니다.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await fetchPostById(boardType, id);
      
      console.log('📤 서버 응답 데이터:', data);
      
      setPost({
        id: data.id,
        title: data.title,
        content: data.content || '내용이 없습니다.',
        author: data.author,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt || data.createdAt,
        boardType: boardType,
        attachments: Array.isArray(data.attachments) ? data.attachments : []
      });
      
    } catch (err: any) {
      console.error('게시글 조회 실패:', err);
      setError(err.response?.data?.message || err.message || '게시글을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [boardType, id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleBack = useCallback(() => {
    navigate(`/dashboard/posts/${boardType}`);
  }, [navigate, boardType]);

  const handleEdit = useCallback(() => {
    if (!canEditOrDelete) {
      alert('수정 권한이 없습니다.');
      return;
    }
    navigate(`/dashboard/posts/${boardType}/edit/${id}`);
  }, [navigate, boardType, id, canEditOrDelete]);

  const handleDelete = useCallback(async () => {
    if (!canEditOrDelete) {
      alert('삭제 권한이 없습니다.');
      return;
    }

    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;

    try {
      setIsDeleting(true);
      await deletePost(boardType!, id!);
      alert('게시글이 삭제되었습니다.');
      navigate(`/dashboard/posts/${boardType}`);
    } catch (err: any) {
      console.error('게시글 삭제 실패:', err);
      alert(err.response?.data?.message || '게시글 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  }, [id, boardType, navigate, canEditOrDelete]);

  // ✅ 새로운 파일 시스템에 맞는 다운로드 핸들러
  const handleDownload = useCallback(async (fileInfo: {
    storedName: string;
    originalName: string;
    url?: string;
  }) => {
    await downloadFile(fileInfo);
  }, []);

  const SkeletonLoader = () => (
    <div className="min-h-full bg-gradient-to-br from-gray-50/50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
            <div className="h-5 bg-gray-200 rounded w-32"></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden mb-6 animate-pulse">
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-8 py-8">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <SkeletonLoader />;
  }

  if (error) {
    return (
      <div className="min-h-full bg-gradient-to-br from-gray-50/50 to-white">
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-8">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h3>
              <p className="text-gray-600 mb-6" role="alert">{error}</p>
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                목록으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-full bg-gradient-to-br from-gray-50/50 to-white">
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-8">
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">게시글을 찾을 수 없습니다</h3>
              <p className="text-gray-600 mb-6">요청하신 게시글이 존재하지 않거나 삭제되었습니다.</p>
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                목록으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50/50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* 헤더 */}
        <header className="mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-9 h-9 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all duration-200 shadow-sm border-0 outline-none focus:outline-none"
              aria-label="뒤로 가기"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {getBoardTitle(boardType!)}
            </h1>
          </div>
        </header>

        {/* 게시글 카드 */}
        <main className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden mb-6">
          {/* 게시글 헤더 */}
          <header className="px-8 py-6 border-b border-gray-100">
            {/* 제목 섹션 - 더 강조된 구분 */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl px-6 py-5 mb-6 border border-slate-200">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                {post.title}
              </h1>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* ✅ 작성자 - 기존 하드코딩된 아바타를 Avatar 컴포넌트로 교체 */}
                <div className="flex items-center gap-3">
                  <Avatar 
                    name={post.author} 
                    size="md" 
                    variant="gradient"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{post.author}</div>
                    <div className="text-xs text-gray-500">{formatDate(post.createdAt)}</div>
                  </div>
                </div>
                
                {post.updatedAt !== post.createdAt && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span className="text-amber-700 font-medium">수정됨</span>
                  </div>
                )}
              </div>
              
              {/* 액션 버튼 - 모든 테두리 완전 제거 */}
              {canEditOrDelete && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium border-0 outline-none focus:outline-none"
                    disabled={isDeleting}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                    수정
                  </button>
                  
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50 border-0 outline-none focus:outline-none"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                        삭제 중
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        삭제
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* 게시글 본문 - 더 명확한 구분 */}
          <section className="bg-white px-8 py-8">
            <div className="prose prose-gray max-w-none">
              <Viewer
                initialValue={post.content}
                theme="light"
                height="auto"
                extendedAutolinks={true}
                linkAttributes={{
                  target: '_blank',
                  rel: 'noopener noreferrer'
                }}
              />
            </div>
          </section>

          {/* ✅ 첨부파일 - 새로운 파일 시스템에 맞게 완전 수정 */}
          {post.attachments && post.attachments.length > 0 && (
            <section className="px-8 py-6 border-t border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                <h3 className="font-medium text-gray-900">
                  첨부파일 ({post.attachments.length}개)
                </h3>
              </div>
              
              <div className="space-y-3">
                {post.attachments.map((fileInfo, index) => {
                  // ✅ 새로운 파일 시스템에서는 서버 데이터를 그대로 사용
                  const displayName = fileInfo.originalName || `파일_${index + 1}`;
                  const fileType = fileUtils.getFileType(displayName);
                  const fileConfig = fileUtils.getFileConfig(fileType);
                  
                  console.log('📄 파일 정보:', fileInfo);
                  
                  return (
                    <div key={index} className="flex items-center gap-4 p-4 bg-white rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${fileConfig.color}`}>
                        {fileUtils.getFileIcon(fileType)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate" title={displayName}>
                          {displayName}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {fileType} 파일
                          {fileInfo.size && ` • ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB`}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDownload({
                          storedName: fileInfo.storedName,
                          originalName: fileInfo.originalName,
                          url: fileInfo.url
                        })}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium border-0 outline-none focus:outline-none"
                        aria-label={`${displayName} 다운로드`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        다운로드
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </main>


        {/* 댓글 섹션 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
          <header className="px-8 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-gray-50/30">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-slate-600 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">댓글</h2>
            </div>
          </header>
          
          <div className="px-8 py-5">
            <CommentSection postId={id!} />
          </div>
        </section>
      </div>
    </div>
  );
};

export default PostDetail;