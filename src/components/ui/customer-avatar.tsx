/* eslint-disable */
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Camera } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Gradient palette (deterministic by name)                                  */
/* -------------------------------------------------------------------------- */
const GRADIENTS = [
  'from-blue-500 to-blue-700',
  'from-indigo-500 to-indigo-700',
  'from-emerald-500 to-emerald-700',
  'from-amber-500 to-amber-700',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
  'from-pink-500 to-pink-700',
  'from-teal-500 to-teal-700',
  'from-violet-500 to-violet-700',
  'from-orange-500 to-orange-700',
];

function gradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

/* -------------------------------------------------------------------------- */
/*  Size presets                                                              */
/* -------------------------------------------------------------------------- */
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizeClasses: Record<AvatarSize, { container: string; text: string; camera: string }> = {
  xs:  { container: 'h-7 w-7',   text: 'text-[10px]', camera: 'h-2.5 w-2.5' },
  sm:  { container: 'h-9 w-9',   text: 'text-xs',     camera: 'h-3 w-3' },
  md:  { container: 'h-11 w-11', text: 'text-sm',     camera: 'h-3.5 w-3.5' },
  lg:  { container: 'h-14 w-14', text: 'text-base',   camera: 'h-4 w-4' },
  xl:  { container: 'h-16 w-16', text: 'text-lg',     camera: 'h-4 w-4' },
  '2xl': { container: 'h-20 w-20', text: 'text-2xl',  camera: 'h-5 w-5' },
};

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */
export interface CustomerAvatarProps {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  /** Preset size or supply custom className */
  size?: AvatarSize;
  className?: string;
  /** Show a camera overlay on hover (for upload-enabled contexts) */
  editable?: boolean;
  onClick?: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function CustomerAvatar({
  firstName,
  lastName,
  photoUrl,
  size = 'md',
  className,
  editable = false,
  onClick,
}: CustomerAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  const fullName = `${firstName} ${lastName}`;
  const gradient = gradientForName(fullName);
  const sz = sizeClasses[size];

  const showPhoto = photoUrl && !imgError;

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full overflow-hidden',
        sz.container,
        !showPhoto && `bg-gradient-to-br ${gradient}`,
        editable && 'cursor-pointer group',
        className,
      )}
      onClick={onClick}
      title={fullName}
    >
      {showPhoto ? (
        <img
          src={photoUrl}
          alt={fullName}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={cn('font-bold text-white select-none', sz.text)}>
          {initials}
        </span>
      )}

      {/* Editable hover overlay */}
      {editable && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          <Camera className={cn('text-white', sz.camera)} />
        </div>
      )}
    </div>
  );
}
