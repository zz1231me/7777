import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UnauthorizedRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/'); // 또는 '/top' 등 원하는 경로로
    }, 2000);

    return () => clearTimeout(timer); // cleanup
  }, [navigate]);

  return (
<div
  style={{
    backgroundColor: '#fff0f0',
    border: '2px solid #ff3b3b',
    color: '#990000',
    padding: '40px 30px',
    borderRadius: '18px',
    maxWidth: '520px',
    margin: '100px auto',
    textAlign: 'center',
    fontSize: '18px',
    fontWeight: 500,
    boxShadow: '0 8px 24px rgba(255, 0, 0, 0.25)',
    lineHeight: '1.8',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  }}
>
  <div style={{ fontSize: '36px', marginBottom: '16px' }}>🚫 ACCESS DENIED</div>
  <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '10px' }}>
    권한이 없습니다
  </div>
  <div style={{ fontSize: '16px', color: '#661111' }}>
    이 페이지에 접근할 수 있는 권한이 없습니다.
  </div>
</div>



  );
};

export default UnauthorizedRedirect;
