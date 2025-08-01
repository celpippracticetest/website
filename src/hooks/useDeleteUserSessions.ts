import { deleteUserSessions } from "@/lib/client/user/deleteUserSessions";
import { useMutation } from "@tanstack/react-query";

export const useDeleteUserSessions = () => {
  return useMutation({
    mutationFn: deleteUserSessions,
  });
};
