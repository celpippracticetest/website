export const deleteUserSessions = async (sessionId: string) => {
  try {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to delete session");
    }

    return await res.json();
  } catch (error) {
    console.error("Failed to delete session:", error);
  }
};
