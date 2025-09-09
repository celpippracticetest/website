"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  useClerk,
  useUser,
} from "@clerk/nextjs";

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
import PlanCard from "@/components/pages/dashboard/PlanCard";
import ExtraDiscountModal from "@/components/modal/ExtraDiscountModal";
import { useExtraDiscountStore } from "@/store/useExtraDiscount.store";
import { useCreateDiscountCoupon } from "@/hooks/useCreateDiscountCoupon";
import SvgCopy from "@/components/icons/Copy";
import { planDetails } from "../Plans";
import React from "react";
import { motion } from "framer-motion";
import SvgClose from "@/components/icons/Close";
import { useMenuCollapsedStore } from "@/store/menuCollapsed.store";
import CountdownTimer from "@/components/dashboard-app/CounterDownTimer";
import OnboardingSurvey from "@/components/onboardingSurvey";
import SvgReferral from "@/components/icons/Referral";
import SvgLearning from "@/components/icons/Learning";
import SvgMockTestNavigation from "@/components/icons/MockTestNavigation";
import SvgBottomNavigation from "@/components/icons/BottomNavigation";
import SvgPracticeHover from "@/components/icons/PracticeHover";
import {
  SvgBottomNavigationMobile,
  SvgMockTestHover,
  SvgMockTestTopNavigationHover,
  SvgPracticeBlueHover,
  SvgRefferalMobileNavigation,
} from "@/components/icons";
import SvgDiamond from "@/components/icons/Diamond";
import SvgLearningGift from "@/components/icons/LearningGift";

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
      className={`flex flex-col cursor-pointer w-full ${
        primary === "practice" ? "mt-[24px]" : "mt-[16px]"
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
            className={`${
              collapsed ? "justify-center" : "justify-start"
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
              animation: `fadeIn 0.3s ease-in-out ${
                open ? "500ms" : "0ms"
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

const LayoutClient = ({ children, showCompletedModal, showSurvey }: any) => {
  const sidebarMenuRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const couponId = useExtraDiscountStore((state) => state.couponId);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [surveyVisible, setSurveyVisible] = useState(showSurvey);
  const router = useRouter();

  const setShowExtraDiscount = useExtraDiscountStore(
    (state) => state.setShowExtraDiscount
  );
  const showExtraDiscount = useExtraDiscountStore(
    (state) => state.showExtraDiscount
  );
  const visibleHorizontalCoupon = useExtraDiscountStore(
    (state) => state.visibleHorizontalCoupon
  );
  const setVisibleHorizontalCoupon = useExtraDiscountStore(
    (state) => state.setVisibleHorizontalCoupon
  );
  const { user, isLoaded, isSignedIn }: any = useUser();

  const noUser = isLoaded ? !isSignedIn : false;

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLDivElement>(null);
  const { collapsed, setCollapsed } = useMenuCollapsedStore((state) => state);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const [submenuActive, setSubmenuActive] = useState("");
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();

  const [isUserDropDownOpen, setUserDropDownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const isNewUser =
    user?.createdAt &&
    new Date().getTime() - new Date(user.createdAt).getTime() <
      24 * 60 * 60 * 1000;
  const freeUser = user?.publicMetadata.plan == "free";
  const proUser = user?.publicMetadata.plan == "premium";

  const { selectedTask, setSelectedTask } = useSelectedTask();
  const { selectedExam, setSelectedExam } = useSelectedExam();

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

  const upgradeModalOpenRef = useRef(showUpgradeModal);
  const loginModalOpenRef = useRef(showLoginModal);

  useEffect(() => {
    upgradeModalOpenRef.current = showUpgradeModal;
  }, [showUpgradeModal]);

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
          if (!upgradeModalOpenRef.current) {
            setIsMenuOpen(false);
          }
        } else if (noUser) {
          if (!loginModalOpenRef.current) {
            setIsMenuOpen(false);
          }
        } else {
          setIsMenuOpen(false);
        }
      }

      if (ref.current && !ref.current.contains(event.target)) {
        setShowUpgradeModal(false);
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

  const UpgradeModal = () => {
    return (
      <div className="z-[999] fixed px-[14px] top-0 left-0 right-0 bottom-0 screen744:!px-[16px] screen1280:!px-[20px] overflow-y-auto bg-[#17161680] flex justify-center items-start">
        <div
          ref={ref}
          className="flex-col mt-[80px] mb-[40px] relative w-full h-auto   screen1280:!w-[670px] screen744:!w-[584px] pt-[20px]  pb-[24px]  min-h-[474px] rounded-[24px] bg-[#F2F6FF] flex bg-[linear-gradient(to_right,_#F4845F26,_#759CFF26)]"
        >
          <div
            onClick={() => setShowUpgradeModal(false)}
            className="absolute right-[20px] cursor-pointer"
          >
            <SvgClose />
          </div>
          <Image
            alt="plan sale modal"
            width={80}
            height={70}
            className={`asbolute mx-auto left-0 right-0 w-[80px] h-[70px]`}
            src="/images/plan-sale-modal.png"
          />
          <div className="flex w-full justify-center pt-[16px] text-[16px] screen744:!text-[20px] font-semibold">
            Summer Flash Sale!
          </div>
          <div className="flex w-full justify-center h-[48px] mt-[24px] text-[24px] screen744:!text-[38px] font-bold">
            Up to 80% Off All Plans!{" "}
          </div>
          <div className="flex gap-[12px] flex-col-reverse screen744:!flex-row  ">
            {planDetails.map((item, index) => (
              <PlanCard
                key={index}
                id={index}
                title={item.title}
                type={item.type}
                oldPrice={item.oldPrice}
                price={item.price}
                buttonTitle={item.buttonTitle}
                icon={item.icon}
                iconWrapperColor={item.iconWrapperColor}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const LoginModal = () => {
    return (
      <div className="z-[999] px-[16px] fixed top-0 left-0 right-0 mx-auto w-full h-full bg-[#17161680] flex justify-center items-center">
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
            Please log in to start the exam{" "}
            <SignUpButton>
              <div className="text-[14px] cursor-pointer flex items-center justify-center text-white bg-[#4A7DFF] rounded-[24px] h-[40px] mt-[12px]  text-center font-normal">
                Create a free account
              </div>
            </SignUpButton>
          </div>

          <div className="flex justify-center items-center mt-[32px] gap-[20px]">
            <div className="h-[1px] w-full bg-[#D5D6D8]"></div>
            <span className="text-[#37465C] text-[14px]">Or</span>
            <div className="h-[1px] w-full bg-[#D5D6D8]"></div>
          </div>
          <div className="text-[16px]   mt-[32px]  text-center font-medium">
            <span>Do you have an account? </span>{" "}
            <SignInButton>
              <span className="text-[#316BFF] cursor-pointer"> Login </span>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  };

  const { mutate: createCoupon } = useCreateDiscountCoupon();

  useEffect(() => {
    if (freeUser && isNewUser) {
      createCoupon(user.id);
    }
  }, [user]);

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
                    setShowUpgradeModal(true);
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

        {proUser && (
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
                  if (freeUser) {
                    setShowUpgradeModal(true);
                  } else {
                    setShowLoginModal(true);
                  }
                }}
                className="cursor-pointer max-w-[95px]  screen1280:!max-w-[95px] screen744:!w-full  flex items-center justify-center text-white border-[1px]  h-[24px] w-full rounded-[24px] "
              >
                <Link href={"/earn100"} className=" text-[14px] font-normal ]">
                  see details
                </Link>
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

  const { signOut } = useClerk();
  const [practice, setPractice] = useState(false);
  const [mockTest, setMockTest] = useState(false);

  useEffect(() => {
    if (pathname === "/practice-overview") {
      setPractice(true);
      setMockTest(false);
    } else if (pathname === "/exam-overview" || pathname.includes("exams")) {
      setMockTest(true);
      setPractice(false);
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

  return (
    <>
      {freeUser ? (
        <>
          {showUpgradeModal && <UpgradeModal />}
          {!surveyVisible && showExtraDiscount && <ExtraDiscountModal />}
        </>
      ) : noUser ? (
        showLoginModal && <LoginModal />
      ) : (
        <></>
      )}

      {isMenuOpen && (
        <div className="fixed top-0 w-full h-full  backdrop-blur-[20px] z-[9]"></div>
      )}
      <motion.div
        ref={sidebarMenuRef}
        initial={{ x: "-100%" }}
        animate={{ x: isMenuOpen ? "0" : "-100%" }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className={` z-[9] fixed left-0 top-0 flex flex-col text-[#3D3B3B] bg-[#f9f9f9]  w-full max-w-[351px] h-[100vh] max-h-screen overflow-y-auto`}
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
          {user && (
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

          {user && proUser && (
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
      {user && visibleHorizontalCoupon && (
        <div className="flex  items-center flex-wrap justify-between screen744:!justify-center px-[8px] screen1280:!px-[16px] py-[14px] gap-[5px] screen1280:!gap-[32px] bg-[#37465C]  h-auto min-h-[64px] ">
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
          <div className="hidden screen744:!flex  min-h-[23px] items-center h-auto   gap-[8px] justify-center    ">
            <span className="text-[14px]  text-white font-semibold ">
              Expires in
            </span>
            <CountdownTimer userCreatedAt={user?.createdAt} />
          </div>
        </div>
      )}

      <div className="relative flex w-full mb-[100px] justify-center mx-auto z-[99999999] overflow-x-clip">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-[220px] w-[1065px] h-[629px] rounded-[9999px]"
          style={{ background: "#DAFFFA", filter: "blur(120px)", opacity: 0.8 }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-[360px] top-1/4 w-[1065px] h-[629px] rounded-[9999px] rotate-[-20deg]"
          style={{
            background: "#CEDCFF80",
            filter: "blur(120px)",
            opacity: 0.9,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[360px] top-1/3 w-[1065px] h-[629px] rounded-[9999px] rotate-[15deg]"
          style={{
            background: "#FFB78A80",
            filter: "blur(120px)",
            opacity: 0.9,
          }}
        />

        <div
          className="flex flex-col  w-full    h-full     w-full
 bg-[#F4F7FF] items-end"
        >
          <div className=" mx-auto px-[16px]  w-full mb-[16px]">
            <div
              className={clsx(
                "transition-all flex justify-between w-full px-[16px] duration-1000 ease-in-out mt-[24px] rounded-[32px] ",
                "screen1280:!w-full mx-auto  flex h-[80px] max-w-[1280px] items-center justify-center pl-[24px] relative w-full border border-[#D1DEFF] bg-[linear-gradient(90deg,_rgba(255,_255,_255,_0.65)_0%,_rgba(255,_255,_255,_0.2)_100%)] ",
                "flex-row items-center"
              )}
            >
              <div className="flex gap-[64px] w-full">
                <Image
                  onClick={() => router.push("/")}
                  alt="full logo"
                  width={133}
                  height={40}
                  className={clsx(
                    "opacity-100 delay-300 hover:!cursor-pointer"
                  )}
                  src="/images/logo.png"
                />

                <div className="hidden screen1280:!flex gap-[24px] shrink-0 items-center">
                  {practice ? (
                    <>
                      <div
                        className="flex gap-[8px] group items-center hover:!cursor-pointer relative"
                        onClick={() => router.push("/practice-overview")}
                      >
                        <div className="relative w-[24px] h-[24px] flex items-center justify-center">
                          <div className=" w-[24px] h-[24px]  items-center justify-center group-hover:flex ">
                            <SvgPracticeBlueHover className="   text-[#316BFF]   duration-200 " />
                          </div>
                        </div>
                        <span className="text-[#316BFF] transition-colors duration-200">
                          Practice
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="flex gap-[8px] group items-center hover:!cursor-pointer relative"
                        onClick={() => router.push("/practice-overview")}
                      >
                        <div className="relative w-[24px] h-[24px] flex items-center justify-center">
                          <div className=" w-[24px] h-[24px] flex items-center justify-center group-hover:hidden">
                            <SvgPractice
                              fill="transparent"
                              stroke={"#76808F"}
                              className="    duration-200 "
                            />
                          </div>
                          <div className="hidden w-[24px] h-[24px]  items-center justify-center group-hover:flex ">
                            <SvgPracticeBlueHover className="   text-[#316BFF]   duration-200 group-hover:opacity-100" />
                          </div>
                        </div>
                        <span className="text-[#76808F] group-hover:text-[#316BFF] transition-colors duration-200">
                          Practice
                        </span>
                      </div>
                    </>
                  )}

                  {mockTest ? (
                    <>
                      <div
                        className="flex gap-[8px] group items-center hover:!cursor-pointer relative"
                        onClick={() => router.push("/exam-overview")}
                      >
                        <div className="relative  flex items-center justify-center">
                          <div className="flex w-[24px] h-[24px]  items-center justify-center  ">
                            <SvgMockTestTopNavigationHover className="   text-[#316BFF]   duration-200 opacity-100" />
                          </div>
                        </div>
                        <span className=" text-[#316BFF] transition-colors duration-200">
                          Mock Test
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="flex gap-[8px] group items-center hover:!cursor-pointer relative"
                        onClick={() => router.push("/exam-overview")}
                      >
                        <div className="relative  flex items-center justify-center">
                          <div className=" w-[24px] h-[24px] flex items-center justify-center group-hover:hidden">
                            <SvgMockTest className="  text-[#76808F]  duration-200 " />
                          </div>
                          <div className="hidden w-[24px] h-[24px]  items-center justify-center group-hover:flex ">
                            <SvgMockTestTopNavigationHover className="   text-[#316BFF]   duration-200 group-hover:opacity-100" />
                          </div>
                        </div>
                        <span className="text-[#76808F] group-hover:text-[#316BFF] transition-colors duration-200">
                          Mock Test
                        </span>
                      </div>
                    </>
                  )}

                  <div
                    className="flex gap-[8px] group items-center hover:!cursor-pointer relative"
                    onClick={() => router.push("/learning")}
                  >
                    <div className="relative  flex items-center justify-center">
                      <div className="flex group-hover:hidden w-[24px] h-[24px]  items-center justify-center">
                        <SvgLearning
                          stroke="#76808F"
                          fill="transparent"
                          className="text-[#76808F] group-hover:text-[#316BFF]"
                        />
                      </div>

                      <div className="hidden group-hover:flex w-[24px] h-[24px]  items-center justify-center">
                        <SvgLearning
                          stroke="#316BFF"
                          fill="#316BFF"
                          className="text-[#316BFF]"
                        />
                      </div>
                    </div>
                    <span className="text-[#76808F] group-hover:text-[#316BFF] transition-colors duration-200">
                      Learning
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between  h-[48px]">
                {/* <span
                onClick={() => setIsMenuOpen && setIsMenuOpen(!isMenuOpen)}
                className="flex cursor-pointer gap-[5px] items-center justify-center w-[40px] h-[40px] border-[#D5D6D8]  border-[1px] rounded-[100%] screen744:!hidden"
              >
                <SvgHamburger />
              </span> */}
                <div className="hidden screen744:!flex flex-col"></div>

                {/* auth buttons */}
                <div className="flex items-right gap-4 lg:gap-5 md:gap-3 pr-[24px]">
                  <div className="flex items-center">
                    {proUser ? (
                      <>
                        <button
                          className="hidden gap-[10px] screen744:!flex w-[149px] shrink-0 h-[40px] rounded-[24px] shadow-startButton cursor-pointer 
             [border:1.5px_solid_transparent] 
             [background:linear-gradient(white,white)_padding-box,linear-gradient(270deg,#F79D65_0%,#759CFF_100%)_border-box] 
             group hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] hover:!border-none  items-center justify-center"
                          onClick={() => {
                            router.push("/earn100");
                          }}
                        >
                          <span>
                            <SvgLearningGift />
                          </span>
                          <span className="font-regular text-[14px] text-[#37465C] text-black group-hover:text-white">
                            Earn $100
                          </span>
                        </button>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="Scroll to Plans Section"
                          onClick={() => {
                            router.push("/earn100");
                          }}
                          className="flex screen744:!hidden  shrink-0 hover:cursor-pointer relative w-[40px] h-[40px] border-[1px] border-[#D5D6D8] rounded-[24px]  items-center justify-center"
                        >
                          <SvgRefferalMobileNavigation />
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="Scroll to Plans Section"
                          onClick={() => {
                            if (freeUser) {
                              setShowUpgradeModal(true);
                            } else {
                              setShowLoginModal(true);
                            }
                          }}
                          className=" mr-[16px] shrink-0 hover:cursor-pointer screen744:!ml-0 relative w-[40px] h-[40px] border-[1px] border-[#D5D6D8] rounded-[24px] flex items-center justify-center"
                        >
                          <SvgDiamond />
                          <div className="absolute leading-[16px] font-semibold rotate-[10deg]    flex text-white items-center justify-center bg-error1 rounded-[16px] w-[34px] h-[20px] -top-[12px] -right-[12px]  text-[10px]">
                            PRO
                          </div>
                        </div>
                      </>
                    )}

                    <SignedOut>
                      <button
                        className="group  hover:!bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] shadow-startButton w-[149px] hover:cursor-pointer
                 cursor-pointer bg-white rounded-[24px] border-[1.5px] h-full screen1280:border-neutral2 hover:!border-none flex items-center justify-center"
                      >
                        <span className=" cursor-pointer flex items-center justify-center h-[40px] font-medium text-[14px] hover:text-white text-black w-[146px]">
                          <SignUpButton>
                            <span className="cursor-pointer">Sign Up</span>
                          </SignUpButton>
                          /
                          <SignInButton>
                            <span className="cursor-pointer">Login</span>
                          </SignInButton>
                        </span>
                      </button>
                    </SignedOut>
                    <SignedIn>
                      <button
                        id="dropdownDefaultButton"
                        data-dropdown-toggle="dropdown"
                        type="button"
                        onClick={() => {
                          setUserDropDownOpen(!isUserDropDownOpen);
                        }}
                        className="cursor-pointer shrink-0 mr-[24px] ml-[16px]"
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
                {/* dropdown for auth buttons */}
                <div
                  ref={userDropdownRef}
                  className={
                    (isUserDropDownOpen && user ? "" : " hidden ") +
                    " absolute right-0 z-10 mt-2 w-56 top-[48px] rounded-md bg-white ring-1 shadow-lg ring-black/5 focus:outline-hidden"
                  }
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="menu-button"
                  tabIndex={-1}
                >
                  <div className="py-1" role="none">
                    {user &&
                      user.publicMetadata.roles &&
                      user.publicMetadata.roles.includes("admin") && (
                        <a
                          href="/cms/dashboard"
                          className="block px-4 py-2 text-[14px] text-gray-700 w-full text-left"
                          role="menuitem"
                          tabIndex={-1}
                          id="menu-item-0"
                        >
                          CMS Dashboard
                        </a>
                      )}

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
                        if (
                          typeof window !== "undefined" &&
                          (window as any).Intercom
                        ) {
                          (window as any).Intercom("show");
                        }
                      }}
                      className=" block px-4 py-2 text-[14px] text-gray-700 w-full text-left cursor-pointer"
                      role="menuitem"
                      tabIndex={-1}
                      id="support-button"
                    >
                      Support
                    </button>

                    <button
                      onClick={() => {
                        localStorage.removeItem("hasClosedExtraDiscountModal");

                        signOut();
                      }}
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
            </div>
          </div>

          {surveyVisible && (
            <div className="fixed inset-0 z-[99] flex screen1280:!pt-[101px] justify-center bg-[#F4F7FF]">
              <OnboardingSurvey onComplete={() => setSurveyVisible(false)} />
            </div>
          )}

          {children}
          {copied && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#37465C] text-white px-4 py-2 rounded-[8px] text-[14px] shadow-lg z-[9999] transition-opacity duration-300">
              Copied to clipboard!
            </div>
          )}
        </div>
        <div
          className="
    fixed bottom-[16px] left-0 right-0
    mx-auto
    max-w-[1440px]
    screen1280:px-[80px] px-[16px]
    screen744:w-[calc(100%-84px)]
    screen1280:!hidden
  "
          style={{ height: 82, pointerEvents: "none" }}
        >
          <div className="hidden screen744:!flex">
            <SvgBottomNavigation className="hidden screen744:!flex absolute inset-0 w-full h-full" />
          </div>
          <div className="flex screen744:!hidden items-center">
            <SvgBottomNavigationMobile className="flex screen744:!hidden absolute right-0 left-0 mx-auto inset-0 w-full h-full" />
          </div>
          <div
            className="
      relative z-10
      grid grid-cols-3
      items-center justify-items-center
      gap-[24px] h-full
    "
            style={{ pointerEvents: "auto" }}
          >
            {practice ? (
              <>
                <div
                  className="group flex flex-col items-center mt-5 gap-1 cursor-pointer"
                  onClick={() => router.push("/practice-overview")}
                >
                  <div className=" flex">
                    <SvgPracticeHover className="text-white" />
                  </div>

                  <span className="text-xs text-[#FC8A65]">Practice</span>
                  <span className="w-[4px] h-[4px] rounded-full bg-[#FC8A65] flex"></span>
                </div>
              </>
            ) : (
              <>
                <div
                  className="group flex flex-col items-center mt-5 gap-1 cursor-pointer"
                  onClick={() => router.push("/practice-overview")}
                >
                  <div className="flex group-hover:hidden w-[24px] h-[24px]  items-center justify-center">
                    <SvgPractice
                      stroke="#76808F"
                      fill="transparent"
                      className="text-[#76808F] "
                    />
                  </div>

                  <div className="hidden group-hover:flex">
                    <SvgPracticeHover className="text-white" />
                  </div>

                  <span className="text-xs text-[#76808F] group-hover:text-[#FC8A65]">
                    Practice
                  </span>
                  <span className="w-[4px] h-[4px] rounded-full group-hover:bg-[#FC8A65] group-hover:flex"></span>
                </div>
              </>
            )}

            {mockTest ? (
              <>
                <div
                  className="
    flex flex-col gap-[4px] items-center cursor-pointer
    relative
     translate-y-[2px] transition-transform
  "
                  onClick={() => router.push("/exam-overview")}
                >
                  <div className="w-[44px] h-[44px]  flex items-center justify-center rounded-full bg-[radial-gradient(50%_265.62%_at_50%_50%,_#F26B3E_0%,_#FC8A65_100%)]">
                    <div className=" flex w-[24px] h-[24px] items-center justify-center">
                      <SvgMockTestHover className=" text-[#FC8A65]" />
                    </div>
                  </div>
                  <span className="text-xs text-[#FC8A65]">Mock Test</span>
                  <span className="w-[4px] h-[4px] rounded-full bg-[#FC8A65] flex"></span>
                </div>
              </>
            ) : (
              <>
                <div
                  className="
    flex flex-col gap-[4px] items-center group hover:cursor-pointer
    relative
    translate-y-[4px] hover:translate-y-[2px] transition-transform
  "
                  onClick={() => router.push("/exam-overview")}
                >
                  <div className="w-[48px] group-hover:!w-[44px] group-hover:!h-[44px] h-[48px] flex items-center justify-center rounded-full bg-[radial-gradient(50%_265.62%_at_50%_50%,_#F26B3E_0%,_#FC8A65_100%)]">
                    <SvgMockTestNavigation className="text-[#76808F] flex group-hover:hidden group-hover:text-[#FC8A65]" />

                    <div className="hidden group-hover:flex w-[24px] h-[24px] items-center justify-center">
                      <SvgMockTestHover className="text-[#76808F] group-hover:text-[#FC8A65]" />
                    </div>
                  </div>
                  <span className="text-xs text-[#76808F] group-hover:text-[#FC8A65]">
                    Mock Test
                  </span>
                  <span className="w-[4px] h-[4px] rounded-full group-hover:bg-[#FC8A65] group-hover:flex"></span>
                </div>
              </>
            )}

            <div
              className="group flex flex-col items-center mt-5 gap-1 cursor-pointer"
              onClick={() => router.push("/learning")}
            >
              <div className="flex group-hover:hidden w-[24px] h-[24px]  items-center justify-center">
                <SvgLearning
                  stroke="#76808F"
                  fill="transparent"
                  className="text-[#76808F] group-hover:text-[#FC8A65]"
                />
              </div>

              <div className="hidden group-hover:flex w-[24px] h-[24px]  items-center justify-center">
                <SvgLearning
                  stroke="#FC8A65"
                  fill="#FC8A65"
                  className="text-[#FC8A65]"
                />
              </div>

              <span className="text-xs text-[#76808F] group-hover:text-[#FC8A65]">
                Learning
              </span>
              <span className="w-[4px] h-[4px] rounded-full group-hover:bg-[#FC8A65] group-hover:flex"></span>
            </div>
          </div>
        </div>
      </div>
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
