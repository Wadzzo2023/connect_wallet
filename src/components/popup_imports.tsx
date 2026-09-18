import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useWCIStore } from "../state/wallect_connect_import";
import ConnectDialog from "./connect_dialog";

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
      <ConnectDialog className={className} />
      {isOpen ? <w3m-modal /> : <></>}
    </>
  );
}
