/**
 * Mock Authentication Helper for E2E Tests
 * 
 * This module provides utilities to mock authentication for e2e tests
 * when the actual Replit OAuth flow is not available or practical.
 */

import { Page } from '@playwright/test';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  hasCompletedOnboarding?: boolean;
}

export async function setupMockAuth(
  page: Page, 
  user: MockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    hasCompletedOnboarding: true
  }
) {
  await page.route('**/api/auth/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    });
  });
}

export async function setupFullMockAuth(page: Page, newUser: boolean = false) {
  const user: MockUser = newUser ? {
    id: 'test-user-new',
    email: 'newuser@example.com',
    name: 'New Test User',
    hasCompletedOnboarding: false,
  } : {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    hasCompletedOnboarding: true
  };
  
  await setupMockAuth(page, user);
}
