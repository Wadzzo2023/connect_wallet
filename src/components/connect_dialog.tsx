import { useCallback, useEffect, useState } from "react";
import IconButton from "./icon_button";
import { toast } from "react-hot-toast";
import {
  DocumentDuplicateIcon,
  SignalSlashIcon,
} from "@heroicons/react/24/solid";

import { ArrowLeft, ArrowUpCircle, BadgeX, QrCodeIcon, RefreshCcw } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import CopyToClipboard from "react-copy-to-clipboard";
import useNeedSign from "~/lib/hook";

import { WalletType } from "../lib/enums";
import { checkStellarAccountActivity, clientsign } from "../lib/stellar/utils";
import { albedoLogin } from "../lib/stellar/wallet_clients/albedo_login";
import { appleLogin } from "../lib/stellar/wallet_clients/apple_login";
import { freighterLogin } from "../lib/stellar/wallet_clients/freighter_login";
import { googleLogin } from "../lib/stellar/wallet_clients/google_login";
import { rabetLogin } from "../lib/stellar/wallet_clients/rabe_login";
import {
  configureSignClient,
  walletConnectLogin,
} from "../lib/stellar/wallet_clients/wallet_connect";
import { addrShort } from "../lib/utils";
import { useDialogStore } from "../state/connect_wallet_dialog";
import { useWCIStore } from "../state/wallect_connect_import";
import useFacebookiOSUserAgent from "./hook";
import LoginPage from "./login";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shadcn/ui/tabs";

import { Label } from "@radix-ui/react-label";
import { Button } from "../shadcn/ui/button";

import { Badge } from "../shadcn/ui/badge";
import Image from "next/image";

import { useRouter } from "next/router";

import { Dialog, DialogContent, DialogTitle } from "../shadcn/ui/dialog";
import SignUP from "./sign_up";
import Loading from "~/components/common/loading";
import SignUpForm from "./sign_up";
import LoginForm from "./login";
import ForgotPasswordForm from "./forget-password";
import { api } from "~/utils/api";
import { clientSelect } from "~/lib/stellar/fan/utils";
import { PLATFORM_ASSET } from "../lib/stellar/constant";
type AuthView = "login" | "signup" | "forgot-password"

