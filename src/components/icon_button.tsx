/* eslint-disable @typescript-eslint/no-explicit-any */
import clsx from "clsx";
import Image from "next/image";
import type { MouseEventHandler } from "react";
import { Button } from "../shadcn/ui/button";

interface IconButtonProps {
  text: string;
  imageUrl?: string;
  icon?: any;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  justify?: string;
  isSelected?: boolean;
  toolTips?: string;
  disable?: boolean;
  darkImageUrl?: string;
  className?: string;
}

export default function IconButton(props: IconButtonProps) {
  return (
    <div
      data-tip={props.toolTips}
      className={clsx(props.toolTips ? "tooltip w-full" : "", "flex-1")}
    >
      <button
        className={clsx(`flex w-full items-center ${props.className}`)}
        onClick={props.onClick}
      >
        {props.imageUrl ? (
          <Image
            className=" h-5 w-5  rounded-full object-contain  "
            height={30}
            width={30}
            src={props.imageUrl}
            alt={props.text}
          />
        ) : (
          props.icon
        )}

        <span className="ml-2">{props.text}</span>
      </button>
    </div>
  );
}
