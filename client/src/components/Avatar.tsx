import React from 'react';
import { getAvatarInfo } from '../utils/avatarUtils';

export interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'gradient' | 'solid';
  className?: string;
  onClick?: () => void;
}

// 이름 기반 고정 랜덤 회전값 (-10~10도)
function getRotationFromName(name: string) {
  if (!name) return 0;
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // -10 ~ 10 범위
  return (hash % 41) - 15;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  variant = 'gradient',
  className = '',
  onClick
}) => {
  const avatarInfo = getAvatarInfo(name, size, variant);

  // 폰트 크기(더 키우고 싶으면 여기도 조절)
  let fontSizeClass = '';
  switch (size) {
    case 'xs': fontSizeClass = 'text-sm'; break;
    case 'sm': fontSizeClass = 'text-base'; break;
    case 'md': fontSizeClass = 'text-lg'; break;
    case 'lg': fontSizeClass = 'text-xl'; break;
    case 'xl': fontSizeClass = 'text-2xl'; break;
    case '2xl': fontSizeClass = 'text-3xl'; break;
    default: fontSizeClass = 'text-lg';
  }

  // 회전값 계산 (Avatar 내부에서만)
  const rotation = getRotationFromName(name);

  const baseClasses = `
    ${avatarInfo.className}
    ${onClick ? 'cursor-pointer hover:scale-105 transition-transform duration-200' : ''}
    ${className}
    flex items-center justify-center font-extrabold select-none
  `.trim().replace(/\s+/g, ' ');

  const textStyle = {
    transform: `rotate(${rotation}deg)`,
    transition: 'transform 0.2s',
  };

  const textClasses = `block ${fontSizeClass} font-extrabold`;

  if (onClick) {
    return (
      <button onClick={onClick} className={baseClasses} type="button">
        <span className={textClasses} style={textStyle}>
          {avatarInfo.initial}
        </span>
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      <span className={textClasses} style={textStyle}>
        {avatarInfo.initial}
      </span>
    </div>
  );
};
