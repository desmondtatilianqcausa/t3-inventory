import AuthButton from "./AuthButton";
import Logo from "./Logo";
import React from "react";
import TopNavbar from "./TopNavbar";

function Header() {
  return (
    <header className="fixed z-10 flex h-20 w-full items-center justify-center bg-white py-3 shadow-md">
      <div className="container flex w-full items-center justify-between">
        <div>
          <Logo />
        </div>
        <div className="flex items-center space-x-10">
          <TopNavbar />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

export default Header;
