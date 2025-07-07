import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../api/axios';
import { useAuth } from '../../store/auth';
import { Avatar } from '../../components/Avatar'; // ✅ 컴포넌트에서 import

type Comment = {
  id: number;
  content: string;
  createdAt: string;
  UserId: string;
  User?: {
    name: string;
  };
  user?: {
    id: string;
    name: string;
  };
};

interface CommentSectionProps {
  postId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
  const { boardType } = useParams<{ boardType: string }>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ✅ 쿠키 기반 인증으로 변경
  const { isAuthenticated, getUserId, getUserRole, isAdmin } = useAuth();
  const currentUserId = getUserId();
  const currentUserRole = getUserRole();

  // PostDetail과 동일한 formatDate 함수
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

  const fetchComments = useCallback(async () => {
    if (!boardType) return;
    
    setLoading(true);
    setError('');
    try {
      // ✅ 쿠키 기반 API 호출 (헤더 불필요)
      const res = await axios.get(`/comments/${boardType}/${postId}`);
      setComments(res.data);
    } catch (err: any) {
      console.error('댓글 불러오기 실패:', err);
      setError(err.message || '댓글을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [postId, boardType]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !boardType) return;

    setSubmitting(true);
    try {
      // ✅ 쿠키 기반 API 호출
      await axios.post(`/comments/${boardType}/${postId}`, { content: newComment });
      setNewComment('');
      await fetchComments();
    } catch (err: any) {
      console.error('댓글 작성 실패:', err);
      alert(err.message || '댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('정말 삭제하시겠습니까?') || !boardType) return;

    try {
      // ✅ 쿠키 기반 API 호출
      await axios.delete(`/comments/${boardType}/${commentId}`);
      await fetchComments();
    } catch (err: any) {
      console.error('댓글 삭제 실패:', err);
      alert(err.message || '댓글 삭제에 실패했습니다.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (postId && boardType) fetchComments();
  }, [postId, boardType, fetchComments]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* 스켈레톤 로더 */}
        {[1, 2, 3].map((index) => (
          <div key={index} className="animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">댓글을 불러올 수 없습니다</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchComments}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 댓글 목록 */}
      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isOwner = currentUserId === comment.UserId;
            const canDelete = isAdmin() || isOwner; // ✅ isAdmin() 함수 사용
            const userName = comment.user?.name || comment.User?.name || comment.UserId;

            return (
              <div key={comment.id} className="group">
                <div className="flex items-start gap-3">
                  {/* ✅ 아바타 컴포넌트 사용 - PostDetail과 동일한 스타일 */}
                  <Avatar 
                    name={userName} 
                    size="md" 
                    variant="gradient"
                    className="flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    {/* 사용자 정보 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{userName}</div>
                          <div className="text-xs text-gray-500">{formatDate(comment.createdAt)}</div>
                        </div>
                      </div>
                      
                      {/* 삭제 버튼 - PostDetail과 동일한 스타일 */}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="flex items-center gap-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium opacity-0 group-hover:opacity-100 border-0 outline-none focus:outline-none focus:opacity-100"
                          title="댓글 삭제"
                          aria-label="댓글 삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                          삭제
                        </button>
                      )}
                    </div>
                    
                    {/* 댓글 내용 - PostDetail의 본문과 유사한 스타일 */}
                    <div className="bg-gray-50/80 rounded-xl px-4 py-3 border border-gray-100">
                      <p className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 댓글 작성 폼 */}
      {isAuthenticated ? (
        <div className="border-t border-gray-200 pt-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
              <h3 className="font-medium text-gray-900">댓글 작성</h3>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">힘이 됩니다!</span>
            </div>
            
            <div className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 transition-all duration-200 box-border"
                rows={3}
                placeholder="댓글을 입력하세요... (Shift + Enter로 줄바꿈, Enter로 전송)"
                disabled={submitting}
              />
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {newComment.length}/1000자
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || submitting}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none border-0 outline-none focus:outline-none"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
                      작성 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                      댓글 작성
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-200 pt-4">
          <div className="bg-gradient-to-r from-gray-50 to-gray-50/80 rounded-xl p-4 text-center border border-gray-200">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</h3>
            <p className="text-gray-600">댓글을 작성하려면 로그인해주세요</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection;