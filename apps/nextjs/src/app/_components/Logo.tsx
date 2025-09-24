"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";

function Logo() {
  return (
    <Link href="/">
      <Image
        src="https://fdotwww.blob.core.windows.net/sitefinity/images/default-source/content1/info/logo/png/fdot_logo_color.png?sfvrsn=293c15a8_2"
        alt="logo"
        width={0}
        height={0}
        sizes="100vw"
        className=" w-[100px]"
      />
    </Link>
  );
}

export default Logo;
