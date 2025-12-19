"use client";
import { Dispatch, JSX, SetStateAction, useState } from "react";
import { Button } from "@/components/ui/button";
import { Gem, Menu, X } from "lucide-react";
import Link from "next/link";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import useStore from "@/store";
import { useRouter } from "nextjs-toploader/app";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  useClerk,
  UserButton,
  useUser,
} from "@clerk/nextjs";
// import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

interface NavLinks {
  name: string;
  path: string;
  icon: JSX.Element;
  disabled?: boolean;
  onClick: () => void;
}

const DesktopHeader = (props: {
  navLinks: NavLinks[];
  mobileMenuOpen: boolean;
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  viewMode: "practice" | "exams" | null;
  currentPage: string | null;
}) => {
  const { signOut } = useClerk();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isUserDropDownOpen, setUserDropDownOpen] = useState(false);
  const { user } = useUser();
  const setPremiumPlanModalState = useStore(
    (state) => state.setPremiumPlanModalState
  );
  let headerButton: JSX.Element;
  // const dashboard = useStore((state) => state.dashboard);
  const setViewMode = useStore((state) => state.dashboard.setView);
  const setCurrentPage = useStore((state) => state.dashboard.setCurrentPage);
  const onViewModeChange = (value: string | undefined) => {
    if (value === "practice") {
      setViewMode("practice");
      setCurrentPage("practice-overview");
      router.push("/practice-overview");
    } else if (value === "exams") {
      setViewMode("exams");
      setCurrentPage("exams");
      router.push("/exam-overview");
    }
  };

  if (props.viewMode === "exams" || props.viewMode === "practice") {
    headerButton = (
      <div className="lg:absolute lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:top-2">
        <div
          className={`toggle-container border-2 border-gray-200 p-1 rounded-full shadow-sm ${isMobile ? "scale-[0.85]" : "scale-[0.85]"
            } origin-center`}
        >
          <div className="toggle-pulse-border"></div>
          <ToggleGroup
            type="single"
            value={props.viewMode || undefined}
            onValueChange={onViewModeChange}
            className="pill-toggle-group "
          >
            <ToggleGroupItem
              value="practice"
              className="px-5 py-1.5 text-[14px] rounded-full data-[state=on]:bg-[#3ebbf3] data-[state=on]:text-white transition-all duration-300 cursor-pointer"
            >
              Practice
            </ToggleGroupItem>
            <ToggleGroupItem
              value="exams"
              className="px-5 py-1.5 text-[14px] rounded-full data-[state=on]:bg-[#3ebbf3] data-[state=on]:text-white transition-all duration-300 cursor-pointer"
            >
              Mock Exams
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    );
  } else {
    headerButton = (
      <div className="hidden md:flex items-center space-x-6 mr-6">
        {props.navLinks.map((link, index) => (
          <a
            key={index}
            className="text-gray-700 hover:text-[#3ebbf3] font-medium flex items-center gap-2 cursor-pointer"
            rel="noopener noreferrer"
            onClick={() => link.onClick()}
          >
            {link.icon}
            {link.name}
          </a>
        ))}
      </div>
    );
  }
  return (
    <header className="hidden lg:flex md:flex flex-col  items-center  z-50 p-3 ">
      <div className="cel-container">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/practice-overview" className="flex items-center">
              <img
                src={
                  isMobile
                    ? "/lovable-uploads/0eb04c8f-8ba7-4ac8-a0ff-9e93de37742b.png"
                    : "/lovable-uploads/c12badb5-05c1-4a69-8782-d60d31b879d8.png"
                }
                alt="CELPIP.ca"
                className="h-10 md:h-12 w-auto"
              />
            </Link>
          </div>

          {/* Navigation Links */}
          {headerButton}

          {/* Auth buttons */}
          <div className="flex items-right gap-4 lg:gap-5 md:gap-3 ">
            {user?.publicMetadata.plan !== "premium" && user?.publicMetadata.plan !== "pro" && (
              <div
                onClick={() => {
                  setPremiumPlanModalState();
                }}
                className="relative border border-slate-300 rounded-full pl-1 pr-1 shadow-sm min-w-13 min-h-10 justify-center outline-none flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 transition-all duration-300 hover:shadow-md"
              >
                <Gem
                  className=" w-5 h-5 flex-shrink-0 text-blue-400 fill-primary ml-1"
                  fill="none"
                  strokeWidth={2}
                ></Gem>
                <div
                  hidden={user === null || isMobile}
                  className="flex flex-col justify-start mr-1"
                >
                  <p className="text-[14px] font-bold text-blue-950 tracking-wide text-left">
                    Upgrade
                  </p>
                </div>
                <div className="absolute -top-3 -right-5 bg-red-500 text-white text-[14px] font-bold rounded-full w-10 h-7 flex items-center justify-center transform rotate-12 scale-75">
                  <span className="text-center leading-tight">Sale</span>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <SignedOut>
                <SignInButton>
                  <Button
                    hidden={isMobile}
                    variant="outline"
                    className="rounded-full border-2 border-gray-200 font-medium cursor-pointer"
                  >
                    Log in
                  </Button>
                </SignInButton>
                <SignUpButton>
                  <Button className="bg-slate-800 hover:bg-slate-800/90 rounded-full text-white font-medium  cursor-pointer">
                    Signup
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <button
                  id="dropdownDefaultButton"
                  data-dropdown-toggle="dropdown"
                  type="button"
                  onClick={() => {
                    setUserDropDownOpen(!isUserDropDownOpen);
                  }}
                  className="cursor-pointer"
                >
                  {user && user.imageUrl ? (
                    <img
                      className="w-10 h-10 p-1 rounded-full ring-2 ring-gray-300 dark:ring-gray-500"
                      src={user.imageUrl}
                      alt="Bordered avatar"
                    />
                  ) : (
                    <div className="relative inline-flex items-center justify-center w-10 h-10 overflow-hidden bg-gray-100 rounded-full dark:bg-gray-600">
                      <span className="font-medium text-gray-600 dark:text-gray-300">
                        {(user?.name ?? "user")[0].toLocaleUpperCase()}
                      </span>
                    </div>
                  )}
                </button>
              </SignedIn>
            </div>

            {/* Mobile menu button */}
            {/* <div className="flex md:hidden">
            <button
              type="button"
              className="text-gray-700 hover:text-gray-900"
              onClick={() => props.setMobileMenuOpen(!props.mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {props.mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div> */}
          </div>
        </div>
        <div
          className={
            (!props.mobileMenuOpen && isUserDropDownOpen && user
              ? ""
              : " hidden ") +
            " absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white ring-1 shadow-lg ring-black/5 focus:outline-hidden"
          }
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
          tabIndex={-1}
        >
          <div className="py-1" role="none">
            <a
              href="/profile"
              className="block px-4 py-2 text-[14px] text-gray-700"
              role="menuitem"
              tabIndex={-1}
              id="menu-item-0"
            >
              Profile
            </a>
            <button
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).$crisp) {
                  (window as any).$crisp.push(["do", "chat:show"]);
                  (window as any).$crisp.push(["do", "chat:open"]);
                }
              }}
              className="block px-4 py-2 text-[14px] text-gray-700 w-full text-left cursor-pointer"
              role="menuitem"
              tabIndex={-1}
              id="menu-item-0"
            >
              Support
            </button>
            {user &&
              user.publicMetadata.roles &&
              user.publicMetadata.roles.includes("admin") && (
                <a
                  href="/cms/practice"
                  className="block px-4 py-2 text-[14px] text-gray-700"
                  role="menuitem"
                  tabIndex={-1}
                  id="menu-item-0"
                >
                  CMS Practices
                </a>
              )}

            {user &&
              user.publicMetadata.roles &&
              user.publicMetadata.roles.includes("admin") && (
                <a
                  href="/cms/exam"
                  className="block px-4 py-2 text-[14px] text-gray-700"
                  role="menuitem"
                  tabIndex={-1}
                  id="menu-item-0"
                >
                  CMS Exam
                </a>
              )}
            <button
              onClick={() => signOut()}
              className="block px-4 py-2 text-[14px] text-gray-700 cursor-pointer"
              role="menuitem"
              tabIndex={-1}
              id="menu-item-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;
