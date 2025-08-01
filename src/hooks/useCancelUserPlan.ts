import { cancelUserPlan } from "@/lib/client/user/cancelUserPlan";
import { useMutation } from "@tanstack/react-query";

export const useCancelUserPlan = () => {
  return useMutation({
    mutationFn: cancelUserPlan,
  });
};
