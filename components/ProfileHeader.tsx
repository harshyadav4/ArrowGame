import React, { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, MessageSquare, Cloud, CloudLightning, User, ChevronDown } from 'lucide-react';

interface ProfileHeaderProps {
  user: {
    email?: string;
    display_name?: string;
    username?: string;
  } | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  onSignInClick: () => void;
  onChatClick: () => void;
  onSignOut: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  syncStatus,
  onSignInClick,
  onChatClick,
  onSignOut,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Cloud className="w-3.5 h-3.5 text-violet-400 animate-pulse" />;
      case 'error':
        return <CloudLightning className="w-3.5 h-3.5 text-red-400 animate-bounce" />;
      case 'offline':
        return <Cloud className="w-3.5 h-3.5 text-slate-500" />;
      case 'synced':
      default:
        return <Cloud className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getSyncText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Sync Error';
      case 'offline':
        return 'Not Saved';
      case 'synced':
      default:
        return 'Saved to Cloud';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500 font-bold bg-white/2 border border-white/5 rounded-full px-2.5 py-1">
          Guest Mode
        </span>
        <button
          onClick={onSignInClick}
          className="flex items-center gap-1.5 py-1.5 px-3.5 cursor-pointer rounded-full text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/10 hover:from-violet-500 hover:to-indigo-500 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
        >
          <LogIn className="w-3.5 h-3.5" />
          Sign In
        </button>
      </div>
    );
  }

  const displayName = user.display_name || user.username || user.email?.split('@')[0] || 'Player';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Toggle Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/8 rounded-full pl-2 pr-3 py-1 cursor-pointer transition-all duration-200 text-white"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white flex items-center justify-center font-bold font-outfit text-xs border border-white/10 shrink-0">
          {initial}
        </div>
        <span className="text-xs font-bold max-w-[80px] truncate">{displayName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-[#120f2b]/95 border border-white/10 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl z-50 animate-slide-down">
          {/* User Details */}
          <div className="px-2.5 py-2 border-b border-white/5 mb-1.5">
            <p className="text-xs font-bold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
            <div className="flex items-center gap-1 mt-2 text-[9px] font-bold">
              {getSyncIcon()}
              <span className={syncStatus === 'synced' ? 'text-emerald-400' : syncStatus === 'error' ? 'text-red-400' : 'text-slate-400'}>
                {getSyncText()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onChatClick();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-violet-600/20 hover:text-white transition-all duration-200 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-violet-400" />
              Chat Lobby
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
