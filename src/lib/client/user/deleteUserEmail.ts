export const deleteUserEmail = async (emailId: string) => {
  await fetch(`/api/users/delete-user-email/${emailId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ emailId }),
  });
};
