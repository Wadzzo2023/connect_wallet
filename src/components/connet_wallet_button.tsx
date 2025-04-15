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
        onClick={() => setDialog.setIsOpen(true)} className=" p-2 shadow-sm shadow-black">
        <div className="flex items-center gap-2 ">

          <Image
            alt="logo"

            src={session.data?.user.image || "/favicon.ico"}
            height={200}
            width={200}
            className="rounded-full h-8 w-8 border-2"
          />

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