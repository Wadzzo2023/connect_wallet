import { useEffect, useState } from "react";
import IconButton from "./icon_button";
import { Dialog, DialogContent } from "./ui/dialog";

import { setCookie } from "cookies-next";
import { toast } from "react-hot-toast";

import {
  ArrowPathIcon,
  DocumentDuplicateIcon,
  SignalSlashIcon,
} from "@heroicons/react/24/solid";

import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import CopyToClipboard from "react-copy-to-clipboard";
import { twMerge } from "tailwind-merge";
import { WalletType } from "../lib/enums";
import { checkStellarAccountActivity } from "../lib/stellar/utils";
import { albedoLogin } from "../lib/stellar/wallet_clients/albedo_login";
import { facebookLogin } from "../lib/stellar/wallet_clients/facebook_login";
import { freighterLogin } from "../lib/stellar/wallet_clients/freighter_login";
import { googleLogin } from "../lib/stellar/wallet_clients/google_login";
import { rabetLogin } from "../lib/stellar/wallet_clients/rabe_login";
import {
  configureSignClient,
  walletConnectLogin,
} from "../lib/stellar/wallet_clients/wallet_connect";
import { addrShort } from "../lib/utils";
import { useDialogStore } from "../state/connect_wallet_dialog";
import { useConnectWalletStateStore } from "../state/connect_wallet_state";
import { useWCIStore } from "../state/wallect_connect_import";
import useFacebookiOSUserAgent from "./hook";
import LoginPage from "./login";
import Loading from "~/components/wallete/loading";
import { appleLogin } from "../lib/stellar/wallet_clients/apple_login";

interface ConnectDialogProps {
  className: string;
}

