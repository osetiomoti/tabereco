'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Camera, Tag, LogOut, ChevronRight, User, Check, X, Loader2, Users } from 'lucide-react';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { useUpload } from '@/hooks/useUpload';
import { useMyProfile } from '@/hooks/useAppData';
import { PushNotificationToggle } from '@/components/PushNotificationToggle';
import { mutate } from 'swr';
import { getImageUrl } from '@/lib/image';

export default function SettingsPage() {
  const router = useRouter();
  const { uploadFile, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { profile, isLoading: isProfileLoading, mutate: mutateProfile } = useMyProfile();
  const [user, setUser] = useState<any | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setUser(profile);
      setNameInput(profile.name || '');
    }
  }, [profile]);

  const handleSignOut = () => {
    localStorage.removeItem('tabereco_rt');
    router.push('/api/auth/logout');
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    const res = await fetch('/api/profiles/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.trim() }),
    });
    const json = await res.json();
    if (json.success) {
      setUser(json.data);
      setEditingName(false);
      mutate('/api/profiles/me');
      router.refresh();
    }
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, 'avatars');
    if (url) {
      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: url }),
      });
      const json = await res.json();
      if (json.success) {
        setUser(json.data);
        mutate('/api/profiles/me');
        router.refresh();
      }
    }
  };

  return (
    <>
      <Header />
      <main className="max-w-xl mx-auto px-5 py-8 pb-32 animate-fade-in relative min-h-[calc(100vh-64px)]">

        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-6">設定</h1>

        {/* Profile Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 mb-6">
          {/* Avatar */}
          <div className="flex items-center gap-5 mb-5">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-md relative">
                {isUploading ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Loader2 size={24} className="text-orange-500 animate-spin" />
                  </div>
                ) : isProfileLoading && !user ? (
                  <div className="w-full h-full bg-gray-200 animate-pulse" />
                ) : user?.avatar_url ? (
                  <Image src={getImageUrl(user.avatar_url)} alt="Profile" fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <User size={32} className="text-gray-400" />
                  </div>
                )}
              </div>
              {/* Camera Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors"
              >
                <Camera size={14} className="text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name Edit */}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    className="flex-1 border border-orange-300 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    maxLength={50}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center hover:bg-orange-600 transition-colors"
                  >
                    {saving ? <Loader2 size={14} className="text-white animate-spin" /> : <Check size={14} className="text-white" />}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setNameInput(user?.name || ''); }}
                    className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <X size={14} className="text-gray-500" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-gray-900 truncate">
                    {isProfileLoading && !user ? (
                      <span className="inline-block w-28 h-6 bg-gray-200 rounded-lg animate-pulse align-middle" />
                    ) : (
                      user?.name || 'ゲスト'
                    )}
                  </h2>
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-1.5 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400 font-bold mt-0.5 truncate">{user?.email || ''}</p>
            </div>
          </div>
        </div>

        {/* Menu List */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-8">
          <PushNotificationToggle />
          <div className="border-b border-gray-50" />
          <MenuItem 
            icon={<span className="text-orange-500"><Users size={20} fill="currentColor" fillOpacity={0.2} /></span>} 
            label="ともだち・グループ" 
            href="/groups" 
          />
          <MenuItem 
            icon={<span className="text-yellow-500"><Tag size={20} fill="currentColor" fillOpacity={0.2} /></span>} 
            label="タグ管理" 
            href="/tags" 
            isLast 
          />
        </div>

        {/* Logout Button */}
        <button
          onClick={handleSignOut}
          className="w-full py-4 rounded-2xl border-2 border-red-50 text-red-500 font-bold hover:bg-red-50 hover:border-red-100 transition-colors flex items-center justify-center gap-2 active:scale-95"
        >
          <LogOut size={18} />
          ログアウト
        </button>

      </main>
    </>
  );
}

function MenuItem({ icon, label, href, isLast = false }: { icon: React.ReactNode, label: string, href: string, isLast?: boolean }) {
  return (
    <Link href={href} className={`flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group ${!isLast ? 'border-b border-gray-50' : ''}`}>
      <div className="flex items-center gap-4">
        {icon}
        <span className="font-bold text-gray-800 text-[15px] group-hover:translate-x-1 transition-transform">{label}</span>
      </div>
      <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}
