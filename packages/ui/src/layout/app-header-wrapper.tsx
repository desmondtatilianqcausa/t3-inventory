"use client";

import React from "react";

import { useMondayContext } from "../monday/hooks/useMondayContext";
import AppHeader from "./AppHeader";

const AppHeaderWrapper = () => {
  const { isInMonday } = useMondayContext();

  // Avoid rendering AppH if inside Monday
  if (isInMonday === null) return null; // Optionally handle loading state

  return !isInMonday ? <AppHeader /> : null;
};

export default AppHeaderWrapper;
