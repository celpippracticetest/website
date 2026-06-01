"use client";

import { SupabaseAuthForm } from "@/components/auth/SupabaseAuthForm";
import {
  useAuthModalStore,
  type AuthModalMode,
} from "@/store/useAuthModal.store";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

interface LoginModalProps {
  setShowLoginModal: (show: boolean) => void;
  initialMode?: AuthModalMode;
}

const LoginModal = ({
  setShowLoginModal,
  initialMode: initialModeProp,
}: LoginModalProps) => {
  const { loginMessage, authMode } = useAuthModalStore();
  const loginRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const initialMode = initialModeProp ?? authMode ?? "sign-up";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (loginRef.current && !loginRef.current.contains(event.target as Node)) {
        setShowLoginModal(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowLoginModal]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 px-4">
      <div ref={loginRef} className="relative w-full max-w-md">
        <button
          type="button"
          className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow hover:bg-slate-100"
          onClick={() => setShowLoginModal(false)}
          aria-label="Close sign in modal"
        >
          ×
        </button>
        {loginMessage ? (
          <p className="mb-3 rounded-xl border border-primary1/20 bg-white px-4 py-2.5 text-center text-sm text-text1 shadow-sm">
            {loginMessage}
          </p>
        ) : null}
        <SupabaseAuthForm
          className="shadow-xl"
          initialMode={initialMode}
          redirectAfterAuth={pathname}
        />
      </div>
    </div>
  );
};

export default LoginModal;