export default function ConnectDialog({ className }: ConnectDialogProps) {
  // const router = useRouter()
  // const [initializing, setInitializing] = useState(true);
  // const [wcLoading, setWcLoading] = useState(false);
  const [isAccountActivate, setAccountActivate] = useState(false);
  const [isAccountActivateLoading, setAccountActivateLoading] = useState(false);
  const [isEmailPassOpen, setEmailPassOpen] = useState(false);
  const dialogModalState = useDialogStore();

  const [selectedWallet, setSelectedWallet] = useState(WalletType.none);
  // const walletState = useConnectWalletStateStore();
  // const wciStore = useWCIStore();

  const isIosFBuser = useFacebookiOSUserAgent();

  const session = useSession();

  const iosFbToltipMsg =
    "Facebook Ios app don't support google login, try another browser";

  // function closeModal() {
  //   state.setIsOpen(false);
  // }

  async function disconnectWallet() {
    // TODO: Also disconnect firebase auth
    await signOut({
      redirect: false,
    });

    // walletState.removeUserDat();
  }

  async function checkAccountActivity(publicKey: string) {
    setAccountActivateLoading(true);
    setAccountActivate(await checkStellarAccountActivity(publicKey));
    setAccountActivateLoading(false);
  }

  const checkStatus = async () => {
    const user = session.data?.user;
    if (user) {
      await checkAccountActivity(user.id);
    }
  };

  // useEffect(() => {
  //   if (walletState.isAva && walletState.pubkey !== "") {
  //     setCookie("pubkey", walletState.pubkey, {
  //       sameSite: true,
  //     });
  //   }
  // }, [walletState.isAva]);

  function toolTipsAddr(wallateType: WalletType) {
    const user = session.data?.user;
    if (user && selectedWallet == wallateType) return addrShort(user.id, 10);
  }

  // const walletState = {
  //   isAva: session.status == "authenticated",
  //   pubkey: session.data!.user.id,
  //   walletType: WalletType.emailPass,
  // };

  function DisconnectButton() {
    if (session.status === "authenticated") {
      return (
        <div className="flex items-center gap-2 ">
          <span className="tooltip tooltip-right" data-tip="Disconnect wallet">
            <SignalSlashIcon
              onClick={disconnectWallet}
              className="aac-sbt h-5 w-5 cursor-pointer "
            />
          </span>
        </div>
      );
    }
  }
  useEffect(() => {
    void checkStatus();
    const w = session.data?.user.walletType;
    setSelectedWallet(w ?? WalletType.none);
  }, [session.status]);

  // console.log("selected Wallet", selectedWallet);

  if (session.status === "loading") return <Loading />;
  return (
    <Dialog
      open={dialogModalState.isOpen}
      onOpenChange={() => dialogModalState.setIsOpen(false)}
    >
      <DialogContent
        className={twMerge(
          "scrollbar-style !m-0 max-h-screen overflow-y-auto !rounded-xl bg-base-100  !p-3 ",
          className,
        )}
      >
        <div className="flex items-center justify-between ">
          <DisconnectButton />
          <AuthenticatedUser />
          <div />
        </div>

        <div className="relative">
          <NotActivatedUser />
          <div
            className={clsx(
              !isAccountActivate && session.status == "authenticated"
                ? "invisible"
                : "",
              "min-h-[300px]",
            )}
          >
            <h3 className="mb-3 mt-4 flex justify-between text-lg font-medium leading-6 tracking-wider">
              {isEmailPassOpen ? (
                <div className="mr-4 flex gap-4">
                  <ArrowLeft onClick={() => setEmailPassOpen(false)} />
                  <span>Login with email and password</span>
                </div>
              ) : (
                <span>Select Wallet</span>
              )}
            </h3>
            {isEmailPassOpen ? (
              <div className="flex h-full max-h-[300px] w-full items-center justify-center">
                <LoginPage />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <AllButtons />
                <div className="w-full ">
                  <div className="hidden w-full gap-4 sm:flex">
                    <IconButton
                      toolTips={toolTipsAddr(WalletType.frieghter)}
                      isSelected={selectedWallet == WalletType.frieghter}
                      onClick={() => {
                        return void freighterLogin();
                      }}
                      imageUrl="/images/wallets/freighter.png"
                      text="Freighter"
                    />
                    <IconButton
                      toolTips={toolTipsAddr(WalletType.rabet)}
                      isSelected={selectedWallet == WalletType.rabet}
                      onClick={() => {
                        return void rabetLogin();
                      }}
                      imageUrl="/images/wallets/rabet.png"
                      text="Rabet"
                    />
                  </div>
                </div>
                <div className="flex justify-center">
                  <button
                    className="btn btn-link text-center"
                    onClick={() => handleEmailPassLogin()}
                  >
                    Login with email and password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-5 text-center">
          Do not close this window or tap outside during this process.
        </div>
      </DialogContent>
    </Dialog>
  );
  function AllButtons() {
    return (
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        {/* <IconButton
          toolTips={toolTipsAddr(WalletType.facebook)}
          isSelected={selectedWallet == WalletType.facebook}
          onClick={() => void facebookLogin()}
          imageUrl="/images/wallets/facebook.png"
          text="Facebook"
        /> */}
        <IconButton
          toolTips={toolTipsAddr(WalletType.apple)}
          isSelected={selectedWallet == WalletType.apple}
          onClick={() => {
            return void appleLogin();
          }}
          imageUrl="/images/icons/apple.png"
          text="Apple"
        />

        <div
          className="tooltip"
          data-tip={isIosFBuser ? iosFbToltipMsg : undefined}
        >
          <IconButton
            toolTips={toolTipsAddr(WalletType.google)}
            isSelected={selectedWallet == WalletType.google}
            onClick={() => void googleLogin()}
            imageUrl="/images/wallets/google.png"
            text="Google"
            disable={isIosFBuser ?? false}
          />
        </div>
        <IconButton
          toolTips={toolTipsAddr(WalletType.albedo)}
          isSelected={selectedWallet == WalletType.albedo}
          onClick={() => {
            return void albedoLogin();
          }}
          imageUrl="/images/wallets/albedo.svg"
          text="Albedo"
        />
        <WCButton toolTipsAddr={toolTipsAddr} selectedWallet={selectedWallet} />
      </div>
    );
  }

  function handleEmailPassLogin() {
    setEmailPassOpen(true);
  }

  function AuthenticatedUser() {
    if (session.status === "loading") return <div>Loading...</div>;

    if (session.data && isAccountActivate) {
      const user = session.data.user;
      return (
        <div className="flex items-center gap-2 ">
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
        </div>
      );
    }
  }

  function NotActivatedUser() {
    if (session.data && !isAccountActivate) {
      return (
        <div className="absolute h-full w-full ">
          <div className="m-4 -mt-2 flex h-full flex-col items-center justify-center gap-3  text-center ">
            <p className="mb-4 text-xl font-bold">Account is not activated</p>
            <p>
              We generated this address for you. Please fund it to use it in
              future. Keep in mind that you’ll need to deposit 3 XLM (minimum)
              to use this account/address. Stellar locks 2 XLM as reserve. Every
              asset you claim/hold will consume 0.5 XLM each.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <CopyToClipboard
                text={session.data.user.id}
                onCopy={() =>
                  toast.success("Copied: " + addrShort(session.data.user.id))
                }
              >
                <button className="acc-bt flex items-center gap-2 bg-[#EA9168]/70 hover:bg-[#EB672A]/90">
                  <DocumentDuplicateIcon className="h-4 w-4 " />
                  Copy address
                </button>
              </CopyToClipboard>
              <button
                disabled={isAccountActivateLoading}
                onClick={() => void checkStatus()}
                className="acc-bt  flex justify-center bg-[#AEED7C]/70 hover:bg-[#76EB1A]/90 hover:text-slate-100/90"
              >
                Refresh
              </button>
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
      isSelected={selectedWallet == WalletType.walletConnect}
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
      text={initializing && wcLoading ? "Initializing..." : "WalletConnect"}
    />
  );
}
