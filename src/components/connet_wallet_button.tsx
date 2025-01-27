import Image from "next/image";

import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { addrShort } from "../lib/utils";
import { useDialogStore } from "../state/connect_wallet_dialog";
import { Button } from "~/components/shadcn/ui/button";

export default function ConnectWalletButton({ text }: { text?: string }) {
  const session = useSession();

  const setDialog = useDialogStore();
  return (
    <div className="flex items-center gap-2 ">
      <Button onClick={() => setDialog.setIsOpen(true)} className="flex-1 pb-2 shadow-md ">
        <div className="flex items-center gap-2 ">
          <div className="h-8 w-8">
            <Image
              alt="logo"
              objectFit="cover"
              src="/favicon.ico"
              height={1000}
              width={1000}
            />
          </div>
          <span className="text-base-content">
            {session.status == "authenticated"
              ? addrShort(session.data.user.id)
              : "Login/Signup"}
          </span>
        </div>
      </Button>
      {session.status == "authenticated" &&
        <Button className="flex pb-2 shadow-md">
          <LogOutButon />
        </Button>
      }
    </div>
  );
}

function LogOutButon() {
  async function disconnectWallet() {
    await signOut({
      redirect: false,
    });
  }
  return (
    <button className="btn btn-circle" onClick={disconnectWallet}>
      <LogOut />
    </button>
  );
}
