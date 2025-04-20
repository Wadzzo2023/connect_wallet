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
      <Toaster containerClassName={className} />
      <ConnectDialog className={className} />
      <Toaster containerClassName={className} />
      {isOpen ? <w3m-modal /> : <></>}
    </>
  );
}
