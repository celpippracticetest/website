export const createUserDiscount = async (userId: string) => {
  const res = await fetch("/api/users/create-user-discount", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    // If user already has a discount, return null instead of throwing
    // This allows the hook to handle it gracefully
    if (errorData.error?.includes("already has a discount")) {
      return null;
    }
    throw new Error(errorData.error || "Failed to create discount coupon");
  }

  return res.json();
};
