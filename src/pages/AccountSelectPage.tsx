import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from '../contexts/AccountContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

function AccountSelectPage() {
  const { accounts, accountInfoMap, isLoading: accountsLoading, switchToAccount, authError } = useAccount()
  const navigate = useNavigate()

  useEffect(() => {
    // If no accounts exist, redirect to setup
    if (!accountsLoading && accounts.length === 0) {
      navigate('/identity/setup')
    }
  }, [accountsLoading, accounts, navigate])

  const handleSelectAccount = async (accountId: string) => {
    try {
      // Switch to the account (sets session AND loads identity)
      // AccountContext handles everything
      await switchToAccount(accountId)
      navigate('/houses')
    } catch (error) {
      console.error('Failed to select account:', error)
      alert('Failed to select account. Please try again.')
    }
  }

  const handleCreateNew = () => {
    navigate('/identity/setup')
  }

  if (accountsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background grid-pattern">
        <p className="text-muted-foreground">Loading accounts...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background grid-pattern p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select Account</CardTitle>
          <CardDescription>
            Choose an account to log in or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {authError && (
            <div className="bg-destructive/10 border-l-2 border-destructive p-3 text-sm text-destructive">
              {authError}
            </div>
          )}
          {accounts.map((accountId) => {
            const accountInfo = accountInfoMap[accountId]
            return (
              <Button
                key={accountId}
                variant="outline"
                className="w-full h-auto p-4 flex flex-col items-start"
                onClick={() => handleSelectAccount(accountId)}
              >
                <div className="font-medium">{accountInfo?.display_name || accountId}</div>
                <div className="text-xs text-muted-foreground">
                  {accountInfo?.created_at 
                    ? `Created ${new Date(accountInfo.created_at).toLocaleDateString()}`
                    : accountId
                  }
                </div>
              </Button>
            )
          })}
          
          <div className="pt-4 border-t">
            <Button 
              variant="default" 
              className="w-full"
              onClick={handleCreateNew}
            >
              Create New Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AccountSelectPage
