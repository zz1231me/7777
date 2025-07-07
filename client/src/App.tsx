// src/App.tsx
// Toast UI + Prism CSS 전역 import (⚠️ 순서 중요)
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/toastui-editor-viewer.css';
import '@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight.css';
import '@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css';
import '@toast-ui/editor-plugin-table-merged-cell/dist/toastui-editor-plugin-table-merged-cell.css';
import 'prismjs/themes/prism.css';

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import BoardProtectedRoute from './components/BoardProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import Unauthorized from './pages/Unauthorized';
import PostList from './pages/boards/PostList';
import PostDetail from './pages/boards/PostDetail';
import PostEditor from './pages/boards/PostEditor';
import MyTUICalendar from './pages/components/MyTUICalendar';
import AdminUserPage from './pages/AdminUserPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인 페이지 */}
        <Route path="/" element={<Login />} />
        
        {/* 권한 없음 안내 페이지 */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        {/* ✅ 보호된 경로: 대시보드 및 하위 페이지들 */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          {/* ✅ 기본 대시보드 경로 - 캘린더로 리다이렉트 */}
          <Route index element={<Navigate to="calendar" replace />} />
          
          {/* 주요 화면 라우팅 */}
          <Route path="calendar" element={<MyTUICalendar />} />
          
          {/* ✅ 관리자 전용 라우트 */}
          <Route 
            path="admin" 
            element={
              <RoleProtectedRoute allowedRoles={['admin']}>
                <AdminUserPage />
              </RoleProtectedRoute>
            } 
          />
          
          <Route path="change-password" element={<ChangePasswordPage />} />
          
          {/* ✅ 게시글 관련 - 권한 보호됨 */}
          <Route 
            path="posts/:boardType/new" 
            element={
              <BoardProtectedRoute action="write">
                <PostEditor mode="create" />
              </BoardProtectedRoute>
            } 
          />
          
          <Route 
            path="posts/:boardType/edit/:id" 
            element={
              <BoardProtectedRoute action="write">
                <PostEditor mode="edit" />
              </BoardProtectedRoute>
            } 
          />
          
          <Route 
            path="posts/:boardType/:id" 
            element={
              <BoardProtectedRoute action="read">
                <PostDetail />
              </BoardProtectedRoute>
            } 
          />
          
          <Route 
            path="posts/:boardType" 
            element={
              <BoardProtectedRoute action="read">
                <PostList />
              </BoardProtectedRoute>
            } 
          />
        </Route>
        
        {/* ✅ 404 페이지 - 가장 마지막에 배치 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;