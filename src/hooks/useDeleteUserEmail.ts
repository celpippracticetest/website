import { deleteUserEmail } from "@/lib/client/user/deleteUserEmail";
import { useMutation } from "@tanstack/react-query";

export const useDeleteUserEmail = () => {
  return useMutation({
    mutationFn: deleteUserEmail,
  });
};
