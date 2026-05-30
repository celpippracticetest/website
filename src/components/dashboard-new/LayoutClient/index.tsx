"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { signOutWebSession } from "@/lib/auth/client-sign-out";
import { useHasEverPurchased } from "@/hooks/useHasEverPurchased";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";

import SvgChevronRight from "@/components/icons/ChevronRight";
import SvgPractice from "@/components/icons/Practice";
import SvgProfile from "@/components/icons/Profile";
import SvgChevronDown from "@/components/icons/ChevronDown";
import SvgMockTest from "@/components/icons/MockTest";
import SvgListeningPart from "@/components/icons/ListeningPart";
import SvgSpeakingPart from "@/components/icons/SpeakingPart";
import SvgWritingPart from "@/components/icons/WritingPart";
import SvgReadingPart from "@/components/icons/ReadingPart";
import SvgAllSkills from "@/components/icons/AllSkills";
import { usePathname, useRouter } from "next/navigation";
import { useSelectedTask } from "@/store/useSelectedTask.store";
import { useSelectedExam } from "@/store/useSelectedExam.store";
import { useExtraDiscountStore } from "@/store/useExtraDiscount.store";
import { useAuthModalStore } from "@/store/useAuthModal.store";
import SvgCopy from "@/components/icons/Copy";
import React from "react";
import { motion } from "framer-motion";
import SvgClose from "@/components/icons/Close";
import { useMenuCollapsedStore } from "@/store/menuCollapsed.store";
import CountdownTimer from "@/components/dashboard-app/CounterDownTimer";
import SvgReferral from "@/components/icons/Referral";

import dynamic from "next/dynamic";
import TopHeader from "@/components/pages/landing/TopHeader";
import { GlobalInteractiveProvider } from "@/components/dashboard-app/practice/GlobalInteractiveProvider";
import {
  MOCK_EXAM_VIEW_MODE_EVENT,
  MOCK_EXAM_VIEW_MODE_STORAGE_KEY,
} from "@/components/dashboard-app/exam-parts/components/useExamViewMode";
import { cn } from "@/lib/utils";

const BottomNavigation = dynamic(
  () => import("@/components/dashboard-new/BottomNavigation"),
  { ssr: false }
);

const NavItem = ({
  icon,
  label,
  link,
  subItems,
  primary,
  active,
  collapsed,
  setIsMenuOpen,
  setCollapsed,
  open,
  setOpen,
  setActive,
  submenuActive,
  setSubmenuActive,
}: {
  icon: React.ReactNode;
  label: string;
  link: string;
  primary: string;
  active: string;
  collapsed: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  setIsMenuOpen: (collapsed: boolean) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setActive: React.Dispatch<React.SetStateAction<string>>;
  submenuActive: string;
  setSubmenuActive: React.Dispatch<React.SetStateAction<string>>;
  subItems?: { label: string; link: string; icon: React.ReactNode }[];
}) => {
  const isActive = primary === active;
  const isPractice = primary === "practice";
  const router = useRouter();

  const handleClick = () => {
    if (isPractice) {
      setOpen(!open);
    } else {
      setActive(primary);
      router.push(link);
    }
  };

  return (
    <div
      className={`flex flex-col cursor-pointer w-full ${primary === "practice" ? "mt-[24px]" : "mt-[16px]"
        } `}
    >
      <div
        className={clsx(
          "flex gap-[8px] h-[36px] items-center text-[#37465C] w-full"
        )}
        onClick={handleClick}
      >
        {isPractice ? (
          <div className="text-[14px] font-normal">
            <div
              className={clsx(
                `flex shrink-0  items-center`,
                isActive && !isPractice && "text-[#316BFF]",
                isActive && isPractice && open && "text-[#316BFF]",
                (!isActive || (isActive && isPractice && !open)) &&
                "text-[#37465C]"
              )}
            >
              <span>{icon}</span>
              <span
                className={clsx(
                  "truncate transition-opacity duration-500 ",
                  collapsed
                    ? "opacity-0 delay-0  w-0  "
                    : "opacity-100 delay-500 "
                )}
              >
                {label}
              </span>
            </div>
          </div>
        ) : (
          <Link
            href={link}
            className={`${collapsed ? "justify-center" : "justify-start"
              } text-[14px]  flex items-center w-full font-normal text-[#37465C] h-[36px]`}
            onClick={() => {
              setTimeout(() => {
                setIsMenuOpen(false);
              }, 500);
            }}
          >
            <div
              className={clsx(
                `flex shrink-0  items-center`,
                isActive && !isPractice && "text-[#316BFF]",
                isActive && isPractice && open && "text-[#316BFF]",
                (!isActive || (isActive && isPractice && !open)) &&
                "text-[#37465C]"
              )}
            >
              {icon}
              <span
                className={clsx(
                  "truncate transition-opacity duration-500 ",
                  collapsed
                    ? "opacity-0 delay-0  w-0  "
                    : "opacity-100 delay-500 "
                )}
              >
                {label}
              </span>{" "}
            </div>
          </Link>
        )}

        {!collapsed && isPractice && (
          <span
            className="opacity-0 inline-flex"
            style={{
              animation: `fadeIn 0.3s ease-in-out ${open ? "500ms" : "0ms"
                } forwards`,
            }}
          >
            {open ? (
              <SvgChevronDown
                className={clsx(isActive ? "text-[#316BFF]" : "text-[#37465C]")}
              />
            ) : (
              <SvgChevronRight />
            )}
          </span>
        )}
      </div>
    </div>
  );
};

