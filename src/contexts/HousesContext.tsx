import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { listHouses, type House } from '../lib/tauri'

interface HousesContextType {
  houses: House[]
  refreshHouses: () => Promise<void>
  getHouseById: (houseId: string) => House | undefined
}

const HousesContext = createContext<HousesContextType | null>(null)

export function HousesProvider({ children }: { children: ReactNode }) {
  const [houses, setHouses] = useState<House[]>([])

  const refreshHouses = useCallback(async () => {
    try {
      const loadedHouses = await listHouses()
      setHouses(loadedHouses)
    } catch (error) {
      console.error('Failed to load houses:', error)
    }
  }, [])

  // Load houses on mount
  useEffect(() => {
    refreshHouses()

    // Listen for house updates from other parts of the app
    const onHousesUpdated = () => {
      refreshHouses()
    }
    window.addEventListener('roommate:houses-updated', onHousesUpdated)

    return () => {
      window.removeEventListener('roommate:houses-updated', onHousesUpdated)
    }
  }, [refreshHouses])

  const getHouseById = useCallback((houseId: string) => {
    return houses.find(h => h.id === houseId)
  }, [houses])

  const value = {
    houses,
    refreshHouses,
    getHouseById,
  }

  return <HousesContext.Provider value={value}>{children}</HousesContext.Provider>
}

export function useHouses() {
  const ctx = useContext(HousesContext)
  if (!ctx) throw new Error('useHouses must be used within a HousesProvider')
  return ctx
}
