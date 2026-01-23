export const getPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: "granted" })
);

export const requestPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: "granted" })
);

export const scheduleNotificationAsync = jest.fn(() =>
  Promise.resolve("notification-id")
);

export const cancelScheduledNotificationAsync = jest.fn(() =>
  Promise.resolve()
);

export const cancelAllScheduledNotificationsAsync = jest.fn(() =>
  Promise.resolve()
);

export const getAllScheduledNotificationsAsync = jest.fn(() =>
  Promise.resolve([])
);

export const setNotificationHandler = jest.fn();

export const addNotificationReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));

export const addNotificationResponseReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));

export default {
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  getAllScheduledNotificationsAsync,
  setNotificationHandler,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
};
