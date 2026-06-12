import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { DocumentDuplicateIcon, SignalSlashIcon } from "@heroicons/react/24/solid";
import { ArrowLeft, ArrowUpCircle, CheckCircle2, QrCodeIcon, RefreshCcw, Wallet } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import CopyToClipboard from "react-copy-to-clipboard";
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
import { configureSignClient, walletConnectLogin } from "../lib/stellar/wallet_clients/wallet_connect";
import { addrShort } from "../lib/utils";
import { useDialogStore } from "../state/connect_wallet_dialog";
import { useWCIStore } from "../state/wallect_connect_import";
import useFacebookiOSUserAgent from "./hook";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shadcn/ui/tabs";
import { Button } from "../shadcn/ui/button";
import Image from "next/image";
import { useRouter } from "next/router";
import { Dialog, DialogContent, DialogTitle } from "../shadcn/ui/dialog";
import SignUpForm from "./sign_up";
import LoginForm from "./login";
import ForgotPasswordForm from "./forget-password";

type AuthView = "login" | "signup" | "forgot-password";
interface ConnectDialogProps { className: string }

function getWalletLabel(walletType: WalletType): string {
  switch (walletType) {
    case WalletType.frieghter: return "Stellar · Freighter Wallet";
    case WalletType.rabet: return "Stellar · Rabet Wallet";
    case WalletType.albedo: return "Stellar · Albedo Wallet";
    case WalletType.xBull: return "Stellar · xBull Wallet";
    case WalletType.hana: return "Stellar · Hana Wallet";
    case WalletType.hotWallet: return "Stellar · HOT Wallet";
    case WalletType.metamask: return "Stellar · MetaMask Wallet";
    case WalletType.walletConnect: return "Stellar · Lobstr Wallet";
    case WalletType.google: return "Action Account · Google";
    case WalletType.apple: return "Action Account · Apple";
    default: return "Action Account";
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
          "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-150",
          "hover:border-primary/50 hover:bg-muted",
          selected
            ? "border-primary bg-primary/10 ring-1 ring-primary/30 "
            : "border-border bg-card text-card-foreground",
        )}
      >
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center">
          {imageUrl ? (
            <Image src={imageUrl} alt={label} width={28} height={28} className="rounded-full object-contain" />
          ) : (
            icon
          )}
        </span>
        <span className="flex-1 text-left">{label}</span>
        {selected && <CheckCircle2 className="h-4 w-4 flex-shrink-0 " />}
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
  const router = useRouter();
  const dialogModalState = useDialogStore();
  const [selectedWallet, setSelectedWallet] = useState(WalletType.none);
  const isIosFBuser = useFacebookiOSUserAgent();
  const session = useSession();
  const [loading, setLoading] = useState(false);

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

  const disconnectWallet = useCallback(async () => {
    await signOut({ redirect: false });
    router.reload();
  }, [router]);

  function toolTipsAddr(walletType: WalletType) {
    const user = session.data?.user;
    if (user && selectedWallet === walletType) return addrShort(user.id, 10);
  }

  useEffect(() => {
    void checkStatus();
    const w = session.data?.user.walletType;
    setSelectedWallet(w ?? WalletType.none);
  }, [checkStatus, session.data?.user.walletType]);

  const handleClose = () => { dialogModalState.setIsOpen(false); };

  useEffect(() => {
    if (dialogModalState.isOpen) {
      setAuthView("login");
      setActiveTab("action");
    }
  }, [dialogModalState.isOpen]);

  const authUser =
    session.status === "authenticated" &&
    !!session.data?.user.emailVerified &&
    isAccountActivate;

  const title = activeTab === "stellar" ? "Connect Wallet" : "Welcome back";
  const subtitle =
    activeTab === "stellar"
      ? authUser
        ? "Your Stellar wallet is connected"
        : "Choose your Stellar wallet to sign in"
      : "Sign in to access your account";

  // ── Profile card ──
  function ProfileCard() {
    if (session.status !== "authenticated" || !session.data) return null;
    const user = session.data.user;
    const name = (user as { name?: string }).name ?? addrShort(user.id, 8);
    const initials = name.slice(0, 2).toUpperCase();
    const walletLabel = getWalletLabel(user.walletType ?? "");
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 " />
          </div>
          <p className="text-xs text-muted-foreground">{walletLabel}</p>
        </div>
        <CopyToClipboard text={user.id} onCopy={() => toast.success("Copied!")}>
          <button className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <DocumentDuplicateIcon className="h-4 w-4" />
          </button>
        </CopyToClipboard>
      </div>
    );
  }

  // ── Disconnect button ──
  function DisconnectButton() {
    if (session.status !== "authenticated") return null;
    return (
      <Button
        className="w-full rounded-xl bg-destructive py-2.5 text-destructive-foreground hover:bg-destructive/90"
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
          <ArrowUpCircle className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Checking account status…</p>
        </div>
      );
    }
    if (session.data && !isAccountActivate) {
      return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Wallet className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-semibold">Account not activated</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Fund your Stellar account to activate it, then refresh.
            </p>
          </div>
          <div className="flex gap-2">
            <CopyToClipboard
              text={session.data.user.id}
              onCopy={() => toast.success("Copied: " + addrShort(session.data.user.id))}
            >
              <Button variant="outline" size="sm">
                <DocumentDuplicateIcon className="mr-1.5 h-3.5 w-3.5" />
                Copy address
              </Button>
            </CopyToClipboard>
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
      <div className="flex flex-col gap-2.5">
        <button
          onClick={() => void appleLogin()}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:bg-foreground/90"
        >
          <svg className="h-4 w-4" viewBox="0 0 384 512" fill="currentColor">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
          </svg>
          Continue with Apple
        </button>

        <button
          onClick={() => void googleLogin()}
          disabled={isIosFBuser ?? false}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 18 19" fill="currentColor">
            <path fillRule="evenodd" d="M8.842 18.083a8.8 8.8 0 0 1-8.65-8.948 8.841 8.841 0 0 1 8.8-8.652h.153a8.464 8.464 0 0 1 5.7 2.257l-2.193 2.038A5.27 5.27 0 0 0 9.09 3.4a5.882 5.882 0 0 0-.2 11.76h.124a5.091 5.091 0 0 0 5.248-4.057L14.3 11H9V8h8.34c.066.543.095 1.09.088 1.636-.086 5.053-3.463 8.449-8.4 8.449l-.186-.002Z" clipRule="evenodd" />
          </svg>
          Continue with Google
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
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or continue with</span>
              </div>
            </div>

            <SocialButtons />

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setAuthView("signup")}
                className="font-semibold  hover:underline"
              >
                Sign up
              </button>
            </p>
          </>
        )}

        {authView === "signup" && (
          <>
            <button
              type="button"
              onClick={() => setAuthView("login")}
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
      <div className="flex flex-col gap-4">
        {authUser && (
          <p className="text-xs font-medium text-muted-foreground">Switch wallet</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <WalletButton label="Freighter" onClick={() => void freighterLogin()} selected={selectedWallet === WalletType.frieghter} tooltip={toolTipsAddr(WalletType.frieghter)} imageUrl="/images/wallets/freighter.png" />
          <WalletButton label="Rabet" onClick={() => void rabetLogin()} selected={selectedWallet === WalletType.rabet} tooltip={toolTipsAddr(WalletType.rabet)} imageUrl="/images/wallets/rabet.png" />
          <WalletButton label="Albedo" onClick={() => void albedoLogin()} selected={selectedWallet === WalletType.albedo} tooltip={toolTipsAddr(WalletType.albedo)} imageUrl="/images/wallets/albedo.svg" />
          <WalletButton label="xBull" onClick={() => void xbullLogin()} selected={selectedWallet === WalletType.xBull} tooltip={toolTipsAddr(WalletType.xBull)} imageUrl="/images/wallets/xbull-dark.svg" />
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
                <path d="M32.958 1L19.414 10.985l2.544-6.01L32.958 1z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2.042 1l13.43 10.08-2.42-6.104L2.042 1zM28.17 23.533l-3.604 5.52 7.712 2.123 2.21-7.528-6.318-.115zM.528 23.648l2.196 7.528 7.698-2.123-3.59-5.52-6.304.115z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.06 14.367l-2.139 3.234 7.626.345-.258-8.199-5.229 4.62zM24.94 14.367l-5.3-4.72-.172 8.299 7.611-.345-2.139-3.234zM10.422 29.053l4.592-2.22-3.965-3.09-.627 5.31zM19.986 26.833l4.577 2.22-.612-5.31-3.965 3.09z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M24.563 29.053l-4.577-2.22.37 2.983-.043 1.308 4.25-2.071zM10.422 29.053l4.264 2.071-.028-1.308.356-2.983-4.592 2.22z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14.757 21.847l-3.821-1.122 2.696-1.236 1.125 2.358zM20.228 21.847l1.125-2.358 2.71 1.236-3.835 1.122z" fill="#233447" stroke="#233447" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.422 29.053l.655-5.52-4.246.115 3.591 5.405zM23.923 23.533l.64 5.52 3.591-5.405-4.231-.115zM27.082 17.601l-7.611.345.713 3.901 1.125-2.358 2.71 1.236 3.063-3.124zM10.936 20.725l2.696-1.236 1.11 2.358.727-3.901-7.626-.345 3.093 3.124z" fill="#CC6228" stroke="#CC6228" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7.921 17.601l3.192 6.232-.1-3.108-3.092-3.124zM23.001 20.725l-.115 3.108 3.192-6.232-3.077 3.124zM15.663 17.946l-.727 3.901.912 4.706.199-6.203-.384-2.404zM19.47 17.946l-.37 2.39.185 6.217.912-4.706-.727-3.901z" fill="#E27525" stroke="#E27525" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20.228 21.847l-.912 4.706.655.46 3.965-3.09.115-3.108-3.823 1.032zM10.936 20.725l.1 3.108 3.965 3.09.655-.46-.912-4.706-3.808-1.032z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20.284 31.124l.043-1.308-.342-.3h-5.043l-.328.3.028 1.308-4.264-2.071 1.494 1.222 3.022 2.094h5.2l3.035-2.094 1.48-1.222-4.325 2.071z" fill="#C0AC9D" stroke="#C0AC9D" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19.986 26.833l-.655-.46h-3.791l-.655.46-.356 2.983.328-.3h5.043l.342.3-.256-2.983z" fill="#161616" stroke="#161616" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M33.516 11.3l1.152-5.563L32.958 1 19.986 10.67l4.954 4.188 7.001 2.043 1.55-1.808-.67-.49 1.066-.97-.826-.634 1.066-.813-.611-.885zM.332 5.737L1.484 11.3l-.626.885 1.08.813-.84.634 1.066.97-.67.49 1.536 1.808 7.001-2.043 4.954-4.188L2.042 1 .332 5.737z" fill="#763E1A" stroke="#763E1A" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M31.941 16.901l-7.001-2.043 2.139 3.234-3.192 6.232 4.217-.058h6.304l-2.467-7.365zM10.06 14.858L3.059 16.9.592 24.266h6.29l4.203.058-3.178-6.232 2.153-3.234zM19.47 17.946l.441-7.676 2.002-5.415h-8.913l1.988 5.415.456 7.676.17 2.418.014 6.189h3.791l.028-6.189.185-2.418z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
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
        </div>

        <div className="sm:hidden">
          <WCButton toolTipsAddr={toolTipsAddr} selectedWallet={selectedWallet} text="Lobstr" />
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
        /* Main two-column dialog — inlined to prevent remounting */
        <DialogContent className="flex max-h-[95vh] max-w-[760px] gap-0 overflow-hidden p-0 lg:grid lg:grid-cols-[1fr_280px]">
          {/* ── Left panel ── */}
          <div className={clsx(
            "flex w-full flex-col gap-5 overflow-y-auto p-6 lg:p-8",
            authUser ? "h-[95vh]" : "h-[80vh]"
          )}>
            {/* Unverified email banner */}
            {session.data?.user && !session.data.user.emailVerified && (
              <div className="rounded-xl border bg-secondary/60 p-4">
                <p className="text-sm font-semibold text-foreground">
                  {session.data.user.email}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Please verify your email before continuing.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={disconnectWallet}
                >
                  <SignalSlashIcon className="mr-1.5 h-3.5 w-3.5" />
                  Logout
                </Button>
              </div>
            )}

            {/* Profile card */}
            {authUser && <ProfileCard />}

            {/* Header */}
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                {title}
              </DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {/* Tabs — controlled so switching is stable */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "action" | "stellar")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
                <TabsTrigger
                  value="action"
                  className="rounded-lg text-sm font-medium data-[state=active]:bg-foreground data-[state=active]:text-background"
                >
                  Action Login
                </TabsTrigger>
                <TabsTrigger
                  value="stellar"
                  className="rounded-lg text-sm font-medium data-[state=active]:bg-foreground data-[state=active]:text-background"
                >
                  Stellar Login
                </TabsTrigger>
              </TabsList>
              <TabsContent value="action" className="mt-4">
                <ActionTabContent />
              </TabsContent>
              <TabsContent value="stellar" className="mt-4">
                <StellarTabContent />
              </TabsContent>
            </Tabs>

            {/* Disconnect */}
            {authUser && (
              <div className="mt-auto flex flex-col gap-3 pt-2">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>
                <DisconnectButton />
              </div>
            )}
          </div>

          {/* ── Right panel ── */}
          <div className="relative hidden flex-col overflow-hidden rounded-r-lg bg-accent/20 lg:flex">
            <div className="p-6 pb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground/60">
                Scan to connect
              </p>
              <h3 className="mt-1 text-lg font-bold text-accent-foreground">Action Auth System</h3>
            </div>

            <div className="flex flex-1 items-center justify-center px-6">
              <div className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-accent-foreground/10 shadow-lg ring-1 ring-accent-foreground/20">
                {/* QR blurred watermark */}
                <QrCodeIcon className="absolute h-36 w-36 scale-110 text-accent-foreground/30 blur-[3px]" />
                {/* Button centred on top */}
                <div className="relative z-10 w-full px-2">
                  <WCButton toolTipsAddr={toolTipsAddr} selectedWallet={selectedWallet} text="Continue with Lobstr" onDark />
                </div>
              </div>
            </div>

            <div className="p-6 pt-3">
              <button
                onClick={() => router.push("https://github.com/Lobstrco/lobstr-browser-extension/tree/main")}
                className="flex w-full items-center gap-3 rounded-xl border border-accent-foreground/20 bg-accent-foreground/10 px-3 py-2.5 text-left transition-colors hover:bg-accent-foreground/20"
              >
                <Image src="/images/icons/labstr.png" alt="Lobstr" width={32} height={32} className="flex-shrink-0 rounded-full" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-accent-foreground/60">Works with</p>
                  <p className="text-sm font-semibold text-accent-foreground">Lobstr Mobile App</p>
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
}: {
  toolTipsAddr: (walletType: WalletType) => string | undefined;
  selectedWallet: WalletType;
  text?: string;
  onDark?: boolean;
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
          "flex w-full items-center justify-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-150 disabled:opacity-60",
          isSelected
            ? "border-primary bg-primary/10 ring-1 ring-primary/30  hover:bg-primary/20"
            : onDark
              ? "border-accent-foreground/30 bg-accent-foreground/10 text-accent-foreground hover:bg-accent-foreground/20"
              : "border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-muted",
        )}
      >
        <Image src="/images/icons/labstr.png" alt="Lobstr" width={20} height={20} className="flex-shrink-0 rounded-full" />
        {text && (
          <span className="whitespace-nowrap">
            {wcLoading && initializing ? "Initializing…" : text}
          </span>
        )}
        {isSelected && <CheckCircle2 className="h-4 w-4 flex-shrink-0 " />}
      </button>
    </div>
  );
}
