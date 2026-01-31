import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  AccountInfo,
  listAccounts,
  getAccountInfo,
  getCurrentSession,
  switchAccount,
  logoutAccount,
  loadIdentity,
  listServers,
} from '../lib/tauri';
import { useIdentity } from './IdentityContext';

interface AccountContextType {
  accounts: string[];
  accountInfoMap: Record<string, AccountInfo>;
  currentAccountId: string | null;
  sessionLoaded: boolean;
  isLoading: boolean;
  authError: string | null;
  refreshAccounts: () => Promise<void>;
  switchToAccount: (accountId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [accountInfoMap, setAccountInfoMap] = useState<Record<string, AccountInfo>>({});
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const { setIdentity, clearIdentity } = useIdentity();

  useEffect(() => {
    initializeSession();
  }, []);

  async function initializeSession() {
    setIsLoading(true);
    setAuthError(null);
    try {
      // Load session and accounts in parallel
      const [session, accountList] = await Promise.all([
        getCurrentSession(),
        listAccounts(),
      ]);

      setCurrentAccountId(session.current_account_id);
      setAccounts(accountList);

      // Load account info for all accounts
      const infoMap: Record<string, AccountInfo> = {};
      for (const accountId of accountList) {
        try {
          const info = await getAccountInfo(accountId);
          if (info) {
            infoMap[accountId] = info;
          }
        } catch (error) {
          console.error(`Failed to load info for account ${accountId}:`, error);
        }
      }
      setAccountInfoMap(infoMap);

      // AUTHORITY: If session exists, load identity and local servers so server list is ready when user lands on /home
      if (session.current_account_id) {
        try {
          const [identity, servers] = await Promise.all([
            loadIdentity(),
            listServers(),
          ]);
          setIdentity(identity);
          window.dispatchEvent(
            new CustomEvent('cordia:servers-initial', {
              detail: { servers, accountId: session.current_account_id },
            })
          );
        } catch (error) {
          console.error('Failed to load identity for session:', error);
          // Session exists but identity load failed - clear session + identity and surface error
          await logoutAccount();
          clearIdentity();
          setCurrentAccountId(null);
          setAuthError(
            'Failed to load identity for the active session. You may need to restore this account from a backup file.'
          );
        }
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    } finally {
      setSessionLoaded(true);
      setIsLoading(false);
    }
  }

  async function refreshAccounts() {
    try {
      const accountList = await listAccounts();
      setAccounts(accountList);

      // Refresh account info
      const infoMap: Record<string, AccountInfo> = {};
      for (const accountId of accountList) {
        try {
          const info = await getAccountInfo(accountId);
          if (info) {
            infoMap[accountId] = info;
          }
        } catch (error) {
          console.error(`Failed to load info for account ${accountId}:`, error);
        }
      }
      setAccountInfoMap(infoMap);
    } catch (error) {
      console.error('Failed to refresh accounts:', error);
    }
  }

  async function switchToAccount(accountId: string) {
    try {
      setAuthError(null);
      // Set session first so listServers() reads the new account's data
      await switchAccount(accountId);

      // Load identity and local servers in parallel so servers are ready before we navigate
      const [identity, servers] = await Promise.all([
        loadIdentity(),
        listServers(),
      ]);
      setIdentity(identity);
      // Propagate local servers immediately so ServerListPage shows them without waiting for signaling
      window.dispatchEvent(
        new CustomEvent('cordia:servers-initial', { detail: { servers, accountId } })
      );
      setCurrentAccountId(accountId);
    } catch (error) {
      console.error('Failed to switch account:', error);
      // Ensure we do not leave a persisted session pointing at an unusable account
      try {
        await logoutAccount();
      } catch {
        // ignore
      }
      clearIdentity();
      setCurrentAccountId(null);
      setAuthError(
        'Failed to log into that account. If this account was created on another device, you may need to restore it from a backup file.'
      );
      throw error;
    }
  }

  async function logout() {
    try {
      // Clear session state
      await logoutAccount();
      
      // Clear identity from memory
      clearIdentity();
      setCurrentAccountId(null);
      
      // Navigate to account selector
      window.location.href = '/account/select';
    } catch (error) {
      console.error('Failed to logout:', error);
      // Even if backend fails, clear local state
      clearIdentity();
      setCurrentAccountId(null);
      window.location.href = '/account/select';
    }
  }

  return (
    <AccountContext.Provider
      value={{
        accounts,
        accountInfoMap,
        currentAccountId,
        sessionLoaded,
        isLoading,
        authError,
        refreshAccounts,
        switchToAccount,
        logout,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
