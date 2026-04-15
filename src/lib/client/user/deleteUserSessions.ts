export const deleteUserSessions = async (sessionId: string) => {
  const res = await fetch(`/api/sessions/${sessionId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Failed to delete session");
  }

  return await res.json();
};
