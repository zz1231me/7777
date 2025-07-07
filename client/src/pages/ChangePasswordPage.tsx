// src/pages/ChangePasswordPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PasswordChangeModal from './components/PasswordChangeModal';

function ChangePasswordPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    // 이전 페이지로 돌아가거나 캘린더 페이지로 이동
    navigate('/dashboard/calendar');
  };

  return (
    <PasswordChangeModal onClose={handleClose} />
  );
}

export default ChangePasswordPage;