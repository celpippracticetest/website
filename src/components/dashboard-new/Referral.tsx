"use client";
import React from "react";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Referral() {
  const { user } = useUser();

  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.push("/practice-overview");
    }
  }, [user]);

  if (!user) return null;

  return <></>;
}
