// client/src/api/auth.ts

// 🔐 로그인 - 쿠키 기반
export async function login(id: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id, password }),
    credentials: 'include' // ✅ 쿠키 포함
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || '로그인 실패');
  }

  return res.json();
}

// 🚪 로그아웃 - 쿠키 삭제
export async function logout() {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });

  if (!res.ok) {
    throw new Error('로그아웃 실패');
  }

  return res.json();
}

// 👤 현재 사용자 정보 조회
export async function getCurrentUser() {
  const res = await fetch('/api/auth/me', {
    credentials: 'include'
  });

  if (!res.ok) {
    throw new Error('사용자 정보 조회 실패');
  }

  return res.json();
}

// 🔄 토큰 갱신
export async function refreshToken() {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include'
  });

  if (!res.ok) {
    throw new Error('토큰 갱신 실패');
  }

  return res.json();
}

// 🔒 비밀번호 변경
export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ currentPassword, newPassword }),
    credentials: 'include'
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || '비밀번호 변경 실패');
  }

  return res.json();
}

// 🔍 사용자 권한 조회
export async function getUserPermissions() {
  const res = await fetch('/api/auth/permissions', {
    credentials: 'include'
  });

  if (!res.ok) {
    throw new Error('권한 조회 실패');
  }

  return res.json();
}

// 👤 회원가입 (공개 API - 쿠키 불필요)
export async function register(id: string, password: string, name: string, role: string) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id, password, name, role })
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || '회원가입 실패');
  }

  return res.json();
}