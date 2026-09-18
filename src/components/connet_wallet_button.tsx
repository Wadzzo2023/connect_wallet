import Image from "next/image";
import { LogOut, Wallet } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { addrShort } from "../lib/utils";
import { useDialogStore } from "../state/connect_wallet_dialog";
import { Button } from "~/components/shadcn/ui/button";

export default function ConnectWalletButton({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) {
  const session = useSession();
  const setDialog = useDialogStore();

  if (session.status !== "authenticated" || !session.data?.user?.id) {
    return (
      <Button
        onClick={() => setDialog.setIsOpen(true)}
        className={`h-9 px-4 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 ${className ?? ""}`}
      >
        <Wallet className="h-4 w-4" />
        <span>{text ?? "Connect Wallet"}</span>
      </Button>
    );
  }

  const user = session.data.user;
  const displayName = user.name || "Stellar Account";

  return (
    <div className={`flex items-center gap-2 p-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] backdrop-blur-md ${className ?? ""}`}>
      <div className="flex items-center gap-2.5 px-2 py-1 min-w-0">
        <div className="relative h-7 w-7 rounded-full overflow-hidden shrink-0 border border-emerald-500/40">
          <Image
            alt={displayName}
            src={user.image ?? "/favicon.ico"}
            height={28}
            width={28}
            className="h-full w-full object-cover"
          />
          <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-background" />
        </div>

        <div className="flex flex-col min-w-0 text-left">
          <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
            {displayName}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono truncate">
            {addrShort(user.id, 4)}
          </span>
        </div>
      </div>

      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
        onClick={() => void signOut({ redirect: false })}
        title="Disconnect Wallet"
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}