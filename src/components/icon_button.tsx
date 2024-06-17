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
}

export default function IconButton(props: IconButtonProps) {
  return (
    <div
      data-tip={props.toolTips}
      className={clsx(props.toolTips ? "tooltip w-full" : "", "flex-1")}
    >
      <Button
        variant="outline"
        className="  flex w-full items-center justify-center"
        onClick={props.onClick}
      >
        {props.imageUrl ? (
          <Image
            className=" block h-10 w-10 rounded-full object-contain  dark:hidden"
            height={40}
            width={40}
            src={props.imageUrl}
            alt={props.text}
          />
        ) : (
          props.icon
        )}

        {props?.darkImageUrl ? (
          <Image
            className="hidden h-10 w-10 rounded-full object-contain dark:block"
            height={30}
            width={30}
            src={props?.darkImageUrl}
            alt={props.text}
          />
        ) : (
          props.icon
        )}
        <span className="ml-2">{props.text}</span>
      </Button>
    </div>
  );
}
