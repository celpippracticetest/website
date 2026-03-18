export const deleteUserAccount = async (payload?: { flowId?: string | null }) => {
  try {
    const res = await fetch("/api/users/delete-user-account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowId: payload?.flowId ?? null }),
    });

    if (!res.ok) {
      throw new Error("Failed to delete user account");
    }

    return await res.json();
  } catch (err) {
    throw err;
  }
};
