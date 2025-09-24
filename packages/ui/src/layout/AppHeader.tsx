import React, { useEffect, useState } from "react";

import Link from "next/link";
// import { Logo } from "@acme/ui/general/Logo";
// import { NavUser } from "@acme/ui/general/nav-user";
import { Separator } from "@acme/ui/components/separator";
import { SidebarTrigger } from "@acme/ui/components/sidebar";
// import TopNavbar from "@acme/ui/general/TopNavbar";
import { cn } from "@acme/ui/lib/utils";
// import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";



const SidebarTriggerWrapper = ({ className }: { className?: string }) => {
  // const { isInMonday } = useMondayContext();
  const [isFromMonday, setIsFromMonday] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we were redirected from the portal builder
    const referrer = document.referrer;
    const wasFromPortalBuilder = referrer.includes("/monday/portalbuilder2");

    if (wasFromPortalBuilder) {
      // Store that we came from the portal builder
      localStorage.setItem("redirectedFromMonday", "true");
    }

    // Check localStorage for the flag
    const redirectedFromMonday =
      localStorage.getItem("redirectedFromMonday") === "true";
    setIsFromMonday(redirectedFromMonday);

    // Clean up the flag when the user leaves or refreshes
    return () => {
      localStorage.removeItem("redirectedFromMonday");
    };
  }, []);

  // Don't render anything while we're checking the context
  // if (isInMonday === null || isFromMonday === null) return null;

  // Hide trigger if we're in Monday's iframe OR if we were redirected from the portal builder
  // return !isInMonday && !isFromMonday ? (
  //   <SidebarTrigger className="absolute left-3 top-[50%] -translate-y-1/2 rounded-lg bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 p-2 text-white transition-colors hover:from-orange-500 hover:via-pink-600 hover:to-purple-700" />
  // ) : null;

  return !isFromMonday ? (
    <SidebarTrigger className={cn("", className)} />
  ) : null;
};

function AppHeader({
  appName,
  sidebarToggle,
  className,
  image,
}: {
  appName: string;
  sidebarToggle: boolean;
  className?: string;
  image?: string;
}) {
  return (
    // <header
    //   className={cn(
    //     "left-0 z-30 flex w-full items-center gap-5 border-b border-white/[0.08] bg-[#edeff8] !px-4 backdrop-blur-xl",
    //     className,
    //   )}
    // >
    //   <div className="container flex h-[48px] w-full items-center justify-start gap-5">
    //     {sidebarToggle ? <SidebarTriggerWrapper /> : null}
    //     <div className={cn("flex items-center gap-8", sidebarToggle && "")}>
    //       <Link href="/" className="flex items-center gap-2">
    //         <Logo appName={appName} />
    //       </Link>

    //       <TopNavbar />
    //     </div>

    //     {/* <NavUser className="!ml-auto" /> */}
    //     {/* <SignedOut>
    //         <SignInButton />
    //       </SignedOut>
    //       <SignedIn>
    //         <UserButton />
    //       </SignedIn> */}
    //   </div>
    // </header>
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {sidebarToggle ? <SidebarTriggerWrapper className="-ml-1" /> : null}
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-1 items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Logo appName={appName} image={image} />
          </Link>
          <NavUser className="!ml-auto" />
          {/* <SignedOut>
            <SignInButton />
          </SignedOut> */}
          {/* <SignedIn>
            <UserButton />
          </SignedIn> */}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
