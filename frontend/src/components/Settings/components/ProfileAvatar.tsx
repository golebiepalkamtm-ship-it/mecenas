import { useMemo, useState } from 'react';
import { cn } from '../../../utils/cn';

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  fullName?: string | null;
  email?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  vip?: boolean;
}

export function ProfileAvatar({
  avatarUrl,
  fullName,
  email,
  className,
  size = 'lg',
  vip = false,
}: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const letter = useMemo(() => {
    const c = fullName?.trim()?.[0] || email?.trim()?.[0] || 'U';
    return c.toUpperCase();
  }, [email, fullName]);

  const dim =
    size === 'lg'
      ? 'w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] text-2xl'
      : size === 'sm'
        ? 'w-9 h-9 text-base rounded-lg'
        : 'w-12 h-12 text-lg';

  return (
    <div
      className={cn(
        'relative shrink-0',
        vip &&
          (size === 'sm'
            ? 'p-[2px] rounded-lg bg-gradient-to-br from-gold-bright via-gold-primary to-gold-deep'
            : 'p-[3px] rounded-2xl bg-gradient-to-br from-gold-bright via-gold-primary to-gold-deep shadow-[0_0_28px_rgba(212,175,55,0.35)]'),
        className,
      )}
    >
      <div
        className={cn(
          dim,
          'rounded-xl glass-prestige-gold flex items-center justify-center font-black text-black italic font-profile-display overflow-hidden border border-gold-primary/30',
          vip && 'ring-2 ring-black/20',
        )}
      >
        {avatarUrl && !imageFailed ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          letter
        )}
      </div>
    </div>
  );
}
