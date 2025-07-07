// client/src/utils/avatarUtils.ts - 순수 유틸리티 함수만 포함
/**
 * 사용자 이름을 기반으로 아바타 정보를 생성하는 유틸리티
 */

// 사용 가능한 그라디언트 색상 배열
const GRADIENT_COLORS = [
  'from-emerald-500 to-teal-500',
  'from-blue-500 to-cyan-500', 
  'from-purple-500 to-pink-500',
  'from-orange-500 to-red-500',
  'from-green-500 to-lime-500',
  'from-indigo-500 to-purple-500',
  'from-pink-500 to-rose-500',
  'from-yellow-500 to-orange-500',
  'from-teal-500 to-green-500',
  'from-cyan-500 to-blue-500',
  'from-violet-500 to-purple-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-yellow-500',
  'from-lime-500 to-green-500',
  'from-sky-500 to-blue-500',
  'from-red-500 to-rose-500'
] as const;

// 배경색만 있는 단색 배열 (더 부드러운 색상)
const SOLID_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-green-500',
  'bg-indigo-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-lime-500',
  'bg-sky-500',
  'bg-red-500'
] as const;

/**
 * 크기별 클래스 매핑
 */
const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl'
} as const;

/**
 * 문자열에서 해시값을 생성
 */
export const generateHash = (str: string): number => {
  if (!str) return 0;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32비트 정수로 변환
  }
  return Math.abs(hash);
};

/**
 * 사용자 이름에서 첫 글자 추출 (한글/영문 모두 지원)
 */
export const getInitial = (name: string): string => {
  if (!name || typeof name !== 'string') return '?';
  
  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';
  
  // 첫 번째 문자 반환 (한글, 영문, 숫자 모두 지원)
  return trimmed.charAt(0).toUpperCase();
};

/**
 * 사용자 이름을 기반으로 그라디언트 색상 클래스 생성
 */
export const getGradientColors = (name: string): string => {
  const hash = generateHash(name);
  return GRADIENT_COLORS[hash % GRADIENT_COLORS.length];
};

/**
 * 사용자 이름을 기반으로 단색 배경 클래스 생성
 */
export const getSolidColor = (name: string): string => {
  const hash = generateHash(name);
  return SOLID_COLORS[hash % SOLID_COLORS.length];
};

/**
 * 크기에 해당하는 CSS 클래스 반환
 */
export const getSizeClasses = (size: keyof typeof SIZE_CLASSES = 'md'): string => {
  return SIZE_CLASSES[size];
};

/**
 * 아바타 정보를 반환하는 헬퍼 함수
 */
export const getAvatarInfo = (name: string, size: keyof typeof SIZE_CLASSES = 'md', variant: 'gradient' | 'solid' = 'gradient') => {
  const initial = getInitial(name);
  const colorClass = variant === 'gradient' 
    ? `bg-gradient-to-br ${getGradientColors(name)}` 
    : getSolidColor(name);
  const sizeClass = getSizeClasses(size);
  
  return {
    initial,
    gradientColors: getGradientColors(name),
    solidColor: getSolidColor(name),
    hash: generateHash(name),
    className: `${sizeClass} ${colorClass} rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0`
  };
};

/**
 * 미리 정의된 아바타 스타일 (특별한 사용자용)
 */
export const SPECIAL_AVATARS = {
  system: {
    initial: '🤖',
    gradientColors: 'from-gray-500 to-gray-700',
    solidColor: 'bg-gray-500'
  },
  admin: {
    initial: '👑',
    gradientColors: 'from-red-500 to-pink-500',
    solidColor: 'bg-red-500'
  },
  bot: {
    initial: '🤖',
    gradientColors: 'from-blue-500 to-cyan-500',
    solidColor: 'bg-blue-500'
  }
} as const;

/**
 * 아바타 색상이 명확히 구분되는지 확인하는 함수
 */
export const ensureUniqueColors = (names: string[]): { name: string; colorIndex: number }[] => {
  const usedColors = new Set<number>();
  const result: { name: string; colorIndex: number }[] = [];
  
  names.forEach(name => {
    let hash = generateHash(name);
    let colorIndex = hash % GRADIENT_COLORS.length;
    
    // 이미 사용된 색상이면 다음 색상으로
    while (usedColors.has(colorIndex)) {
      colorIndex = (colorIndex + 1) % GRADIENT_COLORS.length;
    }
    
    usedColors.add(colorIndex);
    result.push({ name, colorIndex });
  });
  
  return result;
};