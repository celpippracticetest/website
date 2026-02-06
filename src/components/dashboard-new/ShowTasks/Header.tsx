"use client";
import React from "react";

const ShowTaskHeader = ({ children }: any) => {
  return (
    <div
      className={`
    

    flex flex-col h-screen items-center w-full px-[16px] screen1024:m-0 py-[32px]`}
    >
      {children}
    </div>
  );
};

export default ShowTaskHeader;
