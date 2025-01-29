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
    <div className="flex items-center gap-2  ">
      <Button
        size='lg'
        onClick={() => setDialog.setIsOpen(true)} className="flex-1 p-2 shadow-sm shadow-black">
        <div className="flex items-center gap-2 ">
          <div className="h-10 w-10">
            <Image
              alt="logo"
              objectFit="cover"
              src={session.data?.user.image || "/favicon.ico"}
              height={200}
              width={200}
              className="rounded-full border-2"
            />
          </div>
          <span className="text-base-content">
            {session.status == "authenticated"
              ? <span className="flex flex-col items-start">
                <p>
                  {session.data?.user.name}
                </p>
                <p>
                  PUBKEY : {addrShort(session.data?.user.id)}
                </p>
              </span>
              : "Login/Signup"}
          </span>
        </div>
      </Button>
      {session.status == "authenticated" &&
        <LogOutButon />
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
    <Button className="flex flex-col p-3 shadow-sm shadow-black" onClick={disconnectWallet}>
      <span> <LogOut /></span>
      <span className="text-xs">Logout</span>
    </Button>
  );
}