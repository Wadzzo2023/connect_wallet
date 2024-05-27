import Image from "next/image";

import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { addrShort } from "../lib/utils";
import { useDialogStore } from "../state/connect_wallet_dialog";

export default function ConnectWalletButton() {
  const session = useSession();

  const setDialog = useDialogStore();
  return (
    <div className="flex items-center gap-2 ">
      <button onClick={() => setDialog.setIsOpen(true)} className="flex-1">
        <div className="tsd btn flex items-center justify-center rounded-xl border border-slate-50/10 bg-base-200 px-4 py-2 text-sm font-bold tracking-wider text-gray-700 backdrop-blur hover:scale-95 hover:border-blue-800 hover:bg-blue-800 hover:text-blue-100 focus:border-blue-700 active:ring-blue-500 ">
          <div className="relative mr-2 h-6 w-6">
            <Image
              alt="BandCoin logo"
              layout="fill"
              objectFit="cover"
              src="/favicon.ico"
            />
          </div>
          <span className="text-base-content">
            {session.status == "authenticated"
              ? addrShort(session.data.user.id)
              : "Connect Wallet"}
          </span>
        </div>
      </button>
      {session.status == "authenticated" && <LogOutButon />}
    </div>
  );
}

function LogOutButon() {
  async function disconnectWallet() {
    await signOut({
      redirect: false,
    });
    // walletState.removeUserDat();
  }
  return (
    <button className="btn btn-circle" onClick={disconnectWallet}>
      <LogOut />
    </button>
  );
}
