import { motion } from 'framer-motion';
import { Mail, Crown, Shield } from 'lucide-react';
import type { User as AuthUser } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfileHeroCardProps {
  user: AuthUser | null;
  profile: Profile | null;
}

function resolveVipLabel(tier?: string, role?: string) {
  if (role === 'admin') return 'VIP · Administrator';
  const t = (tier || 'trial').toLowerCase();
  if (t === 'pro' || t === 'premium') return 'VIP · Platinum';
  if (t === 'trial') return 'VIP · Trial Access';
  return 'VIP · Member';
}

export function ProfileHeroCard({ user, profile }: ProfileHeroCardProps) {
  const isAdmin = profile?.role === 'admin';
  const vipLabel = resolveVipLabel(profile?.subscription_tier, profile?.role);
  const displayName = profile?.full_name || 'Członek LexMind';
  const email = user?.email || '';

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="library-view-hero shrink-0 flex items-center"
    >
      <div className="relative z-10 flex w-full min-w-0 items-center gap-2.5 sm:gap-3">
        <ProfileAvatar
          avatarUrl={profile?.avatar_url}
          fullName={profile?.full_name}
          email={user?.email}
          size="sm"
          vip
          className="shrink-0"
        />

        <div className="min-w-0 flex-1 leading-none">
          <h1 className="library-hero-title font-profile-display font-semibold italic tracking-tight text-library-gradient truncate">
            {displayName}
          </h1>
          <p className="library-hero-subtitle mt-1 font-outfit text-gold-primary/80 truncate flex items-center gap-1.5">
            <Crown size={9} className="text-gold-primary shrink-0" />
            <span className="library-view-ornament font-outfit">LexMind · Profil</span>
            <span className="opacity-50">·</span>
            <Mail size={10} className="shrink-0 opacity-80" />
            <span className="truncate">{email}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 max-h-[3.25rem] overflow-hidden">
          {isAdmin && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-red-400/25 bg-red-500/10 text-[8px] font-black uppercase tracking-wider text-red-300 font-outfit">
              <Shield size={9} />
              Admin
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-gold-primary/35 bg-gold-primary/10 text-[8px] font-black uppercase tracking-wider text-gold-primary font-outfit whitespace-nowrap">
            {vipLabel}
          </span>
        </div>
      </div>
    </motion.header>
  );
}
