export const createUserDiscount = async (userId: string) => {
  const res = await fetch("/api/users/create-user-discount", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    throw new Error("Failed to create discount coupon");
  }

  return res.json();
};
