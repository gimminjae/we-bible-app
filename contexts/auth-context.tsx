import type { SignInWithIdTokenCredentials, User } from "@supabase/supabase-js"
import { useSQLiteContext } from "expo-sqlite"
import * as WebBrowser from "expo-web-browser"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { AppState, Platform } from "react-native"

import { useAppSettings } from "@/contexts/app-settings"
import {
  signInWithNativeApple,
  type NativeAppleFullName,
} from "@/lib/apple-auth"
import { setActiveUserId } from "@/lib/auth-state"
import {
  deleteMyAccount as deleteMyAccountRequest,
  syncUserProfileFromAuthUser,
} from "@/lib/church"
import {
  bootstrapSupabaseUserData,
  getLocalDataOwnerUserId,
  resetLocalPersistedState,
} from "@/lib/sqlite-supabase-store"
import {
  pauseSQLiteStateSync,
  resumeSQLiteStateSync,
} from "@/lib/sqlite-sync-control"
import {
  getAppleAuthRedirectUrl,
  getNativeAuthRedirectUrl,
  getUserProvider,
  isSupabaseConfigured,
  type SocialProvider,
} from "@/lib/supabase"
import { createSupabaseClient } from "@/lib/supabase-client"

WebBrowser.maybeCompleteAuthSession()

type AuthContextValue = {
  currentUser: User | null
  dataUserId: string | null
  isConfigured: boolean
  isLoadingSession: boolean
  isSyncingData: boolean
  lastError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ requiresEmailVerification: boolean }>
  signOut: () => Promise<void>
  signInWithOAuth: (provider: SocialProvider) => Promise<void>
  deleteAccount: () => Promise<void>
  clearLastError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  return "AUTH_OPERATION_FAILED"
}

function parseAuthResultUrl(url: string) {
  const parsed = new URL(url)
  const searchParams = new URLSearchParams(parsed.search)
  const hashParams = new URLSearchParams(
    parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash,
  )

  return {
    code: searchParams.get("code"),
    accessToken:
      hashParams.get("access_token") ?? searchParams.get("access_token"),
    refreshToken:
      hashParams.get("refresh_token") ?? searchParams.get("refresh_token"),
    errorDescription:
      hashParams.get("error_description") ??
      searchParams.get("error_description") ??
      hashParams.get("error") ??
      searchParams.get("error"),
  }
}

function buildAppleUserMetadata(fullName: NativeAppleFullName | null) {
  const givenName = fullName?.givenName?.trim() ?? ""
  const middleName = fullName?.middleName?.trim() ?? ""
  const familyName = fullName?.familyName?.trim() ?? ""
  const formattedName = [givenName, middleName, familyName]
    .filter(Boolean)
    .join(" ")
    .trim()

  if (!formattedName && !givenName && !familyName) {
    return null
  }

  return {
    full_name: formattedName || undefined,
    name: formattedName || undefined,
    given_name: givenName || undefined,
    family_name: familyName || undefined,
  }
}

