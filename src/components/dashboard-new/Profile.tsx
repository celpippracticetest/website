"use client";
import React from "react";
import SvgCloseEye from "@/components/icons/CloseEye";
import SvgOpenEye from "@/components/icons/OpenEye";
import { useReverification, useUser } from "@clerk/nextjs";
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
import { useClerk } from "@clerk/nextjs";
import { useDeleteUserEmail } from "@/hooks/useDeleteUserEmail";
import SvgCloseCircle from "@/components/icons/CloseCircle";
import Link from "next/link";
import SubscriptionRetentionModal from "@/components/modal/SubscriptionRetentionModal";
import ChangePlanModal from "@/components/modal/ChangePlanModal";
import AccountDeletionRetentionModal from "@/components/modal/AccountDeletionRetentionModal";
import { getSubscriptionDisplayName } from "@/lib/subscriptionAccess";
export default function Profile({ prevCheckout, subscriptionData }: any) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [planNameDisplay, setPlanNameDisplay] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const userPlan = user?.publicMetadata?.plan as string | undefined;
  const userPurchaseDate = user?.publicMetadata?.purchaseDate as string | undefined;

  useEffect(() => {
    // Stripe product / charge description is the source of truth for the plan label
    if (subscriptionData?.planName) {
      setPlanNameDisplay(String(subscriptionData.planName).trim());
      setIsLoaded(true);
    } else if (subscriptionData && subscriptionData.currentPeriodStart && subscriptionData.currentPeriodEnd) {
      setPlanNameDisplay(
        getSubscriptionDisplayName(
          userPlan,
          userPurchaseDate,
          subscriptionData.planName || "Premium Plan"
        )
      );
      setIsLoaded(true);
    } else if (prevCheckout && prevCheckout.createdAt) {
      // Fallback to checkout data for one-time purchases
      const description = prevCheckout.lineItems?.[0]?.description;
      setPlanNameDisplay(
        getSubscriptionDisplayName(
          userPlan,
          userPurchaseDate,
          description || "Premium Plan"
        )
      );
      setIsLoaded(true);
    } else {
      // Fallback based on metadata if no data found but user is marked as premium
      if (userPlan) {
        setPlanNameDisplay(getSubscriptionDisplayName(userPlan, userPurchaseDate));
      }
      setIsLoaded(true);
    }
  }, [prevCheckout, subscriptionData, userPlan, userPurchaseDate]);

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
  const { signOut } = useClerk();
  const [showEditEmail, setShowEditEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [newEmailId, setNewEmailId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  useEffect(() => {
    if (isUserLoaded && user === null) {
      router.push("/practice-overview");
    }
  }, [isUserLoaded, user]);

  const getSessions = useGetUserSessions();

  const { mutate } = useDeleteUserSessions();
  const { mutate: handleDeleteUserAccount, isPending: isDeletingAccount } =
    useDeleteUserAccount();

  const { mutate: handleDeleteUserEmail } = useDeleteUserEmail();

  const [confirmEmailId, setConfirmEmailId] = useState<string | null>(null);
  const [showDeleteRetentionModal, setShowDeleteRetentionModal] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResubscribing, setIsResubscribing] = useState(false);
  const hasActiveSubscription =
    Boolean(subscriptionData) &&
    !subscriptionData?.isOneTimePayment &&
    ["active", "trialing", "past_due", "unpaid"].includes(
      subscriptionData?.status
    ) &&
    !subscriptionData?.cancelAtPeriodEnd;

  const fetchAvailablePlans = async () => {
    try {
      setLoadingPlans(true);
      const response = await fetch("/api/plans/available");
      if (response.ok) {
        const data = await response.json();
        setAvailablePlans(data.plans || []);
      } else {
        setAvailablePlans([]);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      setAvailablePlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const redirectToPortal = async () => {
    try {
      setLoadingPortal(true);
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
      setToastMessage(error instanceof Error ? error.message : "Failed to load subscription portal");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setLoadingPortal(false);
    }
    // Note: We don't set loadingPortal(false) on success because we are redirecting
  };

  const handleManageSubscription = () => {
    setLoadingPlans(true);
    setShowChangePlanModal(true);
    void fetchAvailablePlans();
  };

  const handleCancelSubscription = () => {
    setShowRetentionModal(true);
  };

  const confirmCancellation = async (flowId?: string | null) => {
    try {
      setIsCancelling(true);
      const response = await fetch("/api/users/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowId: flowId ?? null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel subscription");
      }

      setToastType("success");
      setToastMessage("Subscription cancelled successfully");
      setShowToast(true);
      setShowRetentionModal(false);
      await user?.reload();
      router.refresh();

    } catch (error: any) {
      setToastType("error");
      setToastMessage(error.message || "Failed to cancel subscription");
      setShowToast(true);
    } finally {
      setIsCancelling(false);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleChangePlan = async (priceId: string) => {
    try {
      setLoadingPlans(true);
      const response = await fetch("/api/users/update-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPriceId: priceId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update subscription");
      }

      setToastType("success");
      setToastMessage("Plan updated successfully");
      setShowToast(true);
      setShowChangePlanModal(false);
      await user?.reload();
      // Reload page or re-fetch subscription data to update UI
      router.refresh();

    } catch (error: any) {
      setToastType("error");
      setToastMessage(error.message || "Failed to update subscription");
      setShowToast(true);
    } finally {
      setLoadingPlans(false);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleResubscribe = async () => {
    try {
      setIsResubscribing(true);
      const response = await fetch("/api/users/reactivate-subscription", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to resubscribe");
      }

      setToastType("success");
      setToastMessage("Subscription reactivated successfully!");
      setShowToast(true);
      await user?.reload();
      router.refresh();

    } catch (error: any) {
      setToastType("error");
      setToastMessage(error.message || "Failed to resubscribe");
      setShowToast(true);
    } finally {
      setIsResubscribing(false);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleDeleteAccountClick = () => {
    if (hasActiveSubscription) {
      setToastType("error");
      setToastMessage(
        "Please cancel your active subscription before deleting your account."
      );
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    setShowDeleteRetentionModal(true);
  };

  const handleSignOut = () => {
    localStorage.removeItem("hasClosedExtraDiscountModal");
    signOut();
  };

  const confirmDeleteAccount = (flowId?: string | null) => {
    handleDeleteUserAccount(
      { flowId: flowId ?? null },
      {
        onSuccess: () => {
          setToastType("success");
          setToastMessage("User deleted successfully");
          setShowToast(true);
          setShowDeleteRetentionModal(false);
          setTimeout(() => {
            setShowToast(false);
            signOut();
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
      }
    );
  };

  const handleConfirmDeleteEmail = (emailId: string) => {
    if (!user) return;
    handleDeleteUserEmail(emailId, {
      onSuccess: () => {
        user?.reload().then(() => {
          setToastType("success");
          setToastMessage("Email removed successfully");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        });
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

  const addEmailFetcher = async () => {
    if (!user) throw new Error("User not found");
    if (!newEmail) throw new Error("Email not provided");
    const createdEmail = await user.createEmailAddress({ email: newEmail });
    await createdEmail.prepareVerification({ strategy: "email_code" });
    await user?.reload();
    return createdEmail;
  };

  const addEmailWithReverification = useReverification(addEmailFetcher);

  const updatePrimaryWithReverification = useReverification(async () => {
    if (!user) throw new Error("User not found");
    const existingEmail = user.emailAddresses.find(
      (e) => e.emailAddress === newEmail
    );
    if (!existingEmail) throw new Error("Existing email not found");
    return await user.update({ primaryEmailAddressId: existingEmail.id });
  });

  const handleAddEmail = async () => {
    try {
      const existingEmail = user?.emailAddresses.find(
        (e) => e.emailAddress === newEmail
      );
      if (existingEmail) {
        if (existingEmail.verification?.status === "verified") {
          await updatePrimaryWithReverification();
          setToastType("success");
          setToastMessage(
            "Email already verified; set as primary successfully."
          );
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          return;
        } else {
          await existingEmail.prepareVerification({ strategy: "email_code" });
          setToastType("success");
          setToastMessage("Verification code resent to existing email");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          setNewEmailId(existingEmail.id);
          setStep("verify");
          return;
        }
      }

      const created = await addEmailWithReverification();
      setNewEmailId(created.id);
      setToastType("success");
      setToastMessage("Verification code sent to new email");
      setShowToast(true);
      setStep("verify");
    } catch (error: any) {
      setToastType("error");
      setToastMessage("Failed to send verification code");
      setShowToast(true);
    } finally {
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleVerifyCode = async () => {
    try {
      if (!user) return;

      const email = user.emailAddresses.find((e) => e.id === newEmailId);
      if (!email) throw new Error("Email not found");

      await email.attemptVerification({ code: verificationCode });
      await user?.reload();
      const verified = user.emailAddresses.find((e) => e.id === email.id);
      if (!verified || verified.verification?.status !== "verified") {
        throw new Error("Email not verified yet");
      }
      await updatePrimaryWithReverification();
      setToastType("success");
      setToastMessage("Email verified and set as primary");
      setShowEditEmail(false);
      setNewEmail("");
      setVerificationCode("");
      setStep("input");
      router.refresh();
    } catch (error) {
      setToastType("error");
      console.error(error);

      let errorMessage = "Verification failed";

      const errorData = error as any;
      if (errorData?.errors?.[0]?.code === "form_code_incorrect") {
        errorMessage = "The code you entered is incorrect. Please try again.";
      } else if (errorData?.errors?.[0]?.code === "verification_failed") {
        errorMessage =
          "Too many failed attempts. Please re-enter your email to get a new code.";
        setStep("input");
      } else if (errorData?.errors?.[0]?.long_message) {
        errorMessage = errorData.errors[0].long_message;
      }

      setToastMessage(errorMessage);
    } finally {
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

    try {
      await user?.setProfileImage({ file });
      await user?.reload();

      setToastType("success");
      setToastMessage("Avatar updated successfully");
    } catch (error) {
      setToastType("error");
      setToastMessage("Failed to update avatar");
    } finally {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  if (!user) return null;

  return (
    <>
      {showToast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg transition-opacity duration-300 ${toastType === "success" ? "bg-green-500" : "bg-red-500"
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
                <div
                  className="fixed inset-0 bg-[#17161680] flex justify-center items-center z-[9999]"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowEditEmail(false);
                      setStep("input");
                      setNewEmail("");
                      setVerificationCode("");
                    }
                  }}
                >
                  <div className="bg-white rounded-[24px] w-full max-w-[400px] px-[24px] py-[24px] text-center relative">
                    <button
                      className="absolute top-4 right-4 text-gray-500"
                      onClick={() => {
                        setShowEditEmail(false);
                        setStep("input");
                        setNewEmail("");
                        setVerificationCode("");
                      }}
                    >
                      ✕
                    </button>
                    <h2 className="text-[#212E42] text-[18px] font-semibold mb-4">
                      {step === "input" ? "Enter New Email" : "Verify Email"}
                    </h2>
                    {step === "input" ? (
                      <>
                        <input
                          type="email"
                          placeholder="Enter new email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="border px-3 py-2 w-full rounded text-[14px] mb-4"
                        />
                        <button
                          className="w-full bg-[#4A7DFF] text-white py-2 rounded"
                          onClick={handleAddEmail}
                        >
                          Send Code
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Enter verification code"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="border px-3 py-2 w-full rounded text-[14px] mb-4"
                        />
                        <button
                          className="w-full bg-[#4A7DFF] text-white py-2 rounded"
                          onClick={handleVerifyCode}
                        >
                          Verify & Save
                        </button>
                      </>
                    )}
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

              {(user?.publicMetadata.plan == "premium" || user?.publicMetadata.plan == "pro" || subscriptionData) && (
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-[#F27059]">
                    {isLoaded ? planNameDisplay : "Loading..."}
                  </span>
                  {!user?.publicMetadata?.planCancelled && subscriptionData?.currentPeriodEnd && (
                    <span className="text-[12px] text-[#76808F] font-normal">
                      Next payment: {new Date(subscriptionData.currentPeriodEnd * 1000).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div>
              {(user?.publicMetadata.plan == "premium" || user?.publicMetadata.plan == "pro" || subscriptionData) ? (
                <div className="flex gap-[8px] screen744:!gap-[16px] items-center flex-row-reverse justify-start flex-wrap">
                  {user.publicMetadata.planCancelled ? (
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={handleResubscribe}
                        disabled={isResubscribing}
                        className="flex items-center justify-center bg-[#4A7DFF] text-white rounded-[24px] font-normal text-[14px] w-[140px] h-[40px] cursor-pointer disabled:opacity-70"
                      >
                        {isResubscribing ? "Processing..." : "Resubscribe"}
                      </button>
                      {subscriptionData?.currentPeriodEnd && (
                        <span className="text-[12px] text-[#EF4444] font-medium">
                          Ends on {new Date(subscriptionData.currentPeriodEnd * 1000).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={handleManageSubscription}
                      disabled={loadingPortal}
                      className={`flex items-center justify-center border-[#76808F] text-[#76808F] rounded-[24px] border-[1px] font-normal text-[14px] w-[113px] h-[40px] cursor-pointer`}
                    >
                      Change Plan
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-green-700">Free</span>
              )}
            </div>
          </div>
          {(user?.publicMetadata.plan == "premium" || user?.publicMetadata.plan == "pro" || subscriptionData) &&
            !user.publicMetadata.planCancelled && (
              <div className="flex justify-end mt-2">
                {/* Cancel button moved to Change Plan Modal */}
              </div>
            )}

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
                  {session?.latestActivity?.isMobile ? (
                    <SvgPhone />
                  ) : (
                    <SvgDesktop />
                  )}
                  <span>
                    {`${session?.latestActivity?.isMobile ? "Phone " : "Desktop "
                      }${session?.latestActivity?.deviceType}, ${session?.latestActivity?.browserName
                      }, ${session?.latestActivity?.city}, ${session?.latestActivity?.country
                      }`}
                  </span>
                </div>
                <span>
                  {new Date(
                    session?.latestActivity?.updatedAt || session.updatedAt
                  ).toLocaleString()}
                </span>
                <span>IP {session?.latestActivity?.ipAddress || "Unknown"}</span>
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
            <div className="flex items-center gap-[8px]">
              <button onClick={handleSignOut}>
                <span className="flex cursor-pointer items-center justify-center border-[#76808F] text-[#76808F] rounded-[24px] border-[1px] font-normal text-[14px] w-[120px] h-[40px]">
                  Sign Out
                </span>
              </button>
              <button onClick={handleDeleteAccountClick}>
                <span className="flex cursor-pointer items-center justify-center border-[#EE4266] text-[#EE4266] rounded-[24px] border-[1px] font-normal text-[14px] w-[120px] h-[40px]">
                  Delete Account
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col h-auto mt-[16px] rounded-[8px] bg-white p-[16px]">

          <div className="mt-[12px] flex flex-wrap items-center gap-[8px] screen744:gap-[12px]!">
            <Link
              href="/privacy-policy"
              className="inline-flex h-[28px] items-center text-[14px] font-medium text-[#316BFF] underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-of-service"
              className="inline-flex h-[28px] items-center text-[14px] font-medium text-[#316BFF] underline-offset-2 hover:underline"
            >
              Terms of Service
            </Link>
            <Link
              href="/refund-policy"
              className="inline-flex h-[28px] items-center text-[14px] font-medium text-[#316BFF] underline-offset-2 hover:underline"
            >
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
      {confirmEmailId && (
        <div
          className="fixed inset-0  bg-[#17161680] flex justify-center items-center z-50"
          onClick={(e) => e.target === e.currentTarget && setConfirmEmailId(null)}
        >
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
      <AccountDeletionRetentionModal
        isOpen={showDeleteRetentionModal}
        onClose={() => setShowDeleteRetentionModal(false)}
        onConfirmDelete={confirmDeleteAccount}
        loading={isDeletingAccount}
      />
      {/* Cancel Subscription Modal */}
      <SubscriptionRetentionModal
        isOpen={showRetentionModal}
        onClose={() => setShowRetentionModal(false)}
        onConfirmCancellation={async (flowId) => {
          await confirmCancellation(flowId);
          setShowRetentionModal(false);
        }}
        loading={isCancelling}
      />
      {/* Change Plan Modal */}
      <ChangePlanModal
        isOpen={showChangePlanModal}
        onClose={() => {
          setShowChangePlanModal(false);
          setLoadingPlans(false);
        }}
        availablePlans={availablePlans}
        currentPlanName={planNameDisplay}
        currentPriceId={subscriptionData?.planId}
        onChangePlan={handleChangePlan}
        loading={loadingPlans}
        onCancelSubscription={handleCancelSubscription}
      />
      {/* Set Password Modal */}
      {showSetPasswordModal && (
        <SetPasswordModal
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          passwordCriteria={passwordCriteria}
          user={user}
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
  user,
  setShowSetPasswordModal,
  setToastType,
  setToastMessage,
  setShowToast,
}: any) {
  const [showPassword, setShowPassword] = useState<"password" | "text">(
    "password"
  );
  const [showConfirmPassword, setShowConfirmPassword] = useState<
    "password" | "text"
  >("password");
  // For floating label
  const passwordActive = showPassword === "text" || password.length > 0;
  const confirmPasswordActive =
    showConfirmPassword === "text" || confirmPassword.length > 0;

  const updatePasswordWithReverification = useReverification(async () => {
    if (!user) throw new Error("User not found");
    await user.updatePassword({ newPassword: password });
  });

  return (
    <div
      className="fixed inset-0 bg-[#17161680] flex justify-center items-center  z-[9999]"
      onClick={(e) => e.target === e.currentTarget && setShowSetPasswordModal(false)}
    >
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
                ${password.length > 0 ||
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
                  prev === "password" ? "text" : "password"
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
                ${confirmPassword.length > 0 ||
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
                  prev === "password" ? "text" : "password"
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
              if (!user?.passwordEnabled) {
                setToastType("error");
                setToastMessage("This account type cannot set a password.");
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
                await updatePasswordWithReverification();
                setToastType("success");
                setToastMessage("Password updated successfully");
                setShowSetPasswordModal(false);
              } catch (error) {
                setToastType("error");
                setToastMessage("Failed to update password");
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
