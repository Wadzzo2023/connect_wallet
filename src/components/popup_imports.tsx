import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useWCIStore } from "../state/wallect_connect_import";
import ConnectDialog from "./connect_dialog";

const Toaster = dynamic(() =>
  import("react-hot-toast").then((mod) => mod.Toaster),
);

interface PopupImportsProps {
  className: string;
}

export default function PopupImports({ className }: PopupImportsProps) {
  const wciStore = useWCIStore();
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    setIsOpen(wciStore.isOpen);
  }, [wciStore.isOpen]);

  return (
    <>
      {/* One toast container (it used to be mounted twice, doubling every toast). */}
      <Toaster
        containerClassName={className}
        toastOptions={{
          className: "!rounded-xl !border !border-border !bg-card !text-card-foreground !shadow-lg",
        }}
      />
      <ConnectDialog className={className} />
      {isOpen ? <w3m-modal /> : <></>}
    </>
  );
}
