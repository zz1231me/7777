// src/pages/boards/PostEditor.tsx - 기존 API 형식 유지하면서 삭제 기능 수정
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Editor } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/toastui-editor-viewer.css';
import '@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight.css';
import '@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css';
import '@toast-ui/editor-plugin-table-merged-cell/dist/toastui-editor-plugin-table-merged-cell.css';
import '@toast-ui/editor/dist/i18n/ko-kr';
import 'prismjs/themes/prism.css';
import Prism from 'prismjs';

import codeSyntaxHighlight from '@toast-ui/editor-plugin-code-syntax-highlight';
import chart from '@toast-ui/editor-plugin-chart';
import "tui-color-picker/dist/tui-color-picker.css";
import "@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css";
import colorSyntax from '@toast-ui/editor-plugin-color-syntax';
import tableMergedCell from '@toast-ui/editor-plugin-table-merged-cell';
import uml from '@toast-ui/editor-plugin-uml';

import { fetchPostById, createPost, updatePost, formatFileSize, getFileType } from '../../api/posts';
import api from '../../api/axios';
import './ToastEditorCustom.css';

type Props = {
  mode: 'create' | 'edit';
};

const PostEditor = ({ mode }: Props) => {
  const { id, boardType } = useParams<{ id: string; boardType: string }>();
  const navigate = useNavigate();
  const editorRef = useRef<Editor>(null);

  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  
  // ✅ 기존 첨부파일 관리를 단순화
  const [existingAttachments, setExistingAttachments] = useState<Array<{
    url: string;
    originalName: string;
    storedName: string;
    size?: number;
    mimeType?: string;
  }>>([]);
  
  // ✅ 삭제된 파일들의 storedName을 추적
  const [deletedFileNames, setDeletedFileNames] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);

  const MAX_TITLE_LENGTH = 40;
  const MAX_FILES = 3;
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  
  const colorSyntaxOptions = {
    preset: [
      "#333333", "#666666", "#FFFFFF", "#EE2323", "#F89009", "#009A87", "#006DD7", "#8A3DB6",
      "#781B33", "#5733B1", "#953B34", "#FFC1C8", "#FFC9AF", "#9FEEC3", "#99CEFA", "#C1BEF9",
    ],
  };

  // ✅ 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    let isMounted = true;

    if (mode === 'edit' && id && boardType) {
      const fetchData = async () => {
        try {
          const post = await fetchPostById(boardType, id);
          if (isMounted) {
            setTitle(post.title);
            editorRef.current?.getInstance()?.setMarkdown(post.content || '');
            
            if (post.attachments && post.attachments.length > 0) {
              console.log('📤 받은 첨부파일 정보:', post.attachments);
              setExistingAttachments(post.attachments);
              // 삭제된 파일 목록 초기화
              setDeletedFileNames([]);
            }
          }
        } catch (err) {
          console.error('게시글 불러오기 실패:', err);
          alert('글을 불러오는 데 실패했습니다.');
        }
      };
      fetchData();
    }

    return () => {
      isMounted = false;
    };
  }, [mode, id, boardType]);

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!boardType) {
      alert('게시판 유형이 없습니다.');
      return;
    }

    const content = editorRef.current?.getInstance()?.getMarkdown() || '';
    
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`파일 크기는 100MB를 초과할 수 없습니다.\n초과 파일: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    const totalFiles = existingAttachments.length + files.length;
    if (totalFiles > MAX_FILES) {
      alert(`최대 ${MAX_FILES}개의 파일만 첨부할 수 있습니다.\n현재: ${totalFiles}개`);
      return;
    }
    
    try {
      setLoading(true);

      if (mode === 'edit' && id) {
        // ✅ 기존 API 형식 유지 + 삭제된 파일명 추가
        const updateData = {
          title,
          content,
          files,                    // 새로 추가된 파일들
          keepExistingFiles: true,   // 항상 true로 설정
          deletedFileNames          // 삭제된 파일들의 storedName 목록
        };
        
        console.log('🚀 서버로 전송되는 데이터:', {
          title,
          content,
          newFilesCount: files.length,
          existingFilesCount: existingAttachments.length,
          deletedFileNames
        });
        
        await updatePost(boardType, id, updateData);
        alert('수정 완료');
        navigate(`/dashboard/posts/${boardType}/${id}`);
      } else if (mode === 'create') {
        await createPost({ title, content, boardType, files });
        alert('작성 완료');
        navigate(`/dashboard/posts/${boardType}`);
      }
    } catch (err: any) {
      console.error('저장 실패:', err);
      alert(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 에디터 내 이미지 업로드 처리
  const handleImageUpload = async (
    blob: Blob,
    callback: (url: string, alt: string) => void
  ) => {
    try {
      const formData = new FormData();
      formData.append('image', blob);

      const res = await api.post('/uploads/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = res.data;
      callback(data.imageUrl, '업로드된 이미지');
    } catch (err: any) {
      console.error('이미지 업로드 실패:', err);
      alert('이미지 업로드에 실패했습니다.');
    }
  };

  // 제목 변경 핸들러
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_TITLE_LENGTH) {
      setTitle(value);
    }
  };

  // 파일 선택 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`파일 크기는 100MB를 초과할 수 없습니다.\n초과 파일: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    const totalFiles = existingAttachments.length + files.length + selectedFiles.length;
    if (totalFiles > MAX_FILES) {
      alert(`최대 ${MAX_FILES}개의 파일만 첨부할 수 있습니다.`);
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);
    e.target.value = '';
  };

  // ✅ 새 파일 제거
  const removeFile = useCallback((index: number) => {
    console.log('🗑️ 새 파일 삭제 시도:', index, files[index]?.name);
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      console.log('🗑️ 삭제 후 새 파일 목록:', newFiles.map(f => f.name));
      return newFiles;
    });
  }, [files]);

  // ✅ 기존 첨부파일 제거 - 삭제된 파일명 추적
  const removeExistingFile = useCallback((index: number) => {
    const fileToRemove = existingAttachments[index];
    console.log('🗑️ 기존 파일 삭제 시도:', index, fileToRemove?.originalName);
    
    if (fileToRemove) {
      // 삭제된 파일명을 추적 목록에 추가
      setDeletedFileNames(prev => {
        const newDeletedNames = [...prev, fileToRemove.storedName];
        console.log('🗑️ 삭제된 파일명 목록:', newDeletedNames);
        return newDeletedNames;
      });

      // UI에서 파일 제거
      setExistingAttachments(prev => {
        const newAttachments = prev.filter((_, i) => i !== index);
        console.log('🗑️ 삭제 후 기존 파일 목록:', newAttachments.map(f => f.originalName));
        return newAttachments;
      });
    }
  }, [existingAttachments]);

  // 파일 아이콘 컴포넌트
  const FileIcon = ({ type, className = "w-5 h-5" }: { type: string; className?: string }) => {
    const iconProps = { 
      className, 
      fill: "none", 
      stroke: "currentColor", 
      viewBox: "0 0 24 24",
      strokeWidth: 2,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const
    };
    
    switch (type) {
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
  };

  const isEditMode = mode === 'edit';
  const submitButtonText = isEditMode ? '✨ 수정하기' : '🚀 작성하기';

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50/50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-8 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 제목 입력 섹션 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200/50">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-white text-lg">✏️</span>
                  </div>
                  <label htmlFor="title" className="text-xl font-bold text-gray-800">
                    제목
                  </label>
                </div>
                
                <div className="relative">
                  <input
                    id="title"
                    type="text"
                    className="block w-full bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-4 pr-16 rounded-xl shadow-sm text-lg font-medium text-gray-800 placeholder-gray-500 transition-all duration-300 hover:shadow-md focus:shadow-lg hover:from-purple-50 hover:to-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200 box-border"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="멋진 제목을 입력해주세요..."
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 font-medium pointer-events-none">
                    {title.length}/{MAX_TITLE_LENGTH}
                  </div>
                </div>
              </div>
            </div>

            {/* 에디터 섹션 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200/50">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-lg">📝</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">내용 작성</h3>
              </div>
              <div className="rounded-xl overflow-hidden shadow-inner border border-gray-200">
                <Editor
                  ref={editorRef}
                  previewStyle="vertical"
                  height="600px"
                  initialEditType="wysiwyg"
                  useCommandShortcut={true}
                  language="ko-KR"
                  hooks={{ addImageBlobHook: handleImageUpload }}
                  plugins={[
                    [codeSyntaxHighlight, { highlighter: Prism }],
                    [colorSyntax, colorSyntaxOptions],
                    tableMergedCell,
                    chart,
                    uml
                  ]}
                  toolbarItems={[
                    ['heading', 'bold', 'italic', 'strike'],
                    ['hr', 'quote'],
                    ['ul', 'ol', 'task'],
                    ['table', 'link', 'image', 'code', 'codeblock'],
                  ]}
                />
              </div>
            </div>

            {/* 첨부파일 섹션 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200/50">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-lg">📎</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  첨부파일 
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (최대 {MAX_FILES}개, 각 100MB 이하)
                  </span>
                </h3>
              </div>
              
              <div className="space-y-6">
                {/* ✅ 기존 첨부파일 표시 */}
                {isEditMode && existingAttachments.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">
                      기존 첨부파일 
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({existingAttachments.length}개)
                      </span>
                    </h4>
                    
                    <div className="space-y-2">
                      {existingAttachments.map((fileInfo, index) => {
                        const displayName = fileInfo.originalName || '파일명 없음';
                        const fileType = getFileType(displayName);
                        
                        return (
                          <div 
                            key={`existing-${fileInfo.storedName}-${index}`} 
                            className="flex items-center justify-between p-4 rounded-xl border bg-green-50 border-green-200 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                                <FileIcon type={fileType} className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900" title={displayName}>
                                  {displayName}
                                </div>
                                <div className="text-xs text-gray-500 capitalize">
                                  {fileType} 파일
                                  {fileInfo.size && ` • ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB`}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                console.log('🗑️ 기존 파일 삭제 버튼 클릭:', index, displayName, fileInfo.storedName);
                                removeExistingFile(index);
                              }}
                              className="w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-all text-xs font-bold"
                              title="파일 제거"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ✅ 새로 선택된 파일 목록 */}
                {files.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">
                      새로 선택된 파일 
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({files.length}개)
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {files.map((file, index) => {
                        const fileType = getFileType(file.name);
                        
                        return (
                          <div 
                            key={`new-${file.name}-${file.size}-${index}`} 
                            className="flex items-center justify-between bg-blue-50 border border-blue-200 p-4 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                                <FileIcon type={fileType} className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900" title={file.name}>
                                  {file.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatFileSize(file.size)} • {fileType} 파일
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                console.log('🗑️ 새 파일 삭제 버튼 클릭:', index, file.name);
                                removeFile(index);
                              }}
                              className="w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-all text-xs font-bold"
                              title="파일 제거"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 파일 업로드 영역 */}
                <div className="relative">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl px-6 py-8 text-center cursor-pointer hover:from-blue-50 hover:to-purple-50 transition-all duration-300 group border-2 border-dashed border-gray-300 hover:border-blue-400">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 group-hover:from-purple-500 group-hover:to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 shadow-lg">
                      <span className="text-white text-2xl">📁</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-700 group-hover:text-blue-700 transition-colors mb-2">
                      파일 선택하기
                    </p>
                    <p className="text-sm text-gray-500">
                      클릭하거나 파일을 드래그해서 업로드하세요<br />
                      현재: {existingAttachments.length + files.length}/{MAX_FILES}개
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 버튼 섹션 */}
            <div className="flex justify-end gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-10 py-4 rounded-2xl text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 font-bold transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-10 py-4 rounded-2xl text-white font-bold shadow-xl transition-all duration-300 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-blue-600 hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105'
                }`}
              >
                {loading ? '처리 중...' : submitButtonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostEditor;