export type NatOverride = 'auto' | 'open' | 'moderate' | 'strict'

const KEY = 'rmmt:nat_override'

export function getNatOverride(): NatOverride {
  try {
    const v = window.localStorage.getItem(KEY)
    if (v === 'open' || v === 'moderate' || v === 'strict' || v === 'auto') return v
    return 'auto'
  } catch {
    return 'auto'
  }
}

export function setNatOverride(value: NatOverride): void {
  try {
    window.localStorage.setItem(KEY, value)
  } catch {
    // ignore
  }
  // Same-window notification (storage event doesn't fire in the same tab)
  window.dispatchEvent(new Event('cordia:nat-override-changed'))
}