interface ConnectDialogProps {
  className: string;
}
export default function ConnectDialog({ className }: ConnectDialogProps) {
  const [authView, setAuthView] = useState<AuthView>("login")
  const [isAccountActivate, setAccountActivate] = useState(false)
  const [isAccountActivateLoading, setAccountActivateLoading] = useState(false)
  const router = useRouter()
  const { needSign } = useNeedSign();

  const dialogModalState = useDialogStore()
  const [selectedWallet, setSelectedWallet] = useState(WalletType.none)
  const isIosFBuser = useFacebookiOSUserAgent()
  const session = useSession()
  const [loading, setLoading] = useState(false)

  const checkAccountActivity = useCallback(async (publicKey: string) => {
    setAccountActivateLoading(true)
    const isActive = await checkStellarAccountActivity(publicKey)
    setAccountActivate(isActive)
    setAccountActivateLoading(false)
  }, [])

  const checkStatus = useCallback(async () => {
    const user = session.data?.user
    if (user) {
      setLoading(true)
      await checkAccountActivity(user.id)
      setLoading(false)
    }
  }, [checkAccountActivity, session.data?.user])

  const disconnectWallet = useCallback(async () => {
    await signOut({ redirect: false })
    router.reload()
  }, [router])

  function toolTipsAddr(walletType: WalletType) {
    const user = session.data?.user
    if (user && selectedWallet === walletType) return addrShort(user.id, 10)
  }

  useEffect(() => {
    void checkStatus()
    const w = session.data?.user.walletType
    setSelectedWallet(w ?? WalletType.none)
  }, [checkStatus, session.data?.user.walletType])

  const handleClose = () => {
    dialogModalState.setIsOpen(false)
  }
  const {
    data: hasTrustLineOnPlatformAsset,
    isLoading: checkingPlatformLoading,
    refetch: refetchTrustLine,
  } = api.walletBalance.wallBalance.checkingPlatformTrustLine.useQuery(
    undefined,
    {
      enabled: !!session.data?.user && isAccountActivate,
      refetchOnWindowFocus: false,
    },
  );
  const AddTrustMutation =
    api.walletBalance.wallBalance.addTrustLine.useMutation({
      onSuccess: async (data) => {
        console.log("Trustline added successfully", data);
        try {
          const clientResponse = await clientsign({
            walletType: session?.data?.user?.walletType,
            presignedxdr: data.xdr,
            pubkey: data.pubKey,
            test: clientSelect(),
          });

          if (clientResponse) {
            toast.success("Added trustline successfully")
          } else {
            toast.error("No Data Found at TrustLine Operation");
          }
        } catch (error: unknown) {
          console.error("Error in test transaction", error)

          const err = error as {
            message?: string
            details?: string
            errorCode?: string
          }

          toast.error(`Error Code : ${err?.errorCode ?? "unknown"}`)

        } finally {
          setLoading(false);
        }
      },
      onError: (error) => {
        setLoading(false);
        toast.error(error.message);
      },
    });

  // Reset to login view when dialog opens
  useEffect(() => {
    if (dialogModalState.isOpen) {
      setAuthView("login")
    }
  }, [dialogModalState.isOpen])
  // Automatically add trust line when account becomes activated
  useEffect(() => {
    if (
      isAccountActivate &&
      !isAccountActivateLoading &&
      session.data?.user &&
      !AddTrustMutation.isLoading &&
      hasTrustLineOnPlatformAsset === false
    ) {

      AddTrustMutation.mutate({
        asset_code: PLATFORM_ASSET.code,
        asset_issuer: PLATFORM_ASSET.issuer,
        signWith: needSign(),
      });
    }
  }, [isAccountActivate, isAccountActivateLoading]);

  function DisconnectButton() {
    if (session.status === "authenticated") {
      return (
        <Button variant="destructive" className="w-full" onClick={disconnectWallet}>
          <SignalSlashIcon className="mr-2 h-5 w-5" />
          Disconnect Wallet
        </Button>
      )
    }
    return null
  }

  function AuthenticatedUser() {
    if (session.status === "loading") return <div>Loading...</div>
    if (session.data && isAccountActivate) {
      const user = session.data.user
      return (
        <Badge variant="destructive" className="flex items-center gap-2 rounded-xl text-sm font-bold md:text-lg">
          {isAccountActivateLoading && (
            <span data-tip="Checking account status" className="tooltip tooltip-bottom">
              <ArrowUpCircle className="h-4 w-4 animate-spin" />
            </span>
          )}
          <CopyToClipboard text={user.id} onCopy={() => toast.success("Copied: " + addrShort(user.id))}>
            <span className="flex cursor-pointer items-center gap-2 font-semibold hover:bg-slate-300/10">
              {addrShort(user.id, 10)}
              <span data-tip="Copy address" className="tooltip tooltip-right">
                <DocumentDuplicateIcon className="h-4 w-4" />
              </span>
            </span>
          </CopyToClipboard>
        </Badge>
      )
    }
    return null
  }

  function NotActivatedUser() {
    if (isAccountActivateLoading) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <p className="flex items-center justify-center text-xl font-bold">
            Checking account status
            <ArrowUpCircle className="ml-2 h-4 w-4 animate-spin" />
          </p>
        </div>
      )
    }

    if (session.data && !isAccountActivate) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <p className="flex items-center justify-center text-xl font-bold">Account is not activated!</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <CopyToClipboard
              text={session.data.user.id}
              onCopy={() => toast.success("Copied: " + addrShort(session.data.user.id))}
            >
              <Button className="bg-sky-500 hover:bg-sky-700">
                <DocumentDuplicateIcon className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </CopyToClipboard>
            <Button
              disabled={isAccountActivateLoading}
              onClick={() => void checkStatus()}
              className="bg-violet-500 hover:bg-violet-600"
            >
              Refresh
            </Button>
          </div>
        </div>
      )
    }
    return null
  }

  function AllButtons() {
    const { setIsOpen } = useDialogStore()
    return (
      <div className="flex flex-col gap-2">
        <IconButton
          toolTips={toolTipsAddr(WalletType.apple)}
          isSelected={selectedWallet === WalletType.apple}
          onClick={async () => {
            const res = await appleLogin()
            if (res?.ok) {
              setIsOpen(false)
            }
          }}
          className="inline-flex items-center rounded-lg bg-[#050708] px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-[#050708]/90"
          icon={
            <svg className="mr-2 h-5 w-5" viewBox="0 0 384 512" fill="currentColor">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
          }
          text="CONTINUE WITH APPLE"
        />
        <IconButton
          toolTips={toolTipsAddr(WalletType.google)}
          isSelected={selectedWallet === WalletType.google}
          onClick={async () => {
            const res = await googleLogin()
            if (res?.ok) {
              setIsOpen(false)
            }

          }}
          className="inline-flex items-center rounded-lg bg-[#4285F4] px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-[#4285F4]/90"
          icon={
            <svg className="mr-2 h-4 w-4" viewBox="0 0 18 19" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.842 18.083a8.8 8.8 0 0 1-8.65-8.948 8.841 8.841 0 0 1 8.8-8.652h.153a8.464 8.464 0 0 1 5.7 2.257l-2.193 2.038A5.27 5.27 0 0 0 9.09 3.4a5.882 5.882 0 0 0-.2 11.76h.124a5.091 5.091 0 0 0 5.248-4.057L14.3 11H9V8h8.34c.066.543.095 1.09.088 1.636-.086 5.053-3.463 8.449-8.4 8.449l-.186-.002Z"
                clipRule="evenodd"
              />
            </svg>
          }
          text="CONTINUE WITH GOOGLE"
          disable={isIosFBuser ?? false}
        />
      </div>
    )
  }

  function ActionAuthContent() {
    return (
      <div className="w-full space-y-4">
        {authView === "login" && (
          <>
            <LoginForm />
            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAuthView("forgot-password")}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
              >
                Forgot password?
              </button>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">Don&apos;t have an account?</span>
                <button
                  type="button"
                  onClick={() => setAuthView("signup")}
                  className="font-medium  hover:underline"
                >
                  Create new account
                </button>
              </div>
            </div>
          </>
        )}

        {authView === "signup" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setAuthView("login")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>
            </div>
            <SignUpForm onSuccess={() => setAuthView("login")} />
          </>
        )}
        {authView === "forgot-password" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setAuthView("login")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>
            </div>
            <ForgotPasswordForm />
          </>
        )}


        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className=" bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>
        <AllButtons />
      </div>
    )
  }

  function WalletLogin({ authUser }: { authUser: boolean }) {
    const { setIsOpen } = useDialogStore()
    return (
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="flex min-h-[65vh] min-w-[40vw] grid-cols-1 items-start justify-center overflow-y-auto p-2 lg:grid lg:grid-cols-3"
      >
        <div className="h-full w-full bg-gray-100 p-5 dark:bg-gray-900 md:p-10 lg:col-span-2">
          <div className="max-w-md space-y-6">
            {session?.data?.user && !session?.data?.user.emailVerified && (
              <div className="max-w-md">
                <p className="text-xl font-bold">Email: {session?.data?.user.email}</p>
                <p className="text-xl">Please check your email inbox for the verification email.</p>
                <Button className="mt-2 w-full bg-violet-500 text-white hover:bg-violet-600" onClick={disconnectWallet}>
                  <SignalSlashIcon className="mr-2 h-5 w-5" />
                  Logout
                </Button>
              </div>
            )}

            {authUser && (
              <div className="flex items-center justify-center">
                <AuthenticatedUser />
              </div>
            )}

            <div className="space-y-2 text-center">
              <DialogTitle className="p-2 text-3xl font-bold text-black dark:text-white md:hidden">
                ACTION AUTH SYSTEM
              </DialogTitle>
              <p className="text-gray-500 dark:text-gray-400">
                {authView === "login" && "Sign in to access your account"}
                {authView === "signup" && "Create a new account to get started"}
                {authView === "forgot-password" && "Reset your password"}
              </p>
            </div>

            <Tabs defaultValue="action">
              <TabsList className="mb-5 grid grid-cols-2 ">
                <TabsTrigger value="action">Action Login</TabsTrigger>
                <TabsTrigger value="stellar">Stellar Login</TabsTrigger>
              </TabsList>
              <TabsContent value="action">
                <ActionAuthContent />
              </TabsContent>
              <TabsContent value="stellar">
                <div className="grid grid-cols-2 gap-1">
                  <IconButton
                    className="mb-2 me-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium  hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                    toolTips={toolTipsAddr(WalletType.frieghter)}
                    isSelected={selectedWallet === WalletType.frieghter}
                    onClick={() => void freighterLogin()}
                    imageUrl="/images/wallets/freighter.png"
                    text="Freighter"
                  />
                  <IconButton
                    className="mb-2 me-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium  hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                    toolTips={toolTipsAddr(WalletType.rabet)}
                    isSelected={selectedWallet === WalletType.rabet}
                    onClick={() => void rabetLogin()}
                    imageUrl="/images/wallets/rabet.png"
                    text="Rabet"
                  />
                  <IconButton
                    className="mb-2 me-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium  hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                    toolTips={toolTipsAddr(WalletType.albedo)}
                    isSelected={selectedWallet === WalletType.albedo}
                    onClick={async () => {
                      const res = await albedoLogin()
                      if (res?.ok) {
                        setIsOpen(false)
                      }
                    }}
                    imageUrl="/images/wallets/albedo.svg"
                    text="Albedo"
                  />
                  <div className="sm:hidden">
                    <WCButton toolTipsAddr={toolTipsAddr} selectedWallet={selectedWallet} text="Lobstr" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {authUser && (
              <div className="flex items-center justify-center">
                <DisconnectButton />
              </div>
            )}
          </div>
        </div>

        <div className="hidden h-full flex-col items-center justify-between lg:flex">
          <div className="flex w-full flex-col items-center justify-center py-10 font-bold text-black dark:text-white">
            <Label>ACTION AUTH SYSTEM</Label>
          </div>

          <div className="relative flex w-full items-center justify-center rounded-md">
            <QrCodeIcon
              className="absolute bottom-0 left-0 right-0 top-0 m-auto blur-sm"
              size={150}
            />
            <div className="z-10">
              <WCButton
                toolTipsAddr={toolTipsAddr}
                selectedWallet={selectedWallet}
                text=""
              />
            </div>
          </div>

          <div className=" focus:ring-2 focus:ring-red-500">
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  "https://github.com/Lobstrco/lobstr-browser-extension/tree/main",
                )
              }
              className=" h-full w-full p-3 text-start text-xs"
            >
              <div className="flex items-center">
                <Image
                  src="/images/icons/labstr.png"
                  alt="qr-code"
                  width={20}
                  height={20}
                  className="mr-2"
                />
                <span className="font-bold">
                  WORKING WITH <br />
                  LOBSTR MOBILE APP
                </span>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    )
  }

  return (
    <Dialog open={dialogModalState.isOpen} onOpenChange={handleClose}>
      {session.status === "authenticated" && session.data.user.emailVerified ? (
        session.data && isAccountActivate ? (
          <WalletLogin authUser={true} />
        ) : (
          <DialogContent
            onInteractOutside={(e) => e.preventDefault()}
            className="grid h-1/2 min-h-[600px] grid-cols-1 justify-center md:h-fit"
          >
            <div className="flex flex-col items-center justify-between">
              <DialogTitle />
              <div className="flex items-center justify-center">
                <NotActivatedUser />
              </div>
              <DisconnectButton />
            </div>
          </DialogContent>
        )
      ) : (
        <WalletLogin authUser={false} />
      )}
    </Dialog>
  )
}

