// src/api/boards.ts
import api from './axios';

// 기존 단일 게시판 접근 권한 조회
export const fetchBoardAccess = (boardType: string) => {
  return api.get(`/boards/access/${boardType}`);
};

// ✅ 기존: 전체 게시판 + 권한 목록 조회 (구버전)
export const fetchAllBoardAccess = () => {
  return api.get('/boards/access');
};

// ✅ 새로운: 사용자가 접근 가능한 게시판 목록 조회
export const fetchUserAccessibleBoards = () => {
  return api.get('/boards/accessible');
};