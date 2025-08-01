import { getUserSessions } from "@/lib/client/user/getUserSessions";
import { useQuery } from "@tanstack/react-query";

export const useGetUserSessions = () => {
  return useQuery({
    queryKey: ["user-sessions"],
    queryFn: getUserSessions,
  });
};