const LayoutClient = ({ children }: any) => {
  const sidebarMenuRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const couponId = useExtraDiscountStore((state) => state.couponId);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const setShowExtraDiscount = useExtraDiscountStore(
    (state) => state.setShowExtraDiscount
  );
  const visibleHorizontalCoupon = useExtraDiscountStore(
    (state) => state.visibleHorizontalCoupon
  );
  const setVisibleHorizontalCoupon = useExtraDiscountStore(
    (state) => state.setVisibleHorizontalCoupon
  );
  const { user, isLoaded, isSignedIn }: any = useHybridWebUser();
  const { hasEverPurchased } = useHasEverPurchased();
  const [hasHydrated, setHasHydrated] = useState(false);
  const displayUser = hasHydrated ? user : null;

  const noUser = hasHydrated && isLoaded ? !isSignedIn : false;

  const { showLoginModal, setShowLoginModal, loginMessage } = useAuthModalStore();
  const loginRef = useRef<HTMLDivElement>(null);
  const { collapsed, setCollapsed } = useMenuCollapsedStore((state) => state);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const [submenuActive, setSubmenuActive] = useState("");
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();
  const [isOfficialExamView, setIsOfficialExamView] = useState(false);

  const [isUserDropDownOpen, setUserDropDownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const isNewUser =
    displayUser?.createdAt &&
    new Date().getTime() - new Date(displayUser.createdAt).getTime() <
    24 * 60 * 60 * 1000;
  const freeUser = displayUser?.publicMetadata.plan == "free";
  const proUser = hasPaidPracticeAccess(
    displayUser?.publicMetadata?.plan as string | undefined,
    displayUser?.publicMetadata?.purchaseDate
  );

  const { selectedTask, setSelectedTask } = useSelectedTask();
  const { selectedExam, setSelectedExam } = useSelectedExam();

  useEffect(() => {
    setHasHydrated(true);
  }, []);


  useEffect(() => {
    const handleSize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleSize);
  }, []);

  useEffect(() => {
    if (isMenuOpen === true && dimensions.width <= 743) {
      document.body.classList.add("overflow-hidden");
      setCollapsed(false);
    } else if (isMenuOpen === false && dimensions.width <= 743) {
      document.body.classList.remove("overflow-hidden");
      setCollapsed(false);
    }
    if (isMenuOpen === true && dimensions.width > 743) {
      setIsMenuOpen(false);
    }
  }, [isMenuOpen, dimensions]);

  useEffect(() => {
    const hasClosedModal =
      localStorage.getItem("hasClosedExtraDiscountModal") === "true";

    if (hasClosedModal && freeUser && isNewUser) {
      setVisibleHorizontalCoupon(true);
    }
  }, [user]);

  const loginModalOpenRef = useRef(showLoginModal);

  useEffect(() => {
    loginModalOpenRef.current = showLoginModal;
  }, [showLoginModal]);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (
        sidebarMenuRef.current &&
        !sidebarMenuRef.current.contains(event.target)
      ) {
        if (freeUser) {
          setIsMenuOpen(false);
        } else if (noUser) {
          if (!loginModalOpenRef.current) {
            setIsMenuOpen(false);
          }
        } else {
          setIsMenuOpen(false);
        }
      }

      if (loginRef.current && !loginRef.current.contains(event.target)) {
        setShowLoginModal(false);
      }
      // User dropdown close on outside click
      if (
        isUserDropDownOpen &&
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setUserDropDownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [freeUser, noUser, isUserDropDownOpen]);

  // Inline UpgradeModal removed in favor of shared component


  const LoginModal = () => {
    return (
      <div className="z-[999] pb-[100px] px-[16px] fixed top-0 left-0 right-0 mx-auto w-full h-full bg-[#17161680] flex justify-center items-center">
        <div
          ref={loginRef}
          className="flex-col mx-[16px] relative w-[440px] pt-[24px] px-[16px] pb-[18px]  h-[270px] rounded-[24px] bg-white"
        >
          <div
            onClick={() => setShowLoginModal(false)}
            className="absolute right-[20px] cursor-pointer"
          >
            <SvgClose />
          </div>
          <div className="text-[#212E42] text-[20px] text-center font-semibold">
            Login to your account
          </div>
          <div className="text-[#212E42] mt-[12px] text-[14px] text-center font-normal">
            {loginMessage || "Please log in to start the exam"}{" "}
            <Link href="/sign-in?mode=sign-up">
              <div className="text-[14px] cursor-pointer flex items-center justify-center text-white bg-[#4A7DFF] rounded-[24px] h-[40px] mt-[12px]  text-center font-normal">
                Create a free account
              </div>
            </Link>
          </div>

          <div className="flex justify-center items-center mt-[32px] gap-[20px]">
            <div className="h-[1px] w-full bg-[#D5D6D8]"></div>
            <span className="text-[#37465C] text-[14px]">Or</span>
            <div className="h-[1px] w-full bg-[#D5D6D8]"></div>
          </div>
          <div className="text-[16px]   mt-[32px]  text-center font-medium">
            <span>Do you have an account? </span>{" "}
            <Link href="/sign-in?mode=sign-in">
              <span className="text-[#316BFF] cursor-pointer"> Login </span>
            </Link>
          </div>
        </div>
      </div>
    );
  };


  const showPlansForUsers = () => {
    return (
      <>
        {(freeUser || noUser) && (
          <>
            <div
              className={`relative mb-[50px] flex flex-col items-center left-0 right-0 mx-auto justify-end mt-[140px] screen744:!mt-[106px] screen1280:!mt-[150px] rounded-[24px] max-w-[202px] screen744:!max-w-[132px] screen1280:!max-w-[202px] h-[183px] screen744:!h-[174px]  screen1280:!h-[220px] bg-[radial-gradient(50%_265.62%_at_50%_50%,_#F26B3E_0%,_#FC8A65_100%)]`}
            >
              <Image
                alt="beaver pro"
                width={170}
                height={149}
                className={`absolute   bottom-[130px]  screen1280:!bottom-[153px]`}
                src="/images/beaver-pro.png"
              />
              <div className=" screen1280:!mx-[16px] text-center leading-[100%] mb-[12px]">
                <div className="flex flex-col gap-[12px] leading-[100%]">
                  <span className="font-bold text-white screen744:!text-[14px] screen1280:!text-[20px]">
                    Upgrade to Pro!
                  </span>
                  <span className="font-medium text-white screen744:!text-[11px] screen1280:!text-[12px]">
                    Access all premium features now.{" "}
                  </span>
                </div>
              </div>
              <div
                onClick={() => {
                  if (freeUser) {
                    router.push("/pricing");
                  } else {
                    setShowLoginModal(true);
                  }
                }}
                className="cursor-pointer  screen744:!max-w-[108px]  screen1280:!max-w-[170px] flex items-center justify-center bg-white mb-[16px] max-w-[170px] h-[40px] w-full rounded-[24px] "
              >
                <span className=" text-[14px] font-normal text-[#212E42]">
                  sale
                </span>
              </div>
            </div>
          </>
        )}

        {displayUser && (
          <>
            <div
              className={`relative p-[8px] flex flex-col z-[999] justify-none screen744:!justify-start screen1280:!justify-none items-start left-0 right-0 mx-auto  mt-[40px] rounded-[8px] max-w-[202px] screen744:!max-w-[132px] screen1280:!max-w-[202px] h-[114px] screen744:!h-[202px]  screen1280:!h-[114px] bg-[#B86DF9]`}
            >
              <Image
                alt="refer pro user"
                width={102}
                height={81}
                className={`absolute flex screen744:!hidden screen1280:!flex  top-[22px] screen744:!top-0 screen744:!left-0 -right-[10px] screen744:!right-0 mx-auto screen1280:!mr-0 screen1280:!ml-0 screen1280:!left-auto screen1280:!top-[22px] w-[102px]   screen1280:!-right-[10px] scale-[0.80]`}
                src="/images/refer.png"
              />
              <Image
                alt="refer pro user"
                width={62}
                height={62}
                className={`  hidden screen744:!flex  screen1280:!hidden  top-0 left-0 right-0 mx-auto screen1280:!mr-0 screen1280:!ml-0 screen1280:!left-auto screen1280:!top-[22px] w-[62px]   screen1280:!-right-[10px] `}
                src="/images/refer-mobile.png"
              />
              <div className="  text-left mt-0 screen744:!mt-[8px] screen1280:!mt-0 leading-[18px] mb-[10px]">
                <div className="text-left flex flex-col gap-[10px] leading-[100%]">
                  <span className="text-left font-semibold text-white screen744:!text-[11px] text-[13px] h-[18px] screen1280:!text-[13px]">
                    Refer a friend, Earn rewards{" "}
                  </span>
                  <span className="h-[36px] text-left mt-0 screen744:!mt-[8px] screen1280:!mt-0 font-normal text-white max-w-[111px] text-[11px]  screen744:!text-[10px]  screen1280:!text-[11px] leading-[18px]">
                    Get %20 for each successful payments{" "}
                  </span>
                </div>
              </div>
              <div
                onClick={() => {
                  if (noUser) {
                    setShowLoginModal(true);
                  } else {
                    router.push("/earn100");
                  }
                }}
                className="cursor-pointer max-w-[95px]  screen1280:!max-w-[95px] screen744:!w-full  flex items-center justify-center text-white border-[1px]  h-[24px] w-full rounded-[24px] "
              >
                <span className="text-[14px] font-normal">see details</span>
              </div>
            </div>
          </>
        )}
      </>
    );
  };

  useEffect(() => {
    // Show extra discount only for NEW free users who do NOT have an active referral
    if (!isLoaded) return; // wait until user state is ready

    const referralActive =
      (user as any)?.publicMetadata?.referralActive === true;
    const isFree = (user as any)?.publicMetadata?.plan === "free";

    if (isSignedIn && isNewUser && isFree && !referralActive) {
      setShowExtraDiscount(true);
    } else {
      setShowExtraDiscount(false);
    }
  }, [isLoaded, isSignedIn, isNewUser, user, setShowExtraDiscount]);

  const signOut = async (opts?: { redirectUrl?: string }) => {
    await signOutWebSession(router, opts?.redirectUrl ?? "/sign-in");
  };
  const [practice, setPractice] = useState(false);
  const [mockTest, setMockTest] = useState(false);

  useEffect(() => {
    if (
      pathname === "/practice-overview" ||
      pathname.includes("listening") ||
      pathname.includes("reading") ||
      pathname.includes("writing") ||
      pathname.includes("speaking")
    ) {
      setPractice(true);
      setMockTest(false);
    } else if (pathname === "/exam-overview" || pathname.includes("exams")) {
      setMockTest(true);
      setPractice(false);
    } else if (pathname.includes("/learning")) {
      setPractice(false);
      setMockTest(false);
    }
  }, [pathname]);
  useEffect(() => {
    if (pathname === "/practice-overview") {
      setPractice(true);
      setMockTest(false);
    } else if (pathname === "/exam-overview") {
      setMockTest(true);
      setPractice(false);
    }
  }, []);

  useEffect(() => {
    const routes = [
      {
        path: "/practice-overview",
        submenu: "All",
        active: "practice",
        open: true,
      },
      {
        path: "/exam-overview",
        submenu: "",
        active: "mock",
        open: false,
      },
      {
        path: "/listening",
        submenu: "Listening",
        active: "practice",
        open: true,
      },
      { path: "/reading", submenu: "Reading", active: "practice", open: true },
      { path: "/writing", submenu: "Writing", active: "practice", open: true },
      {
        path: "/speaking",
        submenu: "Speaking",
        active: "practice",
        open: true,
      },
    ];

    if (pathname.includes("profile")) {
      setActive("profile");
    }

    if (selectedExam) {
      if (pathname.includes("exams")) {
        setActive(selectedExam);
      }
    } else {
      for (const route of routes) {
        if (pathname.includes(route.path)) {
          setOpen(route.open);
          setSubmenuActive(route.submenu);
          setActive(route.active);
          break;
        } else if (pathname.includes("plans")) {
          setActive("Plans");
          setSubmenuActive("");
        }
      }
    }
  }, [pathname, selectedExam]);

  useEffect(() => {
    if (active === "practice") {
      const match =
        selectedTask?.category?.toLowerCase() === submenuActive.toLowerCase();
      if (!match) {
        setSelectedTask(null);
      } else {
        setSubmenuActive(`${selectedTask.taskNumber} ${selectedTask.name}`);
      }
    } else {
      setSubmenuActive("");
    }
  }, [selectedTask]);

  useEffect(() => {
    if (active == "mock" || active === "profile") {
      setSelectedExam("");
      setSubmenuActive("");
      setOpen(false);
    }
    return () => {
      setSelectedTask(null);
    };
  }, [active]);

  useEffect(() => {
    if (pathname === "/listening") {
      setSubmenuActive("Listening");
      setActive("practice");
    }
    if (pathname === "/reading") {
      setSubmenuActive("Reading");
      setActive("practice");
    }
    if (pathname === "/writing") {
      setSubmenuActive("Writing");
      setActive("practice");
    }
    if (pathname === "/speaking") {
      setSubmenuActive("Speaking");
      setActive("practice");
    }
    if (pathname === "/exam-overview") {
      setSubmenuActive("Mock Test");
      setActive("mock");
    }
  }, [pathname]);

  useEffect(() => {
    const syncExamViewMode = () => {
      if (typeof window === "undefined") {
        return;
      }

      const storedMode = window.localStorage.getItem(
        MOCK_EXAM_VIEW_MODE_STORAGE_KEY
      );
      setIsOfficialExamView(storedMode === "official");
    };

    syncExamViewMode();

    window.addEventListener(MOCK_EXAM_VIEW_MODE_EVENT, syncExamViewMode);
    window.addEventListener("storage", syncExamViewMode);

    return () => {
      window.removeEventListener(MOCK_EXAM_VIEW_MODE_EVENT, syncExamViewMode);
      window.removeEventListener("storage", syncExamViewMode);
    };
  }, []);

  const hideMainHeaderForOfficialExam =
    pathname.includes("exams") && isOfficialExamView;

  return (
    <>
      {noUser ? (
        showLoginModal && <LoginModal />
      ) : (
        <></>
      )}

      {isMenuOpen && (
        <div className="fixed top-0 w-full h-full  backdrop-blur-[20px] z-[100]"></div>
      )}
      <motion.div
        ref={sidebarMenuRef}
        initial={{ x: "-100%" }}
        animate={{ x: isMenuOpen ? "0" : "-100%" }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className={` z-[101] fixed left-0 top-0 flex flex-col text-[#3D3B3B] bg-[#f9f9f9]  w-full max-w-[351px] h-[100vh] max-h-screen overflow-y-auto`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className={clsx(
            collapsed
              ? "max-w-[150px] "
              : " screen744:!flex screen744:!max-w-[180px] screen1280:!max-w-[250px] px-[24px]",
            "h-[100%] screen1280:!h-fit   screen744:!absolute  screen1280:!static  z-[9] transition-all duration-1000 ease-in-out flex flex-col pt-[20px] bg-white w-full border-r-[1px] border-[#D5D6D8]"
          )}
        >
          <div
            className={clsx(
              "flex w-full items-center ",
              collapsed ? "justify-end ml-1.5" : "justify-between"
            )}
          >
            <div
              onClick={() => setIsMenuOpen(false)}
              className="absolute right-[20px]  cursor-pointer"
            >
              <SvgClose />
            </div>
          </div>

          <NavItem
            icon={<SvgPractice />}
            label="Practice"
            link="#"
            setCollapsed={setCollapsed}
            primary="practice"
            subItems={[
              {
                label: "All",
                link: "/practice-overview",
                icon: <SvgAllSkills />,
              },
              {
                label: "Listening",
                link: "/listening",
                icon: <SvgListeningPart />,
              },
              {
                label: "Speaking",
                link: "/speaking",
                icon: <SvgSpeakingPart />,
              },
              { label: "Writing", link: "/writing", icon: <SvgWritingPart /> },
              { label: "Reading", link: "/reading", icon: <SvgReadingPart /> },
            ]}
            setIsMenuOpen={setIsMenuOpen}
            active={active}
            collapsed={collapsed}
            open={open}
            setOpen={setOpen}
            setActive={setActive}
            submenuActive={submenuActive}
            setSubmenuActive={setSubmenuActive}
          />
          <NavItem
            primary={"mock"}
            icon={<SvgMockTest />}
            label="Mock Test"
            link="exam-overview"
            active={active}
            collapsed={collapsed}
            open={open}
            setIsMenuOpen={setIsMenuOpen}
            setOpen={setOpen}
            setActive={setActive}
            submenuActive={submenuActive}
            setSubmenuActive={setSubmenuActive}
          />
          {displayUser && (
            <NavItem
              link="/profile"
              icon={<SvgProfile />}
              label="Profile"
              primary={"profile"}
              active={active}
              setIsMenuOpen={setIsMenuOpen}
              collapsed={collapsed}
              open={open}
              setOpen={setOpen}
              setActive={setActive}
              submenuActive={submenuActive}
              setSubmenuActive={setSubmenuActive}
            />
          )}

          {displayUser && (
            <NavItem
              link="/earn100"
              icon={<SvgReferral />}
              label="Referral"
              primary={"referral"}
              active={active}
              setIsMenuOpen={setIsMenuOpen}
              collapsed={collapsed}
              open={open}
              setOpen={setOpen}
              setActive={setActive}
              submenuActive={submenuActive}
              setSubmenuActive={setSubmenuActive}
            />
          )}

          <div
            className={clsx(
              collapsed
                ? "opacity-0"
                : "opacity-100 transition-opacity duration-700 delay-700 pb-[100px]"
            )}
          >
            {showPlansForUsers()}
          </div>
        </div>
      </motion.div>
      {displayUser && visibleHorizontalCoupon && (
        <div className="flex items-center flex-wrap justify-between screen744:!justify-center px-[8px] screen1280:!px-[16px] py-[14px] gap-[5px] screen1280:!gap-[32px] bg-[#37465C]  h-auto min-h-[64px] ">
          <div className="flex flex-col screen744:!flex-row gap-[2px] items-center justify-center text-white h-auto text-[12px]   screen744:!text-[20px] font-bold">
            Extra 10% Discount
            <span className="text-[11px] screen744:!text-[16px] font-normal">
              (New users)
            </span>
          </div>

          <div className="rounded-[12px]  flex gap-[4px] screen744:!gap-[16px] px-[8px] screen744:!px-[24px] py-[12px] h-[36px] bg-[#F4845F]  justify-center items-center  ">
            <span className="text-white text-[12px] screen744:!text-[18px] font-semibold">
              {couponId}
            </span>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  .writeText(couponId?.toString() ?? "")
                  .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
              }}
              className="flex-1 cursor-pointer flex px-[20px] py-[8px] h-[28px] rounded-[8px] bg-white items-center justify-center gap-[8px]"
            >
              <SvgCopy />
              <span className="text-[#37465C] text-[12px] font-semibold">
                Copy
              </span>
            </button>
          </div>
          <div className="hidden screen744:!flex min-h-[23px] items-center h-auto gap-[8px] justify-center">
            <span className="text-[14px]  text-white font-semibold ">
              Expires in
            </span>
            <CountdownTimer userCreatedAt={displayUser?.createdAt} />
          </div>
        </div>
      )}

      {!hideMainHeaderForOfficialExam && <TopHeader />}

      <div className="relative mx-auto z-[9] flex w-full max-w-[1440px] justify-center overflow-x-clip">
        <div
          className={cn(
            "flex h-full w-full flex-col items-end screen744:!w-[calc(100%-84px)]",
            {
              "mb-[120px] pt-[88px] screen744:pt-[96px]":
                !hideMainHeaderForOfficialExam,
              "pt-0 screen744:pt-0": hideMainHeaderForOfficialExam,
            }
          )}
        >
          {children}
          {copied && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#37465C] text-white px-4 py-2 rounded-[8px] text-[14px] shadow-lg z-[9999] transition-opacity duration-300">
              Copied to clipboard!
            </div>
          )}
        </div>

        {/* bottom menu for mobile */}
        {!hideMainHeaderForOfficialExam && <BottomNavigation />}
      </div >
      <GlobalInteractiveProvider />
    </>
  );
};

export default LayoutClient;

{
  /* define fadeIn keyframes globally */
}
<style jsx global>{`
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`}</style>;
