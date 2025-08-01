export const getUserSessions = async () => {
  const res = await fetch("/api/sessions");

  if (!res.ok) {
    throw new Error("Failed to fetch user sessions");
  }

  return res.json();
};
