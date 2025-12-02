import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import type { NotificationHistory } from "@shared/schema";

export function useNotificationHistory(includeDismissed: boolean = false) {
  return useQuery<NotificationHistory[]>({
    queryKey: [API_ENDPOINTS.notifications.history, includeDismissed],
  });
}

export function useDismissNotification() {
  return useMutation({
    mutationFn: async ({
      notificationId,
      dismissedBy,
    }: {
      notificationId: string;
      dismissedBy?: string;
    }) => {
      return apiRequest(
        API_ENDPOINTS.notifications.dismiss(notificationId),
        "POST",
        { dismissedBy },
      );
    },
    onSuccess: () => {
      // Invalidate both dismissed and undismissed queries
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.notifications.history, true],
      });
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.notifications.history, false],
      });
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.notifications.unreadCount],
      });
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: [API_ENDPOINTS.notifications.unreadCount],
  });
}
