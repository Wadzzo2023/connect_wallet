import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { DocumentDuplicateIcon, SignalSlashIcon } from "@heroicons/react/24/solid";
import {
  ArrowLeft,
  ArrowUpCircle,
  CheckCircle2,
  LogOut,
  QrCodeIcon,
  RefreshCcw,
  Wallet,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import clsx from "clsx";

import { WalletType } from "../lib/enums";
import { checkStellarAccountActivity } from "../lib/stellar/utils";
import { albedoLogin } from "../lib/stellar/wallet_clients/albedo_login";
import { appleLogin } from "../lib/stellar/wallet_clients/apple_login";
import { freighterLogin } from "../lib/stellar/wallet_clients/freighter_login";
import { googleLogin } from "../lib/stellar/wallet_clients/google_login";
import { metamaskLogin } from "../lib/stellar/wallet_clients/metamask_login";
import { rabetLogin } from "../lib/stellar/wallet_clients/rabe_login";
import { xbullLogin } from "../lib/stellar/wallet_clients/xbull_login";
import { hanaLogin } from "../lib/stellar/wallet_clients/hana_login";
import { hotWalletLogin } from "../lib/stellar/wallet_clients/hot_wallet_login";
import {
  configureSignClient,
  walletConnectLogin,
} from "../lib/stellar/wallet_clients/wallet_connect";
import { addrShort } from "../lib/utils";
import { useDialogStore } from "../state/connect_wallet_dialog";
import { useWCIStore } from "../state/wallect_connect_import";
import useFacebookiOSUserAgent from "./hook";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shadcn/ui/tabs";
import { Button } from "../shadcn/ui/button";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "../shadcn/ui/dialog";
import { AR_APP_FRAME_SELECTOR } from "../lib/host-frame";
import SignUpForm from "./sign_up";
import LoginForm from "./login";
import ForgotPasswordForm from "./forget-password";

type AuthView = "login" | "signup" | "forgot-password";
interface ConnectDialogProps {
  className: string;
}

function getWalletLabel(walletType: WalletType): string {
  switch (walletType) {
    case WalletType.frieghter:
      return "Stellar · Freighter Wallet";
    case WalletType.rabet:
      return "Stellar · Rabet Wallet";
    case WalletType.albedo:
      return "Stellar · Albedo Wallet";
    case WalletType.xBull:
      return "Stellar · xBull Wallet";
    case WalletType.hana:
      return "Stellar · Hana Wallet";
    case WalletType.hotWallet:
      return "Stellar · HOT Wallet";
    case WalletType.metamask:
      return "Stellar · MetaMask Wallet";
    case WalletType.walletConnect:
      return "Stellar · Lobstr Wallet";
    case WalletType.google:
      return "Action Account · Google";
    case WalletType.apple:
      return "Action Account · Apple";
    default:
      return "Action Account";
  }
}

// ─── Wallet button ────────────────────────────────────────────────────────────
function WalletButton({
  label,
  onClick,
  selected,
  tooltip,
  imageUrl,
  icon,
}: {
  label: string;
  onClick: () => void;
  selected: boolean;
  tooltip?: string;
  imageUrl?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div data-tip={tooltip} className={tooltip ? "tooltip w-full" : "w-full"}>
      <button
        onClick={onClick}
        className={clsx(
          "flex w-full items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-[transform,border-color] duration-150",
          "hover:border-foreground hover:-translate-y-0.5",
          selected
            ? "border-primary bg-primary/10 text-primary"
            : "border-foreground/12 bg-card text-card-foreground",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={label}
              width={28}
              height={28}
              className="rounded-full object-contain"
            />
          ) : (
            icon
          )}
        </span>
        <span className="flex-1 text-left">{label}</span>
        {selected && <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ConnectDialog({ className }: ConnectDialogProps) {
  const [authView, setAuthView] = useState<AuthView>("login");
  const [activeTab, setActiveTab] = useState<"action" | "stellar">("action");
  const [isAccountActivate, setAccountActivate] = useState(false);
  const [isAccountActivateLoading, setAccountActivateLoading] = useState(false);
  const dialogModalState = useDialogStore();
  const [selectedWallet, setSelectedWallet] = useState(WalletType.none);
  const isIosFBuser = useFacebookiOSUserAgent();
  const session = useSession();
  const [loading, setLoading] = useState(false);

  // True only inside wadzzoAR's phone-shaped device frame (see the note on
  // AR_APP_FRAME_SELECTOR) — everywhere else this package is used, including
  // any other project sharing this same submodule, `isFramedHost` stays
  // false and the dialog keeps its original wide two-column layout below.
  const [isFramedHost, setIsFramedHost] = useState(false);
  useEffect(() => {
    setIsFramedHost(!!document.querySelector(AR_APP_FRAME_SELECTOR));
  }, []);

  const checkAccountActivity = useCallback(async (publicKey: string) => {
    setAccountActivateLoading(true);
    const isActive = await checkStellarAccountActivity(publicKey);
    setAccountActivate(isActive);
    setAccountActivateLoading(false);
  }, []);

  const checkStatus = useCallback(async () => {
    const user = session.data?.user;
    if (user) {
      setLoading(true);
      await checkAccountActivity(user.id);
      setLoading(false);
    }
  }, [checkAccountActivity, session.data?.user]);

  // Plain browser navigation, not next/router or next/navigation: this
  // package is shared by Pages-Router and App-Router apps.
  const disconnectWallet = useCallback(async () => {
    await signOut({ redirect: false });
    window.location.reload();
  }, []);

  function toolTipsAddr(walletType: WalletType) {
    const user = session.data?.user;
    if (user && selectedWallet === walletType) return addrShort(user.id, 10);
  }

  useEffect(() => {
    void checkStatus();
    const w = session.data?.user.walletType;
    setSelectedWallet(w ?? WalletType.none);
  }, [checkStatus, session.data?.user.walletType]);

  const handleClose = () => {
    dialogModalState.setIsOpen(false);
  };

  useEffect(() => {
    if (dialogModalState.isOpen) {
      setAuthView("login");
      setActiveTab("action");
    }
  }, [dialogModalState.isOpen]);

  const authUser =
    session.status === "authenticated" && !!session.data?.user.emailVerified && isAccountActivate;

  const title = authUser
    ? "Switch account"
    : activeTab === "stellar"
      ? "Connect Wallet"
      : "Welcome back";
  const subtitle = authUser
    ? activeTab === "stellar"
      ? "Use another Stellar wallet"
      : "Use another email, Google or Apple account"
    : activeTab === "stellar"
      ? "Choose your Stellar wallet to sign in"
      : "Sign in to access your account";

  // ── Profile card ──
  // Who is signed in: a brand-colour cover with the avatar breaking out of it, the name, how they
  // signed in and their wallet address, plus copy and sign-out. The login tabs below it switch
  // to another account.
  function ProfileCard() {
    if (session.status !== "authenticated" || !session.data) return null;
    const user = session.data.user;
    const profile = dialogModalState.profile;
    const name = profile?.name ?? (user as { name?: string }).name ?? addrShort(user.id, 8);
    const image = profile?.image ?? (user as { image?: string | null }).image;
    const cover = profile?.coverImage;
    const initials = name.slice(0, 2).toUpperCase();
    const walletLabel = getWalletLabel(user.walletType ?? "");
    return (
      <div
        className={clsx(
          // full width of the column and flush with the dialog's top: cancel the panel's padding
          "border-foreground/10 bg-card shrink-0 overflow-hidden border-b-2",
          isFramedHost ? "-mx-4 -mt-10" : "-mx-6 -mt-6 lg:-mx-8 lg:-mt-5",
        )}
      >
        <div className="side-scope relative h-[4.5rem] bg-[hsl(var(--side-bg,var(--primary)))]">
          {cover ? (
            <>
              <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/10"
              />
            </>
          ) : (
            // no cover photo: a quiet dashed pattern on the brand colour
            <div
              aria-hidden
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, currentColor 0 2px, transparent 2px 14px)",
                color: "hsl(var(--side-ink, var(--primary-foreground)))",
              }}
            />
          )}
          {/* how they signed in, as a badge on the cover */}
          <span className="label-caps absolute top-3 right-4 rounded-full bg-black/55 px-2.5 py-1 text-[10px] text-white">
            {walletLabel}
          </span>
        </div>
        <div
          className={clsx("flex items-center gap-3 pb-3.5", isFramedHost ? "px-4" : "px-6 lg:px-8")}
        >
          <div className="border-card bg-primary text-primary-foreground relative z-10 -mt-7 flex size-16 shrink-0 items-center justify-center self-start overflow-hidden rounded-full border-4 text-lg font-bold">
            {image ? <img src={image} alt="" className="size-full object-cover" /> : initials}
          </div>
          <div className="min-w-0 flex-1 pt-1.5">
            <div className="flex items-center gap-1.5">
              <p className="display text-foreground truncate text-2xl">{name}</p>
              <CheckCircle2 className="text-primary size-4 shrink-0" />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground font-mono">
                {addrShort(user.id, 6)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5 pt-1.5">
            <button
              onClick={() => {
                void toast.promise(navigator.clipboard.writeText(user.id), {
                  loading: "Copying…",
                  success: "Address copied",
                  error: "Failed to copy",
                });
              }}
              title="Copy wallet address"
              aria-label="Copy wallet address"
              className="border-foreground/12 hover:border-foreground flex size-9 items-center justify-center rounded-xl border-2 transition-colors"
            >
              <DocumentDuplicateIcon className="size-4" />
            </button>
            <button
              onClick={disconnectWallet}
              title="Sign out"
              aria-label="Sign out"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 flex size-9 items-center justify-center rounded-xl border-2 transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Disconnect button ──
  function DisconnectButton() {
    if (session.status !== "authenticated") return null;
    return (
      <Button
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full rounded-xl py-2.5"
        onClick={disconnectWallet}
      >
        <SignalSlashIcon className="mr-2 h-4 w-4" />
        Disconnect Wallet
      </Button>
    );
  }

  // ── Not activated state ──
  function NotActivatedUser() {
    if (isAccountActivateLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <ArrowUpCircle className="text-muted-foreground h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Checking account status…</p>
        </div>
      );
    }
    if (session.data && !isAccountActivate) {
      return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
            <Wallet className="text-muted-foreground h-7 w-7" />
          </div>
          <div>
            <p className="text-base font-semibold">Account not activated</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Fund your Stellar account to activate it, then refresh.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const id = session.data.user.id;
                void navigator.clipboard
                  .writeText(id)
                  .then(() => toast.success("Copied: " + addrShort(id)));
              }}
            >
              <DocumentDuplicateIcon className="mr-1.5 h-3.5 w-3.5" />
              Copy address
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isAccountActivateLoading}
              onClick={() => void checkStatus()}
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      );
    }
    return null;
  }

  // ── Social auth buttons ──
  function SocialButtons() {
    return (
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
        <button
          onClick={() => void appleLogin()}
          className="border-foreground/12 bg-card text-card-foreground hover:border-foreground flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 px-4 text-sm font-bold whitespace-nowrap transition-[transform,border-color] duration-150 hover:-translate-y-0.5 disabled:opacity-50"
        >
          <svg className="size-[18px]" viewBox="0 0 384 512" fill="currentColor" aria-hidden>
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
          </svg>
          Apple
        </button>

        <span className="marker text-muted-foreground text-xs">or</span>

        <button
          onClick={() => void googleLogin()}
          disabled={isIosFBuser ?? false}
          className="border-foreground/12 bg-card text-card-foreground hover:border-foreground flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 px-4 text-sm font-bold whitespace-nowrap transition-[transform,border-color] duration-150 hover:-translate-y-0.5 disabled:opacity-50"
        >
          <svg className="size-[18px]" viewBox="0 0 48 48" aria-hidden>
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
            />
          </svg>
          Google
        </button>
      </div>
    );
  }

  // ── Action tab content ──
  function ActionTabContent() {
    return (
      <div className="flex flex-col gap-4">
        {authView === "login" && (
          <>
            <LoginForm onForgotPassword={() => setAuthView("forgot-password")} />

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="border-foreground/15 w-full border-t-2 border-dashed" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background marker text-muted-foreground px-2">
                  or continue with
                </span>
              </div>
            </div>

            <SocialButtons />

            {/* already signed in: switching accounts doesn't need the sign-up prompt */}
            {!authUser && (
              <p className="text-muted-foreground text-center text-sm">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthView("signup")}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign up
                </button>
              </p>
            )}
          </>
        )}

        {authView === "signup" && (
          <>
            <button
              type="button"
              onClick={() => setAuthView("login")}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </button>
            <SignUpForm onSuccess={() => setAuthView("login")} />
          </>
        )}

        {authView === "forgot-password" && (
          <>
            <button
              type="button"
              onClick={() => setAuthView("login")}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </button>
            <ForgotPasswordForm />
          </>
        )}
      </div>
    );
  }

  // ── Stellar wallets grid ──
  function StellarTabContent() {
    return (
      <div className="flex flex-col gap-2">
        {authUser && <p className="text-muted-foreground text-xs font-medium">Switch wallet</p>}

        <div className="grid grid-cols-2 gap-2">
          <WalletButton
            label="Freighter"
            onClick={() => void freighterLogin()}
            selected={selectedWallet === WalletType.frieghter}
            tooltip={toolTipsAddr(WalletType.frieghter)}
            imageUrl="/images/wallets/freighter.png"
          />
          <WalletButton
            label="Rabet"
            onClick={() => void rabetLogin()}
            selected={selectedWallet === WalletType.rabet}
            tooltip={toolTipsAddr(WalletType.rabet)}
            imageUrl="/images/wallets/rabet.png"
          />
          <WalletButton
            label="Albedo"
            onClick={() => void albedoLogin()}
            selected={selectedWallet === WalletType.albedo}
            tooltip={toolTipsAddr(WalletType.albedo)}
            imageUrl="/images/wallets/albedo.svg"
          />
          <WalletButton
            label="xBull"
            onClick={() => void xbullLogin()}
            selected={selectedWallet === WalletType.xBull}
            tooltip={toolTipsAddr(WalletType.xBull)}
            imageUrl="/images/wallets/xbull-dark.svg"
          />
          <WalletButton
            label="Hana"
            onClick={() => void hanaLogin()}
            selected={selectedWallet === WalletType.hana}
            tooltip={toolTipsAddr(WalletType.hana)}
            icon={
              <svg viewBox="0 0 200 200" fill="none" className="h-6 w-6">
                <circle cx="100" cy="100" r="100" fill="#7B3FE4" />
                <path d="M60 140V60h20v32h40V60h20v80h-20v-32H80v32H60z" fill="white" />
              </svg>
            }
          />
          <WalletButton
            label="MetaMask"
            onClick={() => void metamaskLogin()}
            selected={selectedWallet === WalletType.metamask}
            tooltip={toolTipsAddr(WalletType.metamask)}
            icon={
              <svg viewBox="0 0 35 33" fill="none" className="h-6 w-6">
                <path
                  d="M32.958 1L19.414 10.985l2.544-6.01L32.958 1z"
                  fill="#E17726"
                  stroke="#E17726"
                  strokeWidth=".25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2.042 1l13.43 10.08-2.42-6.104L2.042 1zM28.17 23.533l-3.604 5.52 7.712 2.123 2.21-7.528-6.318-.115zM.528 23.648l2.196 7.528 7.698-2.123-3.59-5.52-6.304.115z"
                  fill="#E27625"
                  stroke="#E27625"
                  strokeWidth=".25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.06 14.367l-2.139 3.234 7.626.345-.258-8.199-5.229 4.62zM24.94 14.367l-5.3-4.72-.172 8.299 7.611-.345-2.139-3.234zM10.422 29.053l4.592-2.22-3.965-3.09-.627 5.31zM19.986 26.833l4.577 2.22-.612-5.31-3.965 3.09z"
                  fill="#E27625"
                  stroke="#E27625"
                  strokeWidth=".25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M24.563 29.053l-4.577-2.22.37 2.983-.043 1.308 4.25-2.071zM10.422 29.053l4.264 2.071-.028-1.308.356-2.983-4.592 2.22z"
                  fill="#D5BFB2"
                  stroke="#D5BFB2"
                  strokeWidth=".25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14.757 21.847l-3.821-1.122 2.696-1.236 1.125 2.358zM20.228 21.847l1.125-2.358 2.71 1.236-3.835 1.122z"
                  fill="#233447"
                  stroke="#233447"
                  strokeWidth=".25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.422 29.053l.655-5.52-4.246.115 3.591 5.405zM23.923 23.533l.64 5.52 3.591-5.405-4.231-.115zM27.082 17.601l-7.611.345.713 3.901 1.125-2.358 2.71 1.236 3.063-3.124zM10.936 20.725l2.696-1.236 1.11 2.358.727-3.901-7.626-.345 3.093 3.124z"
                  fill="#CC6228"
                  stroke="#CC6228"
                  strokeWidth=".25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.921 17.601l3.192 6.232-.1-3.108-3.092-3.124zM23.001 20.725l-.115 3.108 3.192-6.232-3.077 3.124zM15.663 17.946l-.727 3.901.912 4.706.199-6.203-.384-2.404zM19.47 17.946l-.37 2.39.185 6.217.912-4.706-.727-3.901z"
                  fill="#E27525"
                  stroke="#E27525"
                  strokeWidth=".25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20.228 21.847l-.912 4.706.655.46 3.965-3.09.115-3.108-3.823 1.032zM10.936 20.725l.1 3.108 3.965 3.09.655-.46-.912-4.706-3.808-1.032z"
                  fill="#F5841F"
                  stroke="#F5841F"
                  strokeWidth=".25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20.284 31.124l.043-1.308-.342-.3h-5.043l-.328.3.028 1.308-4.264-2.071 1.494 1.222 3.022 2.094h5.2l3.035-2.094 1.48-1.222-4.325 2.071z"
                  fill="#C0AC9D"
                  stroke="#C0AC9D"
                  strokeWidth=".25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.986 26.833l-.655-.46h-3.791l-.655.46-.356 2.983.328-.3h5.043l.342.3-.256-2.983z"
                  fill="#161616"
                  stroke="#161616"
                  strokeWidth=".25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M33.516 11.3l1.152-5.563L32.958 1 19.986 10.67l4.954 4.188 7.001 2.043 1.55-1.808-.67-.49 1.066-.97-.826-.634 1.066-.813-.611-.885zM.332 5.737L1.484 11.3l-.626.885 1.08.813-.84.634 1.066.97-.67.49 1.536 1.808 7.001-2.043 4.954-4.188L2.042 1 .332 5.737z"
                  fill="#763E1A"
                  stroke="#763E1A"
                  strokeWidth=".25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M31.941 16.901l-7.001-2.043 2.139 3.234-3.192 6.232 4.217-.058h6.304l-2.467-7.365zM10.06 14.858L3.059 16.9.592 24.266h6.29l4.203.058-3.178-6.232 2.153-3.234zM19.47 17.946l.441-7.676 2.002-5.415h-8.913l1.988 5.415.456 7.676.17 2.418.014 6.189h3.791l.028-6.189.185-2.418z"
                  fill="#F5841F"
                  stroke="#F5841F"
                  strokeWidth=".25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <WalletButton
            label="HOT Wallet"
            onClick={() => void hotWalletLogin()}
            selected={selectedWallet === WalletType.hotWallet}
            tooltip={toolTipsAddr(WalletType.hotWallet)}
            imageUrl="https://storage.herewallet.app/logo.png"
          />
          {/* Complementary with the right panel's own Lobstr button, not
              redundant with it: this tile is the ONLY way to reach
              Lobstr/WalletConnect once that panel is narrow (`lg:hidden`,
              real viewport) or hidden outright for the framed host, which
              has no viewport width at which the panel ever reappears. Without
              the `isFramedHost` half of this condition, a framed host
              reviewed at normal desktop width — which is how this app is
              meant to be looked at — would show Lobstr in neither place. */}
          <div className={isFramedHost ? undefined : "lg:hidden"}>
            <WCButton
              toolTipsAddr={toolTipsAddr}
              selectedWallet={selectedWallet}
              text="Lobstr"
              inGrid
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={dialogModalState.isOpen} onOpenChange={handleClose}>
      {/* Not-activated state — compact dialog */}
      {session.status === "authenticated" &&
      session.data?.user.emailVerified &&
      !isAccountActivateLoading &&
      !isAccountActivate ? (
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogTitle className="sr-only">Account Status</DialogTitle>
          <NotActivatedUser />
          <div className="mt-4">
            <DisconnectButton />
          </div>
        </DialogContent>
      ) : (
        /* Main dialog — inlined to prevent remounting.
           Two layouts, chosen by `isFramedHost`: the original wide
           two-column grid (unchanged, for every other consumer of this
           shared package), or a single column capped to a phone-comfortable
           width for wadzzoAR's device frame — Tailwind's `lg:` variants key
           off the real browser viewport, not that frame's width, so left
           alone the two-column grid would still activate on any wide screen
           and cram a 280px side panel into a ~400px box. */
        <DialogContent
          className={
            isFramedHost
              ? clsx(
                  "mx-auto flex w-full max-w-[420px] flex-col gap-0 overflow-hidden p-0",
                  authUser ? "h-[85vh]" : "h-[80vh]",
                )
              : clsx(
                  // as tall as its content (no inner scroll), never shorter than the email view so switching tabs
                  // doesn't resize it; the 92dvh cap only matters on very short screens
                  "border-foreground/15 flex max-w-[820px] gap-0 overflow-hidden rounded-[1.6rem] border-2 p-0 shadow-[10px_11px_0_0_hsl(var(--primary))] lg:grid lg:min-h-[min(624px,92dvh)] lg:grid-cols-[1fr_290px] lg:grid-rows-[minmax(0,1fr)]",
                )
          }
        >
          {/* ── Left panel ── */}
          <div
            className={clsx(
              "flex min-h-0 w-full flex-1 flex-col overflow-y-auto",
              isFramedHost
                ? "gap-4 px-4 pt-10 pb-4"
                : authUser
                  ? "gap-3 p-6 lg:px-8 lg:py-5"
                  : "gap-4 p-6 lg:px-8 lg:py-7",
            )}
          >
            {/* Unverified email banner */}
            {session.data?.user && !session.data.user.emailVerified && (
              <div className="bg-secondary/60 rounded-xl border p-4">
                <p className="text-foreground text-sm font-semibold">{session.data.user.email}</p>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  Please verify your email before continuing.
                </p>
                <Button size="sm" variant="outline" className="mt-3" onClick={disconnectWallet}>
                  <SignalSlashIcon className="mr-1.5 h-3.5 w-3.5" />
                  Logout
                </Button>
              </div>
            )}

            {/* Profile card */}
            {authUser && <ProfileCard />}

            {/* Header */}
            <div>
              <DialogTitle
                className={clsx("display text-foreground", authUser ? "text-3xl" : "text-[2.6rem]")}
              >
                {title}
              </DialogTitle>
              <p className="marker text-primary mt-2 -rotate-1 text-sm">{subtitle}</p>
            </div>

            {/* Tabs — controlled so switching is stable */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "action" | "stellar")}
              className="w-full"
            >
              <TabsList className="bg-surface-2 grid h-12 w-full grid-cols-2 rounded-2xl p-1">
                <TabsTrigger
                  value="action"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground font-hud rounded-xl text-sm tracking-wide uppercase data-[state=active]:shadow-none dark:data-[state=active]:border-transparent"
                >
                  Action Login
                </TabsTrigger>
                <TabsTrigger
                  value="stellar"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground font-hud rounded-xl text-sm tracking-wide uppercase data-[state=active]:shadow-none dark:data-[state=active]:border-transparent"
                >
                  Stellar Login
                </TabsTrigger>
              </TabsList>
              <TabsContent value="action" className={authUser ? "mt-2" : "mt-4"}>
                <ActionTabContent />
              </TabsContent>
              <TabsContent value="stellar" className={authUser ? "mt-2" : "mt-4"}>
                <StellarTabContent />
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Right panel ──
              Desktop-only marketing panel (QR code, "scan to connect") from
              the original wide two-column layout. Hidden outright in the
              framed host rather than left on its original `lg:flex` trigger,
              since that keys off the real browser viewport and would still
              fire on any wide screen even though the dialog itself no longer
              renders as a two-column box there. Nothing is lost when it's
              hidden: Lobstr/WalletConnect is still the "Lobstr" tile in the
              Stellar wallet grid below (`WCButton ... inGrid`). Every other
              consumer of this shared package keeps the original panel. */}
          <div
            className={
              isFramedHost
                ? "hidden"
                : "bg-primary/10 dark:bg-primary/15 text-foreground border-foreground/10 relative hidden flex-col overflow-hidden border-l-2 lg:flex"
            }
          >
            <div className="p-6 pb-3">
              <p className="marker text-primary text-sm">*scan to connect*</p>
              <h3 className="display mt-2 text-4xl">Action Auth System</h3>
            </div>

            <div className="flex flex-1 items-center justify-center px-6">
              <div className="bg-card border-foreground/10 relative flex h-44 w-full -rotate-2 items-center justify-center overflow-hidden rounded-2xl border-2">
                {/* QR blurred watermark */}
                <QrCodeIcon className="text-foreground absolute h-36 w-36 scale-110 opacity-10" />
                {/* Button centred on top */}
                <div className="relative z-10 w-full px-2">
                  <WCButton
                    toolTipsAddr={toolTipsAddr}
                    selectedWallet={selectedWallet}
                    text="Continue with Lobstr"
                    onDark
                  />
                </div>
              </div>
            </div>

            <div className="p-6 pt-3">
              <button
                onClick={() =>
                  (window.location.href =
                    "https://github.com/Lobstrco/lobstr-browser-extension/tree/main")
                }
                className="bg-card border-foreground/10 hover:border-foreground flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors"
              >
                <Image
                  src="/images/icons/labstr.png"
                  alt="Lobstr"
                  width={32}
                  height={32}
                  className="shrink-0 rounded-full"
                />
                <div>
                  <p className="marker text-muted-foreground text-[11px]">works with</p>
                  <p className="display text-xl">Lobstr Mobile App</p>
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

// ─── WalletConnect button ─────────────────────────────────────────────────────
function WCButton({
  toolTipsAddr,
  selectedWallet,
  text,
  onDark = false,
  inGrid = false,
}: {
  toolTipsAddr: (walletType: WalletType) => string | undefined;
  selectedWallet: WalletType;
  text?: string;
  onDark?: boolean;
  inGrid?: boolean;
}) {
  const [initializing, setInitializing] = useState(true);
  const [wcLoading, setWcLoading] = useState(false);
  const wciStore = useWCIStore();

  async function onInitialize() {
    try {
      await configureSignClient();
      setInitializing(false);
    } catch (e) {
      console.error(e);
    }
  }

  const isSelected = selectedWallet === WalletType.walletConnect;
  const tooltip = toolTipsAddr(WalletType.walletConnect);

  return (
    <div data-tip={tooltip} className={tooltip ? "tooltip w-full" : "w-full"}>
      <button
        disabled={wcLoading}
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
        className={clsx(
          "flex w-full items-center gap-2.5 rounded-xl border-2 text-sm font-bold transition-[transform,border-color,background-color] duration-150 disabled:opacity-60",
          inGrid ? "px-3 py-2" : "justify-center px-4 py-2.5",
          isSelected
            ? "border-primary bg-primary/10 ring-primary/30 text-primary hover:bg-primary/20 ring-1"
            : onDark
              ? "border-primary bg-primary text-primary-foreground hover:-translate-y-0.5"
              : "border-foreground/12 bg-card text-card-foreground hover:border-foreground hover:-translate-y-0.5",
        )}
      >
        <span
          className={clsx("flex shrink-0 items-center justify-center", inGrid ? "h-7 w-7" : "")}
        >
          <Image
            src="/images/icons/labstr.png"
            alt="Lobstr"
            width={inGrid ? 28 : 20}
            height={inGrid ? 28 : 20}
            className="rounded-full object-contain"
          />
        </span>
        {text && (
          <span className="whitespace-nowrap">
            {wcLoading && initializing ? "Initializing…" : text}
          </span>
        )}
        {isSelected && <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />}
      </button>
    </div>
  );
}
