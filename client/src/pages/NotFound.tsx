import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Comic Sans MS, sans-serif',
        color: '#333',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ fontSize: '6rem', fontWeight: 'bold', marginBottom: '1rem', animation: 'wiggle 1.5s infinite' }}>
        4<span style={{ color: '#ff6b6b' }}>😵</span>4
      </div>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>어이쿠! 길을 잃었어요...</h1>

      <p style={{ fontSize: '1rem', marginBottom: '2rem', maxWidth: '360px' }}>
        요청하신 페이지는 존재하지 않거나 사라졌습니다. <br />
        당황하지 마세요! 버튼을 눌러 안전하게 돌아가요. 🧭
      </p>

      <button
        onClick={() => navigate('/')}
        style={{
          backgroundColor: '#7f5af0',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1.0)')}
      >
        🏠 홈으로 가기
      </button>

      {/* 간단한 wiggle 애니메이션 정의 */}
      <style>
        {`
          @keyframes wiggle {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(-10deg); }
            50% { transform: rotate(10deg); }
            75% { transform: rotate(-5deg); }
            100% { transform: rotate(0deg); }
          }
        `}
      </style>
    </div>
  );
};

export default NotFound;
