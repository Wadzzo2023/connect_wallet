import { Networks } from "stellar-sdk"

export const networkPassphrase = process.env.NEXT_PUBLIC_STELLAR_PUBNET
  ? Networks.PUBLIC
  : Networks.TESTNET

export const STELLAR_URL = process.env.NEXT_PUBLIC_STELLAR_PUBNET
  ? "https://horizon.stellar.org"
  : "https://horizon-testnet.stellar.org"

export const USER_ACOUNT_URL = "https://accounts.action-tokens.com/api/account"
