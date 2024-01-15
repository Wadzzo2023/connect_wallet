import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function addrShort(addr: string, size?: number) {
  const cropSize = size ?? 3
  return `${addr.substring(0, cropSize)}...${addr.substring(addr.length - cropSize, addr.length)}`
}

export function checkPubkey(pubkey: string): boolean {
  return !pubkey || pubkey.trim() === "" || !(pubkey.length === 56)
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
