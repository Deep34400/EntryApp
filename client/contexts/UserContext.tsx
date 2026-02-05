import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_STORAGE_KEY = "@entry_app_user";

export type AppUser = {
  name: string;
  phone: string;
};

type UserContextValue = {
  user: AppUser | null;
  isRestored: boolean;
  setUser: (user: AppUser) => void;
  clearUser: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(USER_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as AppUser;
          if (parsed?.name?.trim() && parsed?.phone?.trim()) {
            setUserState({
              name: parsed.name.trim(),
              phone: parsed.phone.trim(),
            });
          }
        } catch {
          // ignore invalid stored data
        }
      }
      setIsRestored(true);
    });
  }, []);

  const setUser = useCallback((newUser: AppUser) => {
    const saved = {
      name: (newUser.name ?? "").trim(),
      phone: (newUser.phone ?? "").trim(),
    };
    setUserState(saved);
    AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(saved));
  }, []);

  const clearUser = useCallback(() => {
    setUserState(null);
    AsyncStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const value: UserContextValue = {
    user,
    isRestored,
    setUser,
    clearUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    return {
      user: null,
      isRestored: true,
      setUser: () => {},
      clearUser: () => {},
    };
  }
  return ctx;
}
