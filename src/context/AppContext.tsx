import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { ExpenseEntity, GroupEntity, MemberSummary, NotificationEntity, ReminderEntity, SettlementEntity, UserProfile } from '../types';
import { lightTheme, darkTheme, Theme } from '../theme';
import { readCache, getThemeMode, setThemeMode as saveThemeMode, getPinHash, setPinHash as savePinHash, clearStorage } from '../lib/storage';
import { supabase, fetchProfile, mapAuthUserToProfile, signOut as supabaseSignOut, deleteAccount as supabaseDeleteAccount } from '../lib/supabase';
import { emptyCache, saveCachedState, SplitNestCache, syncNow, flushQueue } from '../lib/sync';
import { calculateSplits } from '../lib/settlements';
import { monthKey } from '../lib/dates';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppState extends SplitNestCache {
  membersByGroup: Record<string, MemberSummary[]>;
  activeGroupId: string | null;
  activity: string[];
}

const emptyAppState: AppState = {
  ...emptyCache,
  membersByGroup: {},
  activeGroupId: null,
  activity: [],
};

function generateId(): string {
  return Crypto.randomUUID();
}

function generateGroupCode(): string {
  return `SPLT-${Crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

function buildMembers(groupId: string, names: string[]): MemberSummary[] {
  return names.map((name, i) => ({
    userId: `${groupId}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    username: name.toLowerCase().replace(/\s+/g, ''),
    fullName: name,
    role: i === 0 ? 'admin' : 'member',
    avatarUrl: null,
    paid: 0,
    owed: 0,
    receivable: 0,
    joinedAt: new Date().toISOString(),
  } as MemberSummary));
}

interface AppContextValue {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  updateState: (partial: Partial<AppState>, activity?: string) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (v: boolean) => void;
  isOnline: boolean;
  theme: Theme;
  themeMode: ThemeMode;
  setThemeModeValue: (v: ThemeMode) => void;
  pinHash: string | null;
  setPinHashValue: (v: string | null) => Promise<void>;
  generateId: () => string;
  generateGroupCode: () => string;
  buildMembers: (groupId: string, names: string[]) => MemberSummary[];
  calculateSplits: typeof calculateSplits;
  monthKey: typeof monthKey;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  syncData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [state, setState] = useState<AppState>(emptyAppState);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [pinHash, setPinHashState] = useState<string | null>(null);
  const initialised = useRef(false);

  const resolvedMode = themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;
  const theme = resolvedMode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    (async () => {
      const storedTheme = await getThemeMode() as ThemeMode;
      setThemeModeState(storedTheme ?? 'system');

      const storedPin = await getPinHash();
      setPinHashState(storedPin);

      const cached = await readCache<AppState>(emptyAppState);
      setState(cached);

      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await fetchProfile(session.user.id).catch(() => ({ data: null }));
          const merged = { ...(mapAuthUserToProfile(session.user) as UserProfile), ...profile } as UserProfile;
          setState(prev => ({ ...prev, profile: merged }));
          setIsAuthenticated(true);
        }
        supabase.auth.onAuthStateChange((_event, session) => {
          setIsAuthenticated(Boolean(session?.user));
        });
      }
    })().catch(console.warn);

    const unsub = NetInfo.addEventListener(s => setIsOnline(Boolean(s.isConnected && s.isInternetReachable !== false)));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (state.profile) saveCachedState(state).catch(() => null);
  }, [state]);

  const updateState = useCallback((partial: Partial<AppState>, activity?: string) => {
    setState(prev => {
      const next = { ...prev, ...partial };
      if (activity) next.activity = [activity, ...(prev.activity ?? [])].slice(0, 50);
      return next;
    });
  }, []);

  const setThemeModeValue = useCallback(async (v: ThemeMode) => {
    setThemeModeState(v);
    await saveThemeMode(v).catch(() => null);
  }, []);

  const setPinHashValue = useCallback(async (v: string | null) => {
    setPinHashState(v);
    await savePinHash(v).catch(() => null);
  }, []);

  const logout = useCallback(async () => {
    if (supabase) await supabaseSignOut().catch(() => null);
    await clearStorage().catch(() => null);
    setState(emptyAppState);
    setIsAuthenticated(false);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (state.profile) await supabaseDeleteAccount(state.profile.id).catch(() => null);
    await logout();
  }, [state.profile, logout]);

  const syncData = useCallback(async () => {
    if (!isOnline || !isAuthenticated) return;
    await flushQueue().catch(() => null);
    const result = await syncNow(state.activeGroupId ?? undefined).catch(() => null);
    if (result) {
      setState(prev => ({ ...prev, ...result.nextState, activeGroupId: prev.activeGroupId }));
    }
  }, [isOnline, isAuthenticated, state.activeGroupId]);

  return (
    <AppContext.Provider value={{
      state, setState, updateState,
      isAuthenticated, setIsAuthenticated,
      isOnline, theme, themeMode, setThemeModeValue,
      pinHash, setPinHashValue,
      generateId, generateGroupCode, buildMembers,
      calculateSplits, monthKey,
      logout, deleteAccount, syncData,
    }}>
      {children}
    </AppContext.Provider>
  );
}
