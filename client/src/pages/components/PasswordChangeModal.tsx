import React, { useState, useEffect, useRef } from 'react';
import { changePassword } from '../../api/auth'; // ✅ 쿠키 기반 API 사용

function PasswordChangeModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);

  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  // 컴포넌트 마운트 시 모든 필드 초기화
  useEffect(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setErrorField(null);
  }, []);

  const showError = (message: string, field?: string) => {
    setError(message);
    setSuccess('');
    setErrorField(field || null);
    
    if (field === 'current') currentRef.current?.focus();
    else if (field === 'new') newRef.current?.focus();
    else if (field === 'confirm') confirmRef.current?.focus();
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setErrorField(null);

    if (!currentPassword) return showError('현재 비밀번호를 입력해주세요.', 'current');
    if (!newPassword) return showError('새 비밀번호를 입력해주세요.', 'new');
    if (newPassword.length < 6) return showError('새 비밀번호는 6자 이상이어야 합니다.', 'new'); // ✅ 서버와 일치
    if (!confirmPassword) return showError('새 비밀번호 확인을 입력해주세요.', 'confirm');
    if (newPassword !== confirmPassword) return showError('새 비밀번호가 일치하지 않습니다.', 'confirm');

    setIsLoading(true);

    try {
      // ✅ 쿠키 기반 API 사용
      await changePassword(currentPassword, newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorField(null);
      setSuccess('비밀번호가 성공적으로 변경되었습니다.');
      
      console.log('✅ 비밀번호 변경 성공');
      
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (err: any) {
      console.error('❌ 비밀번호 변경 실패:', err);
      
      const errorMessage = err.message || '비밀번호 변경에 실패했습니다.';
      
      if (errorMessage.includes('현재 비밀번호')) {
        showError(errorMessage, 'current');
      } else {
        showError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getInputClassName = (field: string) => {
    const baseClass = `w-full px-4 py-3 text-sm border rounded-lg 
      focus:outline-none focus:ring-2 focus:border-blue-500
      transition-all duration-200 bg-white box-border`;
    
    if (errorField === field) {
      return `${baseClass} border-red-400 focus:ring-red-200 bg-red-50`;
    }
    
    return `${baseClass} border-gray-300 focus:ring-blue-200 hover:border-gray-400`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: '320px', maxWidth: '400px' }}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">비밀번호 변경</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg p-2 transition-all"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* ✅ 보안 강화 표시 추가 */}
          <p className="text-xs text-blue-600 mt-2">🔒 보안 인증</p>
        </div>

        {/* 본문 */}
        <div className="px-6 py-6">
          {/* 알림 메시지 */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-5 p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
              <div className="flex">
                <svg className="w-5 h-5 text-green-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          {/* 입력 폼 */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                현재 비밀번호
              </label>
              <input
                ref={currentRef}
                type="password"
                placeholder="현재 비밀번호를 입력하세요"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className={getInputClassName('current')}
                disabled={isLoading}
                autoComplete="current-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                새 비밀번호
              </label>
              <input
                ref={newRef}
                type="password"
                placeholder="새 비밀번호 (6자 이상)" // ✅ 서버 요구사항과 일치
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className={getInputClassName('new')}
                disabled={isLoading}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                새 비밀번호 확인
              </label>
              <input
                ref={confirmRef}
                type="password"
                placeholder="새 비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className={getInputClassName('confirm')}
                disabled={isLoading}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 
                rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                transition-all duration-200"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-blue-600 border border-transparent 
                rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 
                flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                  </svg>
                  변경 중...
                </>
              ) : (
                '비밀번호 변경'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PasswordChangeModal;