function WCButton({
  toolTipsAddr,
  selectedWallet,
  text,
}: {
  toolTipsAddr: (walletType: WalletType) => string | undefined;
  selectedWallet: WalletType;
  text?: string;
}) {
  const [initializing, setInitializing] = useState(true);
  const [wcLoading, setWcLoading] = useState(false);

  async function onInitialize() {
    try {
      await configureSignClient();
      setInitializing(false);
    } catch (e) {
      console.error(e);
    }
  }

  const wciStore = useWCIStore();
  return (
    <IconButton
      className={
        text
          ? "mb-2 me-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium  hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
          : "mb-2 me-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium  hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
      }
      disable={wcLoading}
      toolTips={toolTipsAddr(WalletType.walletConnect)}
      isSelected={selectedWallet === WalletType.walletConnect}
      onClick={() => {
        const runner = async () => {
          setWcLoading(true);
          if (initializing) {
            await import("@web3modal/ui");
            await onInitialize();
          }
          setWcLoading(false);
          wciStore.setIsOpen(true);
          await walletConnectLogin();
          wciStore.setIsOpen(false);

          toast("WalletConnect session ended");
        };

        void runner();
      }}
      imageUrl="/images/icons/labstr.png"
      text={
        initializing && wcLoading
          ? "Initializing..."
          : text
            ? text
            : "Lobstr Connect"
      }
    />
  );
}