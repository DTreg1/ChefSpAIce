import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { NotificationHistory } from "@shared/schema";

export function useNotificationHistory(includeDismissed: boolean = false) {
  return useQuery<NotificationHistory[]>({
    queryKey: ['/api/notifications/history', includeDismissed],
  });
}

export function useDismissNotification() {
  return useMutation({
    mutationFn: async ({ notificationId, dismissedBy }: { notificationId: string; dismissedBy?: string }) => {
      return apiRequest('POST', `/api/notifications/${notificationId}/dismiss`, { dismissedBy });
    },
    onSuccess: () => {
      // Invalidate both dismissed and undismissed queries
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/history', true] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/history', false] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
  });
}