function getOAuthRedirectUrl(provider: SocialProvider) {
  if (Platform.OS !== "web") {
    return getNativeAuthRedirectUrl()
  }

  if (provider === "apple") {
    return getAppleAuthRedirectUrl() ?? `${window.location.origin}/auth/callback`
  }

  return `${window.location.origin}/auth/callback`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext()
  const { refreshSettings } = useAppSettings()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [dataUserId, setDataUserId] = useState<string | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [isSyncingData, setIsSyncingData] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve())
  const guestResetPromiseRef = useRef<Promise<void> | null>(null)
  const mountedRef = useRef(true)
  const configured = isSupabaseConfigured()

  const resetToGuest = useCallback(async () => {
    if (guestResetPromiseRef.current) {
      return guestResetPromiseRef.current
    }

    const nextReset = (async () => {
    setCurrentUser(null)
    setDataUserId(null)
    setActiveUserId(null)

    const localDataOwnerUserId = await getLocalDataOwnerUserId(db)
    if (localDataOwnerUserId) {
      pauseSQLiteStateSync()
      try {
        await resetLocalPersistedState(db)
      } finally {
        resumeSQLiteStateSync()
      }
    }

    await refreshSettings()
    })()

    guestResetPromiseRef.current = nextReset

    return nextReset.finally(() => {
      if (guestResetPromiseRef.current === nextReset) {
        guestResetPromiseRef.current = null
      }
    })
  }, [db, refreshSettings])

  const syncAuthenticatedUser = useCallback(
    async (user: User) => {
      setCurrentUser(user)
      setIsSyncingData(true)

      pauseSQLiteStateSync()
      try {
        await bootstrapSupabaseUserData(db, user.id)
        await syncUserProfileFromAuthUser(user)
        setActiveUserId(user.id)
        await refreshSettings()
        if (!mountedRef.current) return
        setDataUserId(user.id)
        setLastError(null)
      } catch (error) {
        if (!mountedRef.current) return
        const message = getErrorMessage(error)
        setLastError(message)
        setCurrentUser(null)
        setDataUserId(null)
        setActiveUserId(null)

        const supabase = createSupabaseClient()
        const result = await supabase.auth.signOut()
        if (result.error) {
          console.warn(
            "Failed to sign out after SQLite sync bootstrap error.",
            result.error,
          )
        }
      } finally {
        resumeSQLiteStateSync()
        if (!mountedRef.current) return
        setIsSyncingData(false)
        setIsLoadingSession(false)
      }
    },
    [db, refreshSettings],
  )

  const enqueueUserSync = useCallback(
    (user: User | null) => {
      syncQueueRef.current = syncQueueRef.current
        .catch(() => {
          // Keep the sync queue usable after a previous failure.
        })
        .then(async () => {
          if (!mountedRef.current) return

          if (!user) {
            await resetToGuest()
            if (!mountedRef.current) return
            setIsSyncingData(false)
            setIsLoadingSession(false)
            return
          }

          await syncAuthenticatedUser(user)
        })

      return syncQueueRef.current
    },
    [resetToGuest, syncAuthenticatedUser],
  )

  useEffect(() => {
    mountedRef.current = true

    if (!configured) {
      setCurrentUser(null)
      setDataUserId(null)
      setActiveUserId(null)
      setIsLoadingSession(false)
      setIsSyncingData(false)
      return
    }

    const supabase = createSupabaseClient()

    const loadSession = async () => {
      setIsLoadingSession(true)
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        setLastError(getErrorMessage(error))
      }
      await enqueueUserSync(error ? null : (data.user ?? null))
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void enqueueUserSync(session?.user ?? null)
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [configured, enqueueUserSync, resetToGuest])

  useEffect(() => {
    if (!configured || Platform.OS === "web") return

    const supabase = createSupabaseClient()
    void supabase.auth.startAutoRefresh()

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void supabase.auth.startAutoRefresh()
      } else {
        void supabase.auth.stopAutoRefresh()
      }
    })

    return () => {
      subscription.remove()
      void supabase.auth.stopAutoRefresh()
    }
  }, [configured])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createSupabaseClient()
    setLastError(null)
    setIsLoadingSession(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      setIsLoadingSession(false)
      throw error
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = createSupabaseClient()
    setLastError(null)
    setIsLoadingSession(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    if (error) {
      setIsLoadingSession(false)
      throw error
    }
    if (!data.session?.user) {
      setIsLoadingSession(false)
    }
    return {
      requiresEmailVerification: !data.session?.user,
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createSupabaseClient()
    setLastError(null)
    setIsLoadingSession(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      setIsLoadingSession(false)
      throw error
    }
  }, [])

  const signInWithOAuth = useCallback(async (provider: SocialProvider) => {
    const supabase = createSupabaseClient()
    setLastError(null)
    setIsLoadingSession(true)

    try {
      if (provider === "apple" && Platform.OS === "ios") {
        const credential = await signInWithNativeApple()
        const signInWithIdTokenCredentials: SignInWithIdTokenCredentials = {
          provider: "apple",
          token: credential.identityToken,
          access_token: credential.authorizationCode,
          ...(credential.nonce ? { nonce: credential.nonce } : {}),
        }

        const { error } = await supabase.auth.signInWithIdToken(
          signInWithIdTokenCredentials,
        )

        if (error) {
          throw error
        }

        const appleUserMetadata = buildAppleUserMetadata(credential.fullName)
        if (appleUserMetadata) {
          const { error: updateError } = await supabase.auth.updateUser({
            data: appleUserMetadata,
          })

          if (updateError) {
            console.warn("Failed to persist Apple profile metadata.", updateError)
          }
        }

        return
      }

      const redirectTo = getOAuthRedirectUrl(provider)

      if (Platform.OS === "web") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
          },
        })

        if (error) {
          throw error
        }

        return
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })

      if (error || !data?.url) {
        throw error ?? new Error("OAUTH_URL_MISSING")
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type !== "success" || !result.url) {
        throw new Error("OAUTH_CANCELLED")
      }

      const { code, accessToken, refreshToken, errorDescription } =
        parseAuthResultUrl(result.url)
      if (errorDescription) {
        throw new Error(errorDescription)
      }

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          throw exchangeError
        }
        return
      }

      if (!accessToken || !refreshToken) {
        throw new Error("OAUTH_SESSION_MISSING")
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (sessionError) {
        throw sessionError
      }

      return
    } catch (error) {
      setIsLoadingSession(false)
      throw error
    }
  }, [])

  const deleteAccount = useCallback(async () => {
    if (!configured) {
      throw new Error("SUPABASE_NOT_CONFIGURED")
    }

    if (!currentUser) {
      throw new Error("AUTH_REQUIRED")
    }

    const supabase = createSupabaseClient()
    setLastError(null)
    setIsLoadingSession(true)

    try {
      await deleteMyAccountRequest()

      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      })
      if (signOutError) {
        console.warn(
          "Failed to clear local session after account deletion.",
          signOutError,
        )
      }

      await enqueueUserSync(null)
    } catch (error) {
      console.error("Error occurred while deleting account:", error)
      throw error
    } finally {
      if (!mountedRef.current) return
      setIsSyncingData(false)
      setIsLoadingSession(false)
    }
  }, [configured, currentUser, enqueueUserSync])

  const clearLastError = useCallback(() => {
    setLastError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      dataUserId,
      isConfigured: configured,
      isLoadingSession,
      isSyncingData,
      lastError,
      signIn,
      signUp,
      signOut,
      signInWithOAuth,
      deleteAccount,
      clearLastError,
    }),
    [
      clearLastError,
      configured,
      currentUser,
      dataUserId,
      deleteAccount,
      isLoadingSession,
      isSyncingData,
      lastError,
      signIn,
      signInWithOAuth,
      signOut,
      signUp,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

export function useAuthProviderName() {
  return getUserProvider(useAuth().currentUser)
}
