export const cancelUserPlan = async () => {
  try {
    const res = await fetch("/api/users/cancel-subscription", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to cancel subscription");

    return await res.json();
  } catch (err) {
    console.error("Error canceling user plan:", err);
    throw err;
  }
};
