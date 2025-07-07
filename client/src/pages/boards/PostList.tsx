// src/pages/boards/PostList.tsx - 쿠키 기반 인증으로 완전 수정
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchPostsByType, PostListResponse } from '../../api/posts';
import { fetchBoardAccess } from '../../api/boards';
import { useAuth } from '../../store/auth';
import { Avatar } from '../../components/Avatar'; // ✅ 아바타 컴포넌트 추가
// ✅ 타입 정의
type Post = {
  id: string;
  title: string;
  createdAt: string;
  author: string;
  commentCount: number;
};

type BoardInfo = {
  id: string;
  name: string;
  description: string;
};

type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

const PostList = () => {
  const { boardType } = useParams<{ boardType: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [boardInfo, setBoardInfo] = useState<BoardInfo | null>(null);
  
  // 서버 사이드 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [postsPerPage] = useState(10);
  
  // 검색 디바운싱을 위한 상태
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  const navigate = useNavigate();
  
  // 🔄 Zustand 스토어에서 사용자 정보 가져오기
  const { getUserRole } = useAuth();

  // 검색어 디바운싱 (500ms 지연) - 2자 이상일 때만
  useEffect(() => {
    const timer = setTimeout(() => {
      // 2자 이상일 때만 검색 실행
      if (searchTerm.length >= 2) {
        setDebouncedSearchTerm(searchTerm);
      } else {
        setDebouncedSearchTerm(''); // 2자 미만이면 검색 초기화
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 검색어 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // 날짜 포맷팅 함수
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
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
        month: 'short',
        day: 'numeric'
      });
    }
  }, []);

  // 이벤트 핸들러들
  const handlePostClick = useCallback((postId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (boardType) {
      const targetPath = `/dashboard/posts/${boardType}/${postId}`;
      navigate(targetPath);
    }
  }, [boardType, navigate]);

  const handleNewPost = useCallback((event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (boardType) {
      const targetPath = `/dashboard/posts/${boardType}/new`;
      navigate(targetPath);
    }
  }, [boardType, navigate]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // 기본값 설정 함수
  const setDefaultBoardInfo = useCallback((boardId: string) => {
    const defaultTitles: Record<string, string> = {
      notice: '공지사항',
      onboarding: '온보딩',
      shared: '공유 자료',
      internal: '내부 문서',
      free: '자유게시판'
    };
    
    setBoardInfo({
      id: boardId,
      name: defaultTitles[boardId] || boardId.charAt(0).toUpperCase() + boardId.slice(1),
      description: '게시글 목록을 확인하세요'
    });
  }, []);

  // ✅ 데이터 로딩 - 쿠키 기반 인증으로 수정
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!boardType) return;
      
      // 🔄 Zustand 스토어에서 사용자 역할 가져오기
      const userRole = getUserRole();
      if (!userRole) {
        console.log('❌ 사용자 역할 정보 없음');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(`🔍 PostList 권한 체크 시작: boardType=${boardType}, role=${userRole}`);

        // 1. 게시판 접근 권한 확인
        const accessRes = await fetchBoardAccess(boardType);
        console.log('🔍 PostList API 응답:', accessRes.data);
        
        const allowedRoles = accessRes.data.roles;
        const hasAccess = allowedRoles.some((roleObj: any) => roleObj.roleId === userRole);
        
        console.log(`🔍 권한 체크 결과: ${hasAccess ? '허용' : '거부'}`);

        if (!hasAccess) {
          console.warn(`❌ PostList에서 권한 없음 - unauthorized로 이동`);
          navigate('/unauthorized');
          return;
        }

        // 2. 게시판 정보 설정
        if (accessRes.data.boardName) {
          setBoardInfo({
            id: boardType,
            name: accessRes.data.boardName,
            description: accessRes.data.boardDescription || '게시글 목록을 확인하세요'
          });
          console.log('✅ 게시판 정보 설정:', accessRes.data.boardName);
        } else {
          console.log('⚠️ API 응답에 게시판 정보 없음, 기본값 사용');
          setDefaultBoardInfo(boardType);
        }

        // 3. 게시글 목록 가져오기 (서버 사이드 페이지네이션 및 검색)
        const postResponse: PostListResponse = await fetchPostsByType(boardType, {
          page: currentPage,
          limit: postsPerPage,
          search: debouncedSearchTerm
        });
        
        if (isMounted) {
          setPosts(postResponse.posts || []);
          setPagination(postResponse.pagination);
          console.log(`✅ 게시글 ${postResponse.posts?.length || 0}개 로드 완료`);
          console.log('✅ 페이지네이션 정보:', postResponse.pagination);
        }
      } catch (err: any) {
        console.error('게시글 불러오기 실패:', err);
        if (isMounted) {
          setError(err.response?.data?.message || err.message || '게시글을 불러오는 중 오류가 발생했습니다.');
          // 에러 발생 시 빈 상태로 설정
          setPosts([]);
          setPagination({
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 10,
            hasNextPage: false,
            hasPrevPage: false
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [boardType, getUserRole, navigate, setDefaultBoardInfo, currentPage, postsPerPage, debouncedSearchTerm]);

  // ✅ 페이지네이션 컴포넌트
  const Pagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      
      let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);
      
      if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-center gap-2 mt-8 pb-4">
        {/* 이전 페이지 */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!pagination.hasPrevPage}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="이전 페이지"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 첫 페이지 */}
        {getPageNumbers()[0] > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              1
            </button>
            {getPageNumbers()[0] > 2 && (
              <span className="px-2 py-2 text-sm text-gray-500">...</span>
            )}
          </>
        )}

        {/* 페이지 번호들 */}
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              currentPage === page
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
            aria-label={`${page}페이지로 이동`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

        {/* 마지막 페이지 */}
        {getPageNumbers()[getPageNumbers().length - 1] < pagination.totalPages && (
          <>
            {getPageNumbers()[getPageNumbers().length - 1] < pagination.totalPages - 1 && (
              <span className="px-2 py-2 text-sm text-gray-500">...</span>
            )}
            <button
              onClick={() => handlePageChange(pagination.totalPages)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {pagination.totalPages}
            </button>
          </>
        )}

        {/* 다음 페이지 */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!pagination.hasNextPage}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="다음 페이지"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  // ✅ 스켈레톤 로더 컴포넌트 - 컬럼 조정
  const SkeletonLoader = () => (
    <div className="divide-y divide-gray-200/30">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="px-8 py-6 animate-pulse">
          <div className="grid grid-cols-12 gap-6 items-center">
            <div className="col-span-8">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gray-200 rounded-full mt-3 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded-md w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded-md w-1/2"></div>
                </div>
              </div>
            </div>
            <div className="col-span-2 text-center">
              <div className="h-6 bg-gray-200 rounded-full w-16 mx-auto"></div>
            </div>
            <div className="col-span-2 text-center">
              <div className="h-4 bg-gray-200 rounded-md w-20 mx-auto"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // boardType이 없으면 에러 페이지 표시
  if (!boardType) {
    return (
      <div className="min-h-full bg-gradient-to-br from-gray-50/50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">잘못된 접근입니다</h3>
          <p className="text-gray-600">올바른 게시판을 선택해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50/50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* ✅ 헤더 섹션 */}
        <div className="mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {boardInfo?.name || '게시판'}
                    </h1>
                    <p className="text-xs text-gray-400 truncate">
                      {boardInfo?.description || '게시글 목록을 확인하세요'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">
                      총 {pagination?.totalCount || 0}개
                    </span>
                    {debouncedSearchTerm && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-sm text-blue-600 font-medium">
                          '{debouncedSearchTerm}' 검색 결과
                        </span>
                      </>
                    )}
                    {pagination && pagination.totalPages > 1 && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-sm text-purple-600 font-medium">
                          {pagination.currentPage}/{pagination.totalPages} 페이지
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleNewPost}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer"
                aria-label="새 글 작성하기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">새 글 작성</span>
                <span className="sm:hidden">작성</span>
              </button>
            </div>
          </div>
        </div>

        {/* ✅ 검색 및 필터 - X 버튼 제거, 입력 제한 추가 */}
        <div className="mb-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="검색어를 2자 이상 입력하세요... (최대 20자)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                maxLength={20}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200/50 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-200 bg-white/70 backdrop-blur-sm cursor-text placeholder:text-gray-400"
                aria-label="게시글 검색"
              />
              
              {/* 입력 글자수 표시 */}
              {searchTerm && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-gray-400">
                  {searchTerm.length}/20
                </div>
              )}
              
              {/* 검색 중 표시 */}
              {searchTerm !== debouncedSearchTerm && searchTerm.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 backdrop-blur-sm text-blue-700 text-sm py-2.5 px-3 rounded-xl border border-blue-200/50 shadow-lg transition-all duration-300 animate-in slide-in-from-top-2">
                  <div className="relative">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <div className="absolute inset-0 animate-ping opacity-20">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                    </div>
                  </div>
                  <span className="font-medium bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">검색 중</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              )}
              
              {/* 입력 안내 메시지 */}
              {searchTerm.length > 0 && searchTerm.length < 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-50/90 to-orange-50/90 backdrop-blur-sm text-amber-700 text-sm py-2 px-3 rounded-xl border border-amber-200/50 shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">검색어를 2자 이상 입력해주세요</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ 메인 콘텐츠 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
          {/* 스켈레톤 로더에서도 컬럼 조정 */}
          {loading && (
            <div>
              <div className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-200/50 px-8 py-4">
                <div className="grid grid-cols-12 gap-6 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  <div className="col-span-8">제목</div>
                  <div className="col-span-2 text-center">작성자</div>
                  <div className="col-span-2 text-center">작성일</div>
                </div>
              </div>
              <SkeletonLoader />
            </div>
          )}

          {/* 에러 상태 */}
          {error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3 text-red-700">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            </div>
          )}

          {/* 빈 상태 - 검색 관련 메시지 개선 */}
          {!loading && !error && posts.length === 0 && (
            <div className="text-center py-16">
              {debouncedSearchTerm ? (
                <div>
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
                  <p className="text-gray-600 mb-6">'{debouncedSearchTerm}'에 대한 결과를 찾을 수 없습니다.</p>
                  <p className="text-sm text-gray-500">다른 검색어를 입력하거나 검색어를 지워보세요.</p>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">아직 게시글이 없습니다</h3>
                  <p className="text-gray-600 mb-6">첫 번째 게시글을 작성해보세요.</p>
                  <button
                    onClick={handleNewPost}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    첫 글 작성하기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ✅ 게시글 목록 */}
          {!loading && !error && posts.length > 0 && (
            <div>
              {/* 테이블 헤더 - 댓글 컬럼 제거 */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200 px-8 py-4 sticky top-0 z-10">
                <div className="grid grid-cols-12 gap-6 text-sm font-bold text-gray-700 uppercase tracking-wide">
                  <div className="col-span-8">제목</div>
                  <div className="col-span-2 text-center">작성자</div>
                  <div className="col-span-2 text-center">작성일</div>
                </div>
              </div>

              {/* 게시글 목록 - 레이아웃 조정 */}
              <div className="divide-y divide-gray-200">
                {posts.map((post, index) => (
                  <div
                    key={post.id}
                    onClick={(e) => handlePostClick(post.id, e)}
                    className={`px-6 py-4 cursor-pointer transition-all duration-300 group border-l-4 border-l-transparent
                      ${index % 2 === 0 
                        ? 'bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50' 
                        : 'bg-gray-50 hover:bg-gradient-to-r hover:from-blue-100/50 hover:to-indigo-100/50'
                      } 
                      hover:border-l-blue-500 hover:shadow-md hover:scale-[1.01] focus-within:bg-blue-50 focus-within:border-l-blue-500 focus-within:shadow-lg`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePostClick(post.id);
                      }
                    }}
                    aria-label={`${post.title} 게시글 보기 - ${post.author} 작성${post.commentCount > 0 ? `, 댓글 ${post.commentCount}개` : ''}`}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* 제목 - 댓글 개수 포함 */}
                      <div className="col-span-8">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 group-hover:scale-125
                            ${index % 2 === 0 
                              ? 'bg-gradient-to-r from-blue-400 to-purple-400' 
                              : 'bg-gradient-to-r from-emerald-400 to-teal-400'
                            }`}></div>
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <h3 className="text-gray-900 font-semibold group-hover:text-blue-600 transition-colors text-base leading-snug truncate">
                              {post.title}
                            </h3>
                            
                            {/* 댓글 개수 - 0개가 아닐 때만 표시 */}
                            {post.commentCount > 0 && (
                              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {post.commentCount}
                              </span>
                            )}
                          </div>
                          
                          {/* 새 글 표시 */}
                          {(() => {
                            const postDate = new Date(post.createdAt);
                            const now = new Date();
                            const diffInDays = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24));
                            return diffInDays < 3 ? (
                              <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                                NEW
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      {/* 작성자 */}
                      <div className="col-span-2 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 group-hover:scale-105
                          ${index % 2 === 0 
                            ? 'bg-gray-100 text-gray-700 group-hover:bg-blue-100 group-hover:text-blue-700' 
                            : 'bg-white text-gray-700 group-hover:bg-blue-100 group-hover:text-blue-700'
                          }`}>
                          <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          <Avatar 
                          name={post.author} 
                          size="xs" 
                          variant="gradient"
                          />
                            
                          </div>
                          <span className="text-xs truncate max-w-16">{post.author}</span>
                        </div>
                      </div>
                      
                      {/* 작성일 */}
                      <div className="col-span-2 text-center">
                        <span className="text-gray-600 font-medium text-sm">
                          {formatDate(post.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ✅ 페이지네이션 */}
              <Pagination />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostList;