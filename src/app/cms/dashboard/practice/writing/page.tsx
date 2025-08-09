"use client";
import React, { Suspense } from "react";
import CmsWritingPracticeForm from "./CmsWritingPracticeForm";

const CmsWritingPractice = () => {
  return (
    <Suspense>
      <CmsWritingPracticeForm />{" "}
    </Suspense>
  );
};

export default CmsWritingPractice;
