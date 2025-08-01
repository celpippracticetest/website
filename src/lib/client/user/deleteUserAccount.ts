export const deleteUserAccount = async () => {
  try {
    const res = await fetch("/api/users/delete-user-account", {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to delete user account");
    }

    return await res.json();
  } catch (err) {}
};
