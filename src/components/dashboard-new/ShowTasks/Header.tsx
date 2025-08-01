"use client";
import { useMenuCollapsedStore } from "@/store/menuCollapsed.store";
import React from "react";

const ShowTaskHeader = ({ children }: any) => {
  const { collapsed } = useMenuCollapsedStore((state) => state);

  return (
    <div
      className={`
    
     w-full

    flex flex-col pt-[8px] h-screen items-center w-full px-[16px]`}
    >
      {children}
    </div>
  );
};

export default ShowTaskHeader;
