import { useCallback, useEffect, useState } from "react";
import IconButton from "./icon_button";
import { Dialog, DialogContent } from "./ui/dialog";
import { toast } from "react-hot-toast";
import {
  ArrowPathIcon,
  DocumentDuplicateIcon,
  SignalSlashIcon,
} from "@heroicons/react/24/solid";

import {
  ArrowLeft,
  BadgeCheck,
  BadgeX,
  QrCodeIcon,
  RefreshCcw,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import CopyToClipboard from "react-copy-to-clipboard";

import Loading from "~/components/wallete/loading";
import { WalletType } from "../lib/enums";
import { checkStellarAccountActivity } from "../lib/stellar/utils";
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

interface ConnectDialogProps {
  className: string;
}

export default function ConnectDialog({ className }: ConnectDialogProps) {
  const [isAccountActivate, setAccountActivate] = useState(false);
  const [isAccountActivateLoading, setAccountActivateLoading] = useState(false);

  const dialogModalState = useDialogStore();
  const [selectedWallet, setSelectedWallet] = useState(WalletType.none);
  const isIosFBuser = useFacebookiOSUserAgent();
  const session = useSession();

  async function disconnectWallet() {
    await signOut({ redirect: true, callbackUrl: "/" });
  }

  async function checkAccountActivity(publicKey: string) {
    setAccountActivateLoading(true);
    const isActive = await checkStellarAccountActivity(publicKey);
    setAccountActivate(isActive);
    setAccountActivateLoading(false);
  }

  const checkStatus = useCallback(async () => {
    const user = session.data?.user;
    if (user) {
      await checkAccountActivity(user.id);
    }
  }, [session]);

  function toolTipsAddr(wallateType: WalletType) {
    const user = session.data?.user;
    if (user && selectedWallet === wallateType) return addrShort(user.id, 10);
  }

  function DisconnectButton() {
    if (session.status === "authenticated") {
      return (
        <div className="flex items-center gap-2 ">
          <Button variant="destructive" onClick={disconnectWallet}>
            <SignalSlashIcon className="aac-sbt mr-2 h-5 w-5 cursor-pointer " />
            Disconnect Wallet
          </Button>
        </div>
      );
    }
  }
  useEffect(() => {
    void checkStatus();
    const w = session.data?.user.walletType;
    setSelectedWallet(w ?? WalletType.none);
  }, [checkStatus, session]);

  if (session.status === "loading") return <Loading />;

  const handleClose = () => {
    dialogModalState.setIsOpen(false);
  };

  return (
    <Dialog open={dialogModalState.isOpen} onOpenChange={handleClose}>
      {session.status === "authenticated" ? (
        session.data && isAccountActivate ? (
          <>
            <WalletLogin authUser={true} />
          </>
        ) : (
          <>
            <DialogContent className=" items-between md:h-ful grid h-1/2 min-h-[600px]  grid-cols-1 justify-center md:h-fit ">
              <div className="flex flex-col items-center justify-between">
                <div></div>
                <div className="flex items-center justify-center">
                  <NotActivatedUser />
                </div>
                <div>
                  <DisconnectButton />
                </div>
              </div>
            </DialogContent>
          </>
        )
      ) : (
        <>
          <WalletLogin authUser={false} />
        </>
      )}
    </Dialog>
  );

  function AllButtons() {
    return (
      <div className="flex flex-col gap-2">
        <IconButton
          toolTips={toolTipsAddr(WalletType.apple)}
          isSelected={selectedWallet === WalletType.apple}
          onClick={() => void appleLogin()}
          imageUrl="/images/icons/apple.png"
          darkImageUrl="/images/wallets/apple-white.png"
          text="CONTINUE WITH APPLE"
        />
        <IconButton
          toolTips={toolTipsAddr(WalletType.google)}
          isSelected={selectedWallet === WalletType.google}
          onClick={() => void googleLogin()}
          imageUrl="/images/wallets/google-white.png"
          darkImageUrl="/images/wallets/google-white.png"
          text="CONTINUE WITH GOOGLE"
          disable={isIosFBuser ?? false}
        />
      </div>
    );
  }

  function WalletLogin({ authUser }: { authUser: boolean }) {
    return (
      <>
        <DialogContent className=" grid min-h-[600px] w-full grid-cols-1 overflow-y-auto p-2 md:max-w-fit lg:grid-cols-3">
          <div className="flex flex-1 flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900 md:p-12 lg:col-span-2">
            <div className="max-w-md space-y-6">
              {authUser ? (
                <div className="flex items-center justify-center">
                  <div>
                    <AuthenticatedUser />
                  </div>
                </div>
              ) : (
                <></>
              )}
              <div className="space-y-2 text-center">
                <div className="p-2 text-3xl  font-bold text-black dark:text-white md:hidden">
                  <Label>ACTION AUTH SYSTEM </Label>
                </div>

                <p className="text-gray-500 dark:text-gray-400">
                  Enter your credentials to access your account
                </p>
              </div>

              <Tabs defaultValue="action">
                <TabsList className="mb-5 grid grid-cols-2 bg-black dark:bg-white">
                  <TabsTrigger value="action">Action Login</TabsTrigger>
                  <TabsTrigger value="stellar">Stellar Login</TabsTrigger>
                </TabsList>
                <TabsContent value="action">
                  <div className="w-full space-y-4">
                    <LoginPage />
                    <AllButtons />
                  </div>
                </TabsContent>
                <TabsContent value="stellar">
                  <div className="grid grid-cols-2 gap-1">
                    <IconButton
                      toolTips={toolTipsAddr(WalletType.frieghter)}
                      isSelected={selectedWallet === WalletType.frieghter}
                      onClick={() => void freighterLogin()}
                      imageUrl="/images/wallets/freighter.png"
                      text="Freighter"
                    />
                    <IconButton
                      toolTips={toolTipsAddr(WalletType.rabet)}
                      isSelected={selectedWallet === WalletType.rabet}
                      onClick={() => void rabetLogin()}
                      imageUrl="/images/wallets/rabet.png"
                      text="Rabet"
                    />
                    <IconButton
                      toolTips={toolTipsAddr(WalletType.albedo)}
                      isSelected={selectedWallet === WalletType.albedo}
                      onClick={() => void albedoLogin()}
                      imageUrl="/images/wallets/albedo.svg"
                      text="Albedo"
                    />
                    <div className="sm:hidden">
                      <WCButton
                        toolTipsAddr={toolTipsAddr}
                        selectedWallet={selectedWallet}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              {authUser && (
                <div className="md:text-md text-sm  ">
                  <span>
                    <i className="font-semibold text-red-500">
                      {" "}
                      DON{"'"}T TAP OUTSIDE THE MODAL WHILE CONNECTING WALLET OR
                      TRANSACTION PROCESS
                    </i>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="hidden h-full flex-col items-center justify-between lg:flex">
            <div className="flex w-full flex-col items-center justify-center p-6 font-bold text-black dark:text-white">
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
                />
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full p-6 text-start text-xs"
            >
              WORKS WITH <br /> LOBSTR MOBILE APP
            </Button>
          </div>
        </DialogContent>
      </>
    );
  }

  function AuthenticatedUser() {
    if (session.status === "loading") return <div>Loading...</div>;

    if (session.data && isAccountActivate) {
      const user = session.data.user;
      return (
        <Badge
          variant="destructive"
          className="flex items-center gap-2 rounded-xl text-sm font-bold md:text-lg "
        >
          {isAccountActivateLoading ? (
            <span
              data-tip="Checking is account activated or not"
              className="tooltip tooltip-bottom "
            >
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            </span>
          ) : (
            <></>
          )}
          <CopyToClipboard
            text={user.id}
            onCopy={() => toast.success("Copied: " + addrShort(user.id))}
          >
            <span className=" flex cursor-pointer items-center gap-2 font-semibold hover:bg-slate-300/10">
              {addrShort(user.id, 10)}{" "}
              <span data-tip="Copy address" className="tooltip tooltip-right">
                <DocumentDuplicateIcon className="h-4 w-4 " />
              </span>
            </span>
          </CopyToClipboard>
        </Badge>
      );
    }
  }

  function NotActivatedUser() {
    console.log("isAccountActivate", isAccountActivate);
    if (isAccountActivateLoading)
      return (
        <div className=" h-full w-full  ">
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center ">
            <p className="flex items-center justify-center text-xl font-bold">
              Checking account status
              <ArrowLeft className="ml-2 h-4 w-4 animate-spin" />
            </p>
          </div>
        </div>
      );

    if (session.data && !isAccountActivate) {
      return (
        <div className=" h-full w-full  ">
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center ">
            <p className="flex items-center justify-center text-xl font-bold">
              Account is not activated!
              <BadgeX className="ml-2 h-4 w-4" color="red" />
            </p>
            <p>
              We generated this address for you. Please fund it to use it in
              future. Keep in mind that{" "}
              <b>
                you’ll need to deposit 3 XLM (minimum) to use this
                account/address
              </b>
              . Stellar locks 2 XLM as reserve. Every asset you claim/hold will
              consume 0.5 XLM each.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <CopyToClipboard
                text={session.data.user.id}
                onCopy={() =>
                  toast.success("Copied: " + addrShort(session.data.user.id))
                }
              >
                <Button className="bg-sky-500 hover:bg-sky-700">
                  <DocumentDuplicateIcon className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </CopyToClipboard>
              <Button
                disabled={isAccountActivateLoading}
                onClick={() => void checkStatus()}
                className="bg-violet-500 hover:bg-violet-600 focus:outline-none focus:ring focus:ring-violet-300 active:bg-violet-700"
              >
                <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }
}

function WCButton({
  toolTipsAddr,
  selectedWallet,
}: {
  toolTipsAddr: (walletType: WalletType) => string | undefined;
  selectedWallet: WalletType;
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
      imageUrl="/images/wallets/walletconnect.png"
      text={initializing && wcLoading ? "Initializing..." : "QR CONNECT"}
    />
  );
}
