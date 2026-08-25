"use client";
import React from "react";
import SvgCloseEye from "@/components/icons/CloseEye";
import SvgOpenEye from "@/components/icons/OpenEye";
import SvgDesktop from "@/components/icons/Desktop";
import SvgPhone from "@/components/icons/Phone";
import SvgTrash from "@/components/icons/Trash";
import SvgTrashCircle from "@/components/icons/TrashCircle";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useDeleteUserSessions } from "@/hooks/useDeleteUserSessions";
import { useGetUserSessions } from "@/hooks/useGetUserSessions";
import { useRouter } from "next/navigation";
import { useDeleteUserAccount } from "@/hooks/useDeleteUserAccount";
import { signOutWebSession } from "@/lib/auth/client-sign-out";
import { useDeleteUserEmail } from "@/hooks/useDeleteUserEmail";
import SvgCloseCircle from "@/components/icons/CloseCircle";
import Link from "next/link";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import {
  hasPaidPracticeAccess,
  planSourceIndicatesGooglePlay,
} from "@/lib/subscriptionAccess";
import { trackKpi } from "@/lib/analytics";

type ProfileBillingProvider = "stripe" | "google_play" | null;

export default function Profile({
  prevCheckout,
  subscriptionData,
  billingProvider = null,
  googlePlayCanCancel = false,
}: {
  prevCheckout?: any;
  subscriptionData?: any;
  billingProvider?: ProfileBillingProvider;
  googlePlayCanCancel?: boolean;
}) {
  const { user, isLoaded, isSignedIn, reloadUser } = useHybridWebUser();
  const [planNameDisplay, setPlanNameDisplay] = useState<string>("");
  const [isPlanLoaded, setIsPlanLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Priority: Use subscription data if available, otherwise fallback to checkout data
    if (subscriptionData?.planName) {
      setPlanNameDisplay(subscriptionData.planName);
      setIsPlanLoaded(true);
    } else if (
      subscriptionData &&
      subscriptionData.currentPeriodStart &&
      subscriptionData.currentPeriodEnd
    ) {
      setPlanNameDisplay(subscriptionData.planName || "Premium Plan");
      setIsPlanLoaded(true);
    } else if (prevCheckout && prevCheckout.createdAt) {
      // Fallback to checkout data for one-time purchases
      const description = prevCheckout.lineItems?.[0]?.description;
      setPlanNameDisplay(description || "Premium Plan");
      setIsPlanLoaded(true);
    } else {
      // Fallback based on metadata if no data found but user is marked as premium
      if (user?.publicMetadata?.plan === "plus") {
        setPlanNameDisplay("Plus");
      } else if (user?.publicMetadata?.plan === "premium") {
        setPlanNameDisplay("Premium Plan");
      } else if (user?.publicMetadata?.plan === "pro") {
        setPlanNameDisplay("Pro Plan");
      } else if (billingProvider === "google_play") {
        setPlanNameDisplay("Plus");
      }
      setIsPlanLoaded(true);
    }
  }, [prevCheckout, subscriptionData, user, billingProvider]);

  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    special: false,
    number: false,
  });
  useEffect(() => {
    setPasswordCriteria({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      number: /\d/.test(password),
    });
  }, [password]);

  const router = useRouter();
  const [showToast, setShowToast] = useState(false);

  const [showEditEmail, setShowEditEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/practice-overview");
    }
  }, [isLoaded, isSignedIn, router]);

  const getSessions = useGetUserSessions();

  const { mutate } = useDeleteUserSessions();
  const { mutate: handleDeleteUserAccount } = useDeleteUserAccount();

  const { mutate: handleDeleteUserEmail } = useDeleteUserEmail();

  const [confirmEmailId, setConfirmEmailId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelPlayConfirm, setShowCancelPlayConfirm] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [cancelingPlay, setCancelingPlay] = useState(false);

  const isGooglePlaySubscriber =
    billingProvider === "google_play" ||
    planSourceIndicatesGooglePlay(user?.publicMetadata?.planSource);
  const playAlreadyCancelled =
    user?.publicMetadata?.planCancelled === true ||
    subscriptionData?.cancelAtPeriodEnd === true;
  const canCancelGooglePlay =
    isGooglePlaySubscriber &&
    !playAlreadyCancelled &&
    (googlePlayCanCancel ||
      hasPaidPracticeAccess(user?.publicMetadata?.plan) ||
      Boolean(subscriptionData));
  const hasPremiumAccount =
    hasPaidPracticeAccess(user?.publicMetadata?.plan) ||
    Boolean(subscriptionData);

  const daysSubscribed = (() => {
    const raw = user?.publicMetadata?.purchaseDate;
    if (!raw) return undefined;
    const start = new Date(String(raw)).getTime();
    if (!Number.isFinite(start)) return undefined;
    return Math.max(0, Math.ceil((Date.now() - start) / 86_400_000));
  })();

  const handleManageSubscription = async () => {
    if (isGooglePlaySubscriber) {
      if (!canCancelGooglePlay) return;
      trackKpi.cancelFlowStart({
        plan:
          planNameDisplay ||
          (typeof user?.publicMetadata?.plan === "string"
            ? user.publicMetadata.plan
            : undefined),
        daysSubscribed,
      });
      setShowCancelPlayConfirm(true);
      return;
    }

    try {
      setLoadingPortal(true);
      trackKpi.cancelFlowStart({
        plan:
          planNameDisplay ||
          (typeof user?.publicMetadata?.plan === "string"
            ? user.publicMetadata.plan
            : undefined),
        daysSubscribed,
      });
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error(error);
      setToastType("error");
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Failed to load subscription portal",
      );
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleCancelGooglePlay = async () => {
    try {
      setCancelingPlay(true);
      const response = await fetch("/api/users/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.error || "Failed to cancel Google Play subscription",
        );
      }
      setShowCancelPlayConfirm(false);
      setToastType("success");
      setToastMessage(
        typeof data.message === "string" && data.message.trim()
          ? data.message
          : "Google Play auto-renew was canceled. You'll keep access until the current period ends.",
      );
      setShowToast(true);
      await reloadUser();
      router.refresh();
      setTimeout(() => setShowToast(false), 4000);
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Failed to cancel Google Play subscription",
      );
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setCancelingPlay(false);
    }
  };

  const handleConfirmDeleteEmail = (emailId: string) => {
    if (!user) return;
    handleDeleteUserEmail(emailId, {
      onSuccess: async () => {
        await reloadUser();
        setToastType("success");
        setToastMessage("Email removed successfully");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      },
      onError: (error: any) => {
        setToastType("error");
        setToastMessage(error?.message || "Failed to remove email");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      },
    });
    setConfirmEmailId(null);
  };

  const handleAddEmail = async () => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || !newEmail.trim()) {
      setToastType("error");
      setToastMessage("Enter a valid email address");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });
      if (error) throw error;

      setToastType("success");
      setToastMessage("Check your inbox to confirm the new email address.");
      setShowEditEmail(false);
      setNewEmail("");
      await reloadUser();
      router.refresh();
    } catch (error: any) {
      setToastType("error");
      setToastMessage(error?.message || "Failed to update email");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  useEffect(() => {
    if (getSessions.data) {
      setSessions(getSessions.data);
    }
  }, [getSessions.data]);

  useEffect(() => {
    if (showToast) {
      getSessions.refetch();
    }
  }, [showToast]);

  const [sessions, setSessions] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setToastType("error");
      setToastMessage("Image is too large. Max size is 1MB.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setToastType("error");
      setToastMessage("Sign-in is not configured.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });

      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: dataUrl, picture: dataUrl },
      });
      if (error) throw error;

      await reloadUser();
      router.refresh();
      setToastType("success");
      setToastMessage("Avatar updated successfully");
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error ? error.message : "Failed to update avatar",
      );
    } finally {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  if (!isLoaded) {
    return (
      <div className="text-center py-10 text-gray-500 w-full">Loading...</div>
    );
  }

  if (!user) return null;

  return (
    <>
      {showToast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg transition-opacity duration-300 ${
            toastType === "success" ? "bg-green-500" : "bg-red-500"
          } text-white`}
        >
          {toastMessage}
        </div>
      )}
      <div className="flex flex-col py-[16px] bg-[#F2F6FF] w-full mx-auto max-w-[1280px]">
        <div className="flex flex-col h-auto min-h-[405px] rounded-[8px] bg-white p-[16px]">
          <div className="text-[#212E42] h-[16px] text-[16px] font-semibold">
            Profile
          </div>
          <div className="flex  justify-between items-center mt-[24px] flex-wrap">
            <div className="flex items-center gap-[8px] h-auto min-h-[40px]">
              <Image
                alt="user photo"
                width={40}
                height={40}
                className="w-[40px] h-[40px] rounded-full"
                src={user?.imageUrl ?? "/images/Ahmed.png"}
              />
              <span>
                {user.firstName
                  ? user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.firstName
                  : "User"}
              </span>
            </div>
            <div>
              <label
                htmlFor="avatarUpload"
                className="flex items-center justify-center border-[#76808F] text-[#76808F] rounded-[24px] border-[1px] font-normal text-[14px] w-[140px] h-[40px] cursor-pointer"
              >
                Upload image
              </label>
              <input
                type="file"
                id="avatarUpload"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>
          <div className="h-[1px] mt-[24px] bg-[#D5D6D8]"></div>
          <div className="flex justify-between h-auto min-h-[48px] items-center mt-[24px] flex-wrap">
            <div className="flex flex-col justify-center h-[48px] gap-[12px]">
              <span className="text-[#212E42] text-[16px] font-medium">
                Email Address
              </span>
              <span className="text-[14px] font-normal text-[#76808F]">
                {user.primaryEmailAddress?.emailAddress || "No email found"}
              </span>
            </div>
            <div>
              {!showEditEmail && (
                <span
                  className="flex items-center justify-center border-[#76808F] text-[#76808F] rounded-[24px] border-[1px] font-normal text-[14px] w-[113px] h-[40px] cursor-pointer"
                  onClick={() => setShowEditEmail(true)}
                >
                  Edit email
                </span>
              )}
              {showEditEmail && (
                <div className="fixed inset-0 bg-[#17161680] flex justify-center items-center z-[9999]">
                  <div className="bg-white rounded-[24px] w-full max-w-[400px] px-[24px] py-[24px] text-center relative">
                    <button
                      className="absolute top-4 right-4 text-gray-500"
                      onClick={() => {
                        setShowEditEmail(false);
                        setNewEmail("");
                      }}
                    >
                      ✕
                    </button>
                    <h2 className="text-[#212E42] text-[18px] font-semibold mb-4">
                      Change Email
                    </h2>
                    <input
                      type="email"
                      placeholder="Enter new email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="border px-3 py-2 w-full rounded text-[14px] mb-4"
                    />
                    <p className="text-[12px] text-[#76808F] mb-4">
                      We&apos;ll send a confirmation link to your new address.
                    </p>
                    <button
                      className="w-full bg-[#4A7DFF] text-white py-2 rounded"
                      onClick={handleAddEmail}
                    >
                      Update email
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="h-[1px] mt-[24px] bg-[#D5D6D8]"></div>
          <div className="flex justify-between h-auto min-h-[48px] items-center mt-[24px] ">
            <div className="flex flex-col shrink-0 justify-center gap-[12px] h-[48px]">
              <span className="text-[#212E42] text-[16px] font-medium">
                Premium Account
              </span>

              {hasPremiumAccount && (
                <span className="text-[14px] font-semibold text-[#F27059]">
                  {isPlanLoaded
                    ? planNameDisplay || (isGooglePlaySubscriber ? "Plus" : "")
                    : "Loading..."}
                </span>
              )}
            </div>
            <div>
              {hasPremiumAccount ? (
                <div className="flex gap-[8px] screen744:!gap-[16px] items-center flex-row-reverse justify-start flex-wrap">
                  {isGooglePlaySubscriber && playAlreadyCancelled ? (
                    <span className="text-[#76808F] text-[14px] font-normal w-[180px] text-center">
                      Cancels at period end
                    </span>
                  ) : (
                    <button
                      onClick={handleManageSubscription}
                      disabled={
                        loadingPortal ||
                        cancelingPlay ||
                        (isGooglePlaySubscriber && !canCancelGooglePlay)
                      }
                      className={` ${
                        user.publicMetadata.planCancelled == true
                          ? "text-gray"
                          : "text-[#EE4266]"
                      } cursor-pointer text-[#EE4266] text-[14px] font-normal min-w-[150px] px-[8px] text-center disabled:opacity-50`}
                    >
                      {isGooglePlaySubscriber
                        ? cancelingPlay
                          ? "Canceling..."
                          : "Cancel Subscription"
                        : loadingPortal
                          ? "Loading..."
                          : "Manage Subscription"}
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-green-700">Free</span>
              )}
            </div>
          </div>

          <div className="h-[1px] mt-[24px] bg-[#D5D6D8]"></div>
          <div className="flex justify-between items-center mt-[24px] flex-wrap">
            <div className="flex w-full flex-col h-auto min-h-[50px] justify-center gap-[12px]">
              <span className="text-[#212E42] text-[16px] font-medium">
                Connected Accounts
              </span>

              {user.emailAddresses && user.emailAddresses.length > 0 ? (
                user.emailAddresses
                  .filter((e) => e.verification?.status === "verified")
                  .map((email: any) => (
                    <div
                      key={email.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[14px] font-normal text-[#76808F]">
                        {email.emailAddress}
                        {email.id === user.primaryEmailAddressId &&
                          " (Primary)"}
                      </span>
                      {email.id !== user.primaryEmailAddressId && (
                        <button
                          className="cursor-pointer"
                          onClick={() => setConfirmEmailId(email.id)}
                        >
                          <SvgTrashCircle />
                        </button>
                      )}
                    </div>
                  ))
              ) : (
                <span className="text-[14px] font-normal text-[#76808F]">
                  No email found
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col h-auto  mt-[16px] rounded-[8px] bg-white p-[16px]">
          <div className="flex justify-between  items-center flex-wrap">
            <div className="flex flex-col justify-center gap-[12px]">
              <span className="text-[#212E42] text-[16px] font-medium">
                Password{" "}
              </span>
            </div>
            <div>
              <span
                onClick={() => setShowSetPasswordModal(true)}
                className="flex items-center justify-center border-[#76808F] text-[#76808F] rounded-[24px] border-[1px] font-normal text-[14px] w-[113px] h-[40px] cursor-pointer"
              >
                Set Password
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col h-auto  mt-[16px] rounded-[8px] bg-white p-[24px]">
          <div className="flex justify-between items-center flex-wrap">
            <div className="flex flex-col justify-center gap-[12px]">
              <span className="text-[#212E42] text-[16px] font-medium">
                Active Sessions
              </span>
            </div>
          </div>
          {sessions?.map((session, index) => (
            <div key={session.id}>
              <div className="flex gap-y-[24px] items-center flex-wrap mt-[24px] text-[12px] screen744:!text-[14px] justify-between text-[#212E42] font-medium">
                <div className="flex  gap-[16px] justify-center items-center">
                  {session.latestActivity.isMobile ? (
                    <SvgPhone />
                  ) : (
                    <SvgDesktop />
                  )}
                  <span>
                    {`${
                      session.latestActivity.isMobile ? "Phone " : "Desktop "
                    }${session.latestActivity.deviceType}, ${
                      session.latestActivity.browserName
                    }, ${session.latestActivity?.city}, ${
                      session.latestActivity?.country
                    }`}
                  </span>
                </div>
                <span>
                  {new Date(
                    session.latestActivity?.updatedAt || session.updatedAt,
                  ).toLocaleString()}
                </span>
                <span>IP {session.latestActivity?.ipAddress || "Unknown"}</span>
                <button
                  className="cursor-pointer"
                  onClick={() =>
                    mutate(session.id, {
                      onSuccess: () => {
                        setToastType("success");
                        setToastMessage("Session deleted successfully");
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 3000);
                      },
                      onError: () => {
                        setToastType("error");
                        setToastMessage("Failed to delete session");
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 3000);
                      },
                    })
                  }
                >
                  <SvgTrash />
                </button>
              </div>
              {index < sessions.length - 1 && (
                <div className="h-[1px] mt-[24px] bg-[#D5D6D8]"></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col h-auto  mt-[16px] rounded-[8px] bg-white p-[16px]">
          <div className="flex justify-between  items-center flex-wrap">
            <div className="flex flex-col justify-center gap-[12px]">
              <span className="text-[#212E42] text-[16px] font-medium">
                Delete Account
              </span>
            </div>
            <button onClick={() => setShowDeleteConfirm(true)}>
              <span className="flex cursor-pointer items-center justify-center border-[#EE4266] text-[#EE4266] rounded-[24px] border-[1px] font-normal text-[14px] w-[149px] h-[40px]">
                Delete Account
              </span>
            </button>
          </div>
        </div>
      </div>
      {confirmEmailId && (
        <div className="fixed inset-0  bg-[#17161680] flex justify-center items-center z-50">
          <div className="bg-white flex  items-center flex-col rounded-[24px] w-full max-w-[429px] h-[214px] pt-[24px] pb-[16px] px-[24px] text-center ">
            <SvgTrash />
            <div className="text-[#EF7300] text-center text-[18px] font-medium pt-[16px]">
              Delete Connected Account
            </div>
            <div className="text-[#979EA8] text-[14px] font-normal text-left  pt-[16px]">
              Do you want delete your connected account?{" "}
            </div>

            <div className="h-[2px] bg-[#E6E6E6] pt-[16px]"></div>

            <div className="flex w-full gap-[8px] justify-around mt-[16px]">
              <button
                onClick={() => setConfirmEmailId(null)}
                className="w-full cursor-pointer max-w-[186px] text-[#76808F] h-[40px] rounded-[24px] border border-[#76808F] "
              >
                No
              </button>
              <button
                onClick={() => handleConfirmDeleteEmail(confirmEmailId)}
                className="w-full cursor-pointer max-w-[186px]  rounded-[24px] h-[40px] bg-[#4A7DFF] text-white"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-[#17161680] flex justify-center items-center  z-[9999]">
          <div className="bg-white flex items-center flex-col rounded-[24px] w-full max-w-[429px] h-[214px] pt-[24px] pb-[16px] px-[24px] text-center mx-[16px]">
            <SvgCloseCircle />
            <div className="text-[#EF7300] text-[18px] font-medium pt-[16px]">
              Delete Account
            </div>
            <div className="text-[#979EA8] text-[14px] font-normal pt-[16px]">
              Are you sure you want to delete your account?
            </div>
            <div className="h-[2px] bg-[#E6E6E6] pt-[16px]"></div>
            <div className="flex w-full gap-[8px] justify-around mt-[16px]">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full cursor-pointer max-w-[186px] text-[#76808F] h-[40px] rounded-[24px] border border-[#76808F]"
              >
                No
              </button>
              <button
                onClick={() =>
                  handleDeleteUserAccount(undefined, {
                    onSuccess: () => {
                      setToastType("success");
                      setToastMessage("User deleted successfully");
                      setShowToast(true);
                      setTimeout(() => {
                        setShowToast(false);
                        signOutWebSession();
                        localStorage.removeItem("hasClosedExtraDiscountModal");
                        localStorage.removeItem("pendingReferralCode");
                        document.cookie =
                          "pendingReferralCode=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
                      }, 3000);
                    },
                    onError: () => {
                      setToastType("error");
                      setToastMessage("Failed to delete user account");
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 3000);
                    },
                  })
                }
                className="w-full cursor-pointer max-w-[186px] rounded-[24px] h-[40px] bg-[#4A7DFF] text-white"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      {showCancelPlayConfirm && (
        <div className="fixed inset-0 bg-[#17161680] flex justify-center items-center z-[9999]">
          <div className="bg-white flex items-center flex-col rounded-[24px] w-full max-w-[429px] pt-[24px] pb-[16px] px-[24px] text-center mx-[16px]">
            <SvgCloseCircle />
            <div className="text-[#EF7300] text-[18px] font-medium pt-[16px]">
              Cancel Subscription
            </div>
            <div className="text-[#979EA8] text-[14px] font-normal pt-[16px]">
              Your Google Play subscription will stop auto-renewing. You&apos;ll
              keep Plus until the current period ends.
            </div>
            <div className="h-[2px] bg-[#E6E6E6] pt-[16px]"></div>
            <div className="flex w-full gap-[8px] justify-around mt-[16px]">
              <button
                onClick={() => setShowCancelPlayConfirm(false)}
                disabled={cancelingPlay}
                className="w-full cursor-pointer max-w-[186px] text-[#76808F] h-[40px] rounded-[24px] border border-[#76808F] disabled:opacity-50"
              >
                Keep Plus
              </button>
              <button
                onClick={() => void handleCancelGooglePlay()}
                disabled={cancelingPlay}
                className="w-full cursor-pointer max-w-[186px] rounded-[24px] h-[40px] bg-[#EE4266] text-white disabled:opacity-50"
              >
                {cancelingPlay ? "Canceling..." : "Cancel Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Set Password Modal */}
      {showSetPasswordModal && (
        <SetPasswordModal
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          passwordCriteria={passwordCriteria}
          setShowSetPasswordModal={setShowSetPasswordModal}
          setToastType={setToastType}
          setToastMessage={setToastMessage}
          setShowToast={setShowToast}
        />
      )}
    </>
  );
}

function SetPasswordModal({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  passwordCriteria,
  setShowSetPasswordModal,
  setToastType,
  setToastMessage,
  setShowToast,
}: any) {
  const [showPassword, setShowPassword] = useState<"password" | "text">(
    "password",
  );
  const [showConfirmPassword, setShowConfirmPassword] = useState<
    "password" | "text"
  >("password");
  // For floating label
  const passwordActive = showPassword === "text" || password.length > 0;
  const confirmPasswordActive =
    showConfirmPassword === "text" || confirmPassword.length > 0;

  return (
    <div className="fixed inset-0 bg-[#17161680] flex justify-center items-center  z-[9999]">
      <div className="bg-white rounded-[16px] w-full max-w-[429px] h-[468px] text-center relative flex flex-col">
        <div className="flex items-center p-[16px] h-[56px] rounded-se-[16px] rounded-tl-[16px] bg-[#F3F3F3] border-b-[2px] border-[#D5D6D8] justify-between text-[#212E42] text-[18px] font-semibold mb-4">
          <span>Set Your Password</span>
          <span
            onClick={() => {
              setShowSetPasswordModal(false);
              setPassword("");
              setConfirmPassword("");
            }}
            className="text-[14px] font-normal text-[#316BFF] cursor-pointer"
          >
            Cancel
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-start px-[16px] py-[24px]">
          {/* Password input */}
          <div className="relative mb-4">
            <label
              className={`absolute left-3 top-[-10px] text-[12px] bg-white px-1 transition-all duration-200
                ${
                  password.length > 0 ||
                  document.activeElement?.id === "set-password-input"
                    ? ""
                    : "opacity-0"
                }
                text-[#76808F]`}
            >
              Password
            </label>
            <input
              id="set-password-input"
              type={showPassword}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-[16px] font-normal text-[#101A29] pl-[16px]  border border-[#E6E6E6] rounded-[12px] h-[56px]"
              autoComplete="new-password"
            />
            <span
              className="absolute right-3 top-[50%] translate-y-[-50%] cursor-pointer text-white"
              tabIndex={0}
              onClick={() =>
                setShowPassword((prev) =>
                  prev === "password" ? "text" : "password",
                )
              }
            >
              {showPassword === "text" ? <SvgOpenEye /> : <SvgCloseEye />}
            </span>
          </div>
          {/* Confirm Password input */}
          <div className="relative mb-4">
            <label
              className={`absolute left-3 top-[-10px] text-[12px] bg-white px-1 transition-all duration-200
                ${
                  confirmPassword.length > 0 ||
                  document.activeElement?.id === "set-confirm-password-input"
                    ? ""
                    : "opacity-0"
                }
                text-[#76808F]`}
            >
              Confirm Password
            </label>
            <input
              id="set-confirm-password-input"
              type={showConfirmPassword}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full text-[16px] font-normal text-[#101A29] pl-[16px]  border border-[#E6E6E6] rounded-[12px] h-[56px]"
              autoComplete="new-password"
            />
            <span
              className="absolute right-3 top-[50%] translate-y-[-50%] cursor-pointer text-white"
              tabIndex={0}
              onClick={() =>
                setShowConfirmPassword((prev) =>
                  prev === "password" ? "text" : "password",
                )
              }
            >
              {showConfirmPassword === "text" ? (
                <SvgOpenEye />
              ) : (
                <SvgCloseEye />
              )}
            </span>
          </div>
          <ul className="text-left text-[13px] mb-4">
            <li
              className={
                passwordCriteria.length ? "text-green-600" : "text-red-500"
              }
            >
              • Include at least 8 characters
            </li>
            <li
              className={
                passwordCriteria.uppercase ? "text-green-600" : "text-red-500"
              }
            >
              • Contain at least one uppercase letter
            </li>
            <li
              className={
                passwordCriteria.lowercase ? "text-green-600" : "text-red-500"
              }
            >
              • Contain at least one lowercase letter
            </li>
            <li
              className={
                passwordCriteria.special ? "text-green-600" : "text-red-500"
              }
            >
              • Contain at least one special character, such as !@#$%
            </li>
            <li
              className={
                passwordCriteria.number ? "text-green-600" : "text-red-500"
              }
            >
              • Contain at least one number
            </li>
          </ul>
          <button
            className=" h-[40px] bg-[#4A7DFF] text-[14px] font-normal text-white w-full rounded-[24px]"
            onClick={async () => {
              if (password !== confirmPassword) {
                setToastType("error");
                setToastMessage("Passwords do not match");
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
                return;
              }
              if (
                !passwordCriteria.length ||
                !passwordCriteria.uppercase ||
                !passwordCriteria.lowercase ||
                !passwordCriteria.special ||
                !passwordCriteria.number
              ) {
                setToastType("error");
                setToastMessage("Password does not meet all requirements");
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
                return;
              }
              try {
                const supabase = createBrowserSupabaseClient();
                if (!supabase) throw new Error("Sign-in is not configured.");
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                setToastType("success");
                setToastMessage("Password updated successfully");
                setShowSetPasswordModal(false);
              } catch (error) {
                setToastType("error");
                setToastMessage(
                  error instanceof Error
                    ? error.message
                    : "Failed to update password",
                );
              } finally {
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
              }
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
