import { deleteUserAccount } from "@/lib/client/user/deleteUserAccount";
import { useMutation } from "@tanstack/react-query";

export const useDeleteUserAccount = () => {
  return useMutation({
    mutationFn: deleteUserAccount,
  });
};
