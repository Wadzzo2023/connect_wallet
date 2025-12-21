import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ResetPasswordState {
    cooldownEndTime: number | null
    cooldownRemaining: number
    startCooldown: (seconds: number) => void
    updateCooldownRemaining: () => void
    clearCooldown: () => void
}

export const useResetPasswordStore = create<ResetPasswordState>()(
    persist(
        (set, get) => ({
            cooldownEndTime: null,
            cooldownRemaining: 0,

            startCooldown: (seconds) => {
                const endTime = Date.now() + seconds * 1000
                set({ cooldownEndTime: endTime, cooldownRemaining: seconds })
            },

            updateCooldownRemaining: () => {
                const { cooldownEndTime } = get()
                if (!cooldownEndTime) {
                    set({ cooldownRemaining: 0 })
                    return
                }
                const remaining = Math.ceil((cooldownEndTime - Date.now()) / 1000)
                if (remaining > 0) {
                    set({ cooldownRemaining: remaining })
                } else {
                    set({ cooldownRemaining: 0, cooldownEndTime: null })
                }
            },

            clearCooldown: () => set({ cooldownEndTime: null, cooldownRemaining: 0 }),
        }),
        {
            name: "auth-cooldown-storage",
        },
    ),
)