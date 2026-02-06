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
    throw new Error(errorData.error || "Failed to create discount coupon");
  }

  return res.json();
};
