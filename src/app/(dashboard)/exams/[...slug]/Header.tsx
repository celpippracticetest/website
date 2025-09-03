"use client";
import React from "react";

const ShowTaskHeader = ({ children }: any) => {
  return (
    <div
      className={`
    
flex flex-col pt-[40px] h-screen items-center w-full px-[16px]`}
    >
      {children}
    </div>
  );
};

export default ShowTaskHeader;
