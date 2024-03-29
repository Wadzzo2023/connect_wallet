/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import SignClient from "@walletconnect/sign-client"
import { ConfigCtrl, ModalCtrl } from "@web3modal/core"
import toast from "react-hot-toast"
import { type W3mModal } from "@web3modal/ui"
import { Web3Modal } from "@web3modal/standalone"
import { getSdkError } from "@walletconnect/utils"
import { WalletType } from "../../../lib/enums"
import type { ConnectWalletStateModel } from "../../../state/connect_wallet_state"
import { checkPubkey, addrShort } from "../../../lib/utils"

type Method = "stellar_signXDR" | "stellar_signAndSubmitXDR"

const STELLAR_METHODS = {
  SIGN_AND_SUBMIT: "stellar_signAndSubmitXDR",
  SIGN: "stellar_signXDR",
}

// # WallectConnect project Id
const WALLET_CONNECT_ID = "f1aeccdd62aff60ec7f578ec3661321f"

// # Site info

let signClient: SignClient | undefined = undefined
const namespaces = {
  stellar: {
    methods: Object.values(STELLAR_METHODS),
    chains: ["stellar:pubnet"],
    events: [],
  },
}

export async function configureSignClient() {
  signClient = await SignClient.init({
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID ?? WALLET_CONNECT_ID,
    metadata: {
      name: process.env.NEXT_PUBLIC_TITLE ?? "Wallet",
      description: process.env.NEXT_PUBLIC_DESC ?? "To connect your wallet",
      url: process.env.NEXT_PUBLIC_URL ?? "https://wallet.stellar.org",
      icons: [process.env.NEXT_PUBLIC_ICON ?? "https://wallet.stellar.org/favicon.ico"],
    },
  })
}

export async function logoutWalletConnect(topic: string) {
  if (signClient) {
    await signClient.disconnect({
      topic: topic,
      reason: getSdkError("USER_DISCONNECTED"),
    })
  }
}

ConfigCtrl.setConfig({
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID ?? WALLET_CONNECT_ID,
  enableStandaloneMode: true,
  enableNetworkView: true,
  themeMode: "light" as const,
  themeColor: "default" as const,
  desktopWallets: [],
})

const timeout = (ms: any, message: any) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(message))
    }, ms)
  })
}

export async function walletConnectLogin(walletState: ConnectWalletStateModel) {
  if (signClient) {
    const { uri, approval } = await signClient.connect({
      requiredNamespaces: namespaces,
    })
    if (uri) {
      ModalCtrl.open({
        uri,
        standaloneChains: namespaces.stellar.chains,
      })

      try {
        let r: any | undefined

        toast("WalletConnect session timeout 3 minute")
        await Promise.race([
          timeout(180000, "timeout wc"),
          (async () => {
            r = await approval()
          })(),
        ])
        if (r) {
          await logoutWalletConnect(r.topic)
          const [_chain, _reference, pubkey] = r.namespaces.stellar.accounts[0].split(":")
          if (checkPubkey(pubkey)) {
            toast.error("Login failed. Please try to login again after refreshing the page.")
            return
          }
          walletState.setUserData(pubkey, true, WalletType.walletConnect)
          toast.success("Public Key : " + addrShort(pubkey, 10))
        }
      } catch (e) {
        toast.error("Reject")
      }
      ModalCtrl.close()
      toast("WalletConnect session ended")
    }
  }
}

export async function walletConnectSignTransaction(xdr: string, method: Method) {
  const AnotherWeb3Modal = new Web3Modal({
    walletConnectVersion: 2,
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID ?? WALLET_CONNECT_ID,
    standaloneChains: ["stellar:pubnet"],
  })

  await configureSignClient()
  if (signClient) {
    try {
      const { uri, approval } = await signClient.connect({
        requiredNamespaces: {
          stellar: {
            methods: Object.values(STELLAR_METHODS),
            chains: ["stellar:pubnet"],
            events: [],
          },
        },
      })

      if (uri) {
        await AnotherWeb3Modal.openModal({ uri })
        const session = await approval()
        const result = await signClient.request({
          topic: session.topic,
          chainId: "stellar:pubnet",
          request: {
            method: method, //"stellar_signXDR",
            params: {
              xdr: xdr,
            },
          },
        })

        AnotherWeb3Modal.closeModal()

        console.info("WalletConnect signXdr", result)
        if (method === "stellar_signAndSubmitXDR") {
          if ((result as any).result.status == "success") {
            return true
          }
        } else {
          return (result as any).signedXDR
        }
        return undefined
      } else {
        return undefined
      }
    } catch (e: any) {
      console.error(e)
      throw `Transaction declined. ${e.message}`
    } finally {
      AnotherWeb3Modal.closeModal()
    }
  } else {
    console.info("no singClient")
    return undefined
  }
}

export async function walletConnectSignTransactionSubmitterWrapper(xdr: string) {
  const result = await walletConnectSignTransaction(xdr, "stellar_signAndSubmitXDR")
  if (result) {
    return true
  } else {
    return false
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "w3m-modal": Partial<W3mModal>
    }
  }
}
