// server/src/scripts/migrate-data.ts
// 개발용 초기 데이터 생성 스크립트

import Board from '../models/Board';
import { Role } from '../models/Role';
import { User } from '../models/User';
import BoardAccess from '../models/BoardAccess';
import EventPermission from '../models/EventPermission';
import { hashPassword } from '../utils/hash';

// 마이그레이션 실행 여부 체크용
let migrationCompleted = false;

export const migrateData = async () => {
  if (migrationCompleted) {
    console.log('✅ 마이그레이션 이미 완료됨');
    return;
  }

  try {
    // 이미 기본 데이터가 있는지 확인
    const existingRoles = await Role.count();
    const existingBoards = await Board.count();
    const existingEventPermissions = await EventPermission.count();
    
    if (existingRoles > 0 && existingBoards > 0 && existingEventPermissions > 0) {
      console.log('✅ 기본 데이터가 이미 존재함 - 마이그레이션 스킵');
      migrationCompleted = true;
      return;
    }

    console.log('🔄 초기 데이터 생성 시작...');

    // 1. 기본 권한(Role) 데이터 생성
    console.log('📝 기본 권한 생성 중...');
    const defaultRoles = [
      { id: 'admin', name: '관리자', description: '관리자 그룹' },
      { id: 'group1', name: '그룹1', description: '일반 사용자 그룹1' },
      { id: 'group2', name: '그룹2', description: '일반 사용자 그룹2' },
    ];

    for (const roleData of defaultRoles) {
      const [role, created] = await Role.findOrCreate({
        where: { id: roleData.id },
        defaults: {
          ...roleData,
          isActive: true
        },
      });
      if (created) {
        console.log(`   ➕ 권한 생성: ${roleData.name}`);
      }
    }

    // 2. Admin 계정 생성 (admin 권한이 없을 경우에만)
    console.log('👑 Admin 계정 확인 중...');
    const existingAdmin = await User.findOne({
      where: { roleId: 'admin' }
    });

    if (!existingAdmin) {
      const adminUser = await User.create({
        id: 'admin',
        password: hashPassword('1234'),
        name: '관리자',
        roleId: 'admin'
      });
      console.log('   ➕ Admin 계정 생성 완료');
      console.log('   📋 Admin 로그인 정보:');
      console.log('      🆔 아이디: admin');
      console.log('      🔑 비밀번호: 1234');
      console.log('      ⚠️  보안을 위해 최초 로그인 후 비밀번호를 변경하세요!');
    } else {
      console.log('   ✅ Admin 계정이 이미 존재함');
    }

    // 3. 기본 게시판(Board) 데이터 생성 - 🔧 admin 게시판 추가
    console.log('📝 기본 게시판 생성 중...');
    const defaultBoards = [
      { id: 'notice', name: '공지사항', description: '공지사항 게시판', order: 0 },
      { id: 'general', name: '공통게시판', description: '공통 게시판', order: 1 },
      { id: 'free', name: '자유게시판', description: '자유 게시판', order: 2 },
      { id: 'admin', name: '관리자게시판', description: '관리자 전용 게시판', order: 10 }, // ✅ 추가
    ];

    for (const boardData of defaultBoards) {
      const [board, created] = await Board.findOrCreate({
        where: { id: boardData.id },
        defaults: {
          ...boardData,
          isActive: true
        },
      });
      if (created) {
        console.log(`   ➕ 게시판 생성: ${boardData.name}`);
      }
    }

    // 4. 기본 게시판 권한 설정 - 🔧 free 게시판 권한 추가
    console.log('📝 기본 게시판 권한 설정 중...');
    const defaultBoardPermissions = [
      // 공지사항: 관리자만 쓰기, 모든 그룹 읽기
      { boardId: 'notice', roleId: 'admin', canRead: true, canWrite: true, canDelete: true },
      { boardId: 'notice', roleId: 'group1', canRead: true, canWrite: false, canDelete: false },
      { boardId: 'notice', roleId: 'group2', canRead: true, canWrite: false, canDelete: false },

      // 일반 게시판: 모든 그룹 읽기/쓰기 가능
      { boardId: 'general', roleId: 'admin', canRead: true, canWrite: true, canDelete: true },
      { boardId: 'general', roleId: 'group1', canRead: true, canWrite: true, canDelete: false },
      { boardId: 'general', roleId: 'group2', canRead: true, canWrite: true, canDelete: false },

      // ✅ 자유게시판: 모든 그룹 읽기/쓰기 가능
      { boardId: 'free', roleId: 'admin', canRead: true, canWrite: true, canDelete: true },
      { boardId: 'free', roleId: 'group1', canRead: true, canWrite: true, canDelete: false },
      { boardId: 'free', roleId: 'group2', canRead: true, canWrite: true, canDelete: false },

      // 관리자 게시판: 관리자만 접근
      { boardId: 'admin', roleId: 'admin', canRead: true, canWrite: true, canDelete: true },
    ];

    for (const permission of defaultBoardPermissions) {
      const [access, created] = await BoardAccess.findOrCreate({
        where: {
          boardId: permission.boardId,
          roleId: permission.roleId,
        },
        defaults: permission,
      });
      
      if (created) {
        console.log(`   ➕ 게시판 권한: ${permission.boardId} - ${permission.roleId}`);
      }
    }

    // 5. 기본 이벤트 권한 설정
    console.log('📅 기본 이벤트 권한 설정 중...');
    const defaultEventPermissions = [
      // 관리자: 모든 권한
      { 
        roleId: 'admin', 
        canCreate: true, 
        canRead: true, 
        canUpdate: true,
        canDelete: true
      },
      // 그룹1: 생성/조회만 가능 (본인 이벤트만 수정/삭제)
      { 
        roleId: 'group1', 
        canCreate: true, 
        canRead: true, 
        canUpdate: false,
        canDelete: false
      },
      // 그룹2: 생성/조회만 가능 (본인 이벤트만 수정/삭제)
      { 
        roleId: 'group2', 
        canCreate: true, 
        canRead: true, 
        canUpdate: false,
        canDelete: false
      },
    ];

    for (const eventPermission of defaultEventPermissions) {
      const [permission, created] = await EventPermission.findOrCreate({
        where: { roleId: eventPermission.roleId },
        defaults: eventPermission,
      });
      
      if (created) {
        console.log(`   ➕ 이벤트 권한: ${eventPermission.roleId} - 생성:${eventPermission.canCreate}, 조회:${eventPermission.canRead}, 수정:${eventPermission.canUpdate}, 삭제:${eventPermission.canDelete}`);
      }
    }

    migrationCompleted = true;
    console.log('✅ 초기 데이터 생성 완료!');
    console.log('');
    console.log('📋 생성된 기본 게시판:');
    console.log('   📢 공지사항 (notice): 관리자만 작성 가능');
    console.log('   📝 공통게시판 (general): 모든 그룹 읽기/쓰기 가능');
    console.log('   💬 자유게시판 (free): 모든 그룹 읽기/쓰기 가능');
    console.log('   🔒 관리자게시판 (admin): 관리자만 접근 가능');
    console.log('');
    console.log('🔐 기본 관리자 계정:');
    console.log('   🆔 아이디: admin');
    console.log('   🔑 비밀번호: 1234');
    console.log('   ⚠️  반드시 최초 로그인 후 비밀번호를 변경하세요!');
    console.log('');
    
  } catch (error) {
    console.error('❌ 초기 데이터 생성 실패:', error);
    throw error;
  }
};

// 개발 환경에서만 실행하거나 환경변수로 제어
export const runMigrationIfNeeded = async () => {
  if (process.env.SKIP_MIGRATION === 'true') {
    console.log('⏭️ SKIP_MIGRATION=true 설정으로 마이그레이션 스킵');
    return;
  }

  const shouldRunMigration = 
    process.env.NODE_ENV === 'development' || 
    process.env.RUN_MIGRATION === 'true' ||
    process.env.NODE_ENV !== 'production';

  if (shouldRunMigration) {
    await migrateData();
  } else {
    console.log('⏭️ 마이그레이션 스킵 (운영환경 또는 RUN_MIGRATION=false)');
  }
};