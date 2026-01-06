/**
 * E2E tests for extension integration with the webapp
 * Tests actual login flow and functionality
 */
import { test, expect } from '@playwright/test';

// Test user credentials
const TEST_PASSWORD = 'TestPassword123!';

test.describe('Login Page', () => {
    test('should display the login form with all elements', async ({ page }) => {
        await page.goto('/login');

        // Verify login page heading
        await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

        // Check for form inputs
        await expect(page.getByPlaceholder('Email')).toBeVisible();
        await expect(page.getByPlaceholder('Password', { exact: true })).toBeVisible();

        // Check for login button
        await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();

        // Check for OAuth buttons
        await expect(page.getByRole('button', { name: /Google/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /GitHub/i })).toBeVisible();

        // Check for sign up link
        await expect(page.getByRole('link', { name: 'Sign Up' })).toBeVisible();
    });

    test('should navigate to registration page', async ({ page }) => {
        await page.goto('/login');

        await page.getByRole('link', { name: 'Sign Up' }).click();

        await expect(page).toHaveURL('/register');
        await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    });
});

test.describe('Registration Page', () => {
    test('should display registration form with all elements', async ({ page }) => {
        await page.goto('/register');

        // Check heading
        await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();

        // Check for all inputs
        await expect(page.getByPlaceholder('Display Name (Optional)')).toBeVisible();
        await expect(page.getByPlaceholder('Email')).toBeVisible();
        await expect(page.getByPlaceholder('Password', { exact: true })).toBeVisible();
        await expect(page.getByPlaceholder('Confirm Password')).toBeVisible();

        // Check for sign up button
        await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();

        // Check for login link
        await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible();
    });

    test('should navigate back to login page', async ({ page }) => {
        await page.goto('/register');

        await page.getByRole('link', { name: 'Log In' }).click();

        await expect(page).toHaveURL('/login');
        await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    });
});

test.describe('Full Authentication Flow', () => {
    // Use unique email per test run to avoid conflicts
    const uniqueEmail = `e2e-${Date.now()}@example.com`;

    test('should register a new user successfully', async ({ page }) => {
        await page.goto('/register');

        // Fill registration form - use exact: true for Password
        await page.getByPlaceholder('Display Name (Optional)').fill('Test User');
        await page.getByPlaceholder('Email').fill(uniqueEmail);
        await page.getByPlaceholder('Password', { exact: true }).fill(TEST_PASSWORD);
        await page.getByPlaceholder('Confirm Password').fill(TEST_PASSWORD);

        // Submit registration
        await page.getByRole('button', { name: 'Sign Up' }).click();

        // Should redirect to dashboard (root)
        await expect(page).toHaveURL('/', { timeout: 10000 });

        // Should see dashboard elements
        await expect(page.locator('.dashboard').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show error for mismatched passwords', async ({ page }) => {
        await page.goto('/register');

        await page.getByPlaceholder('Email').fill('mismatch@example.com');
        await page.getByPlaceholder('Password', { exact: true }).fill(TEST_PASSWORD);
        await page.getByPlaceholder('Confirm Password').fill('DifferentPassword123!');

        await page.getByRole('button', { name: 'Sign Up' }).click();

        // Should show error toast (sonner)
        await expect(page.getByText(/do not match/i)).toBeVisible({ timeout: 5000 });
    });

    test('should login with registered user', async ({ page }) => {
        const loginEmail = `e2e-login-${Date.now()}@example.com`;

        // First register the user
        await page.goto('/register');
        await page.getByPlaceholder('Email').fill(loginEmail);
        await page.getByPlaceholder('Password', { exact: true }).fill(TEST_PASSWORD);
        await page.getByPlaceholder('Confirm Password').fill(TEST_PASSWORD);
        await page.getByRole('button', { name: 'Sign Up' }).click();

        // Wait for dashboard
        await expect(page).toHaveURL('/', { timeout: 10000 });

        // Clear local storage to simulate logout
        await page.evaluate(() => localStorage.clear());

        // Now login
        await page.goto('/login');
        await page.getByPlaceholder('Email').fill(loginEmail);
        await page.getByPlaceholder('Password', { exact: true }).fill(TEST_PASSWORD);
        await page.getByRole('button', { name: 'Log In' }).click();

        // Should redirect to dashboard
        await expect(page).toHaveURL('/', { timeout: 10000 });
    });
});

test.describe('Protected Routes', () => {
    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
        // Clear any stored tokens first
        await page.goto('/login');
        await page.evaluate(() => localStorage.clear());

        // Try to access root
        await page.goto('/');

        // Should be redirected to login
        await expect(page).toHaveURL(/login/);
    });
});
