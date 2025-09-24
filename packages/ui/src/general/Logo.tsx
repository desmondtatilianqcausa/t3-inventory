"use client";

import Image from "next/image";

import { cn } from "@acme/ui";

interface LogoProps {
  className?: string;
  appName?: string;
  image?: string;
}

export function Logo({
  className,
  appName = "Wall Street Academy",
  image,
}: LogoProps) {
  const [firstPart, ...rest] = appName.split(" ");
  const secondPart = rest.join(" ");

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {image ? (
        <Image src={image} alt={appName} width={50} height={50} />
      ) : null}
      {appName ? (
        <div className="hidden gap-1 md:flex">
          <span className="font-semibold text-[#2b0e4d]">{firstPart}</span>
          <span className="font-light text-[#FC653C]">{secondPart}</span>
        </div>
      ) : null}
    </div>
  );
}
