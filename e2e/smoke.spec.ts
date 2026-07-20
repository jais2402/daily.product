import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Reads a single KEY=value out of .env.local without pulling in a dotenv
 * dependency (plan Task 2: "read from .env.local ... via a tiny fs parse").
 * Never logged/printed — callers must not echo the return value.
 */
function readEnvLocal(key: string): string | undefined {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return undefined;
  const contents = fs.readFileSync(envPath, 'utf8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    if (k !== key) continue;
    let v = trimmed.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v;
  }
  return undefined;
}

const ADMIN_SECRET = readEnvLocal('ADMIN_SECRET');

const DEV_EMAIL = 'dev@dailyproduct.local';
const DEV_PASSWORD = 'DevPass!2402';

test.describe('public feed', () => {
  test('renders articles, filters by topic, opens an article', async ({ page }) => {
    await page.goto('/');

    // At least one article link renders on the home feed.
    const articleLinks = page.locator('a[href^="/article/"]');
    await expect(articleLinks.first()).toBeVisible();
    expect(await articleLinks.count()).toBeGreaterThan(0);

    // Clicking the "AI" topic chip filters to ?topic=ai with >=1 card.
    await page.getByRole('link', { name: 'AI', exact: true }).first().click();
    await expect(page).toHaveURL(/[?&]topic=ai\b/);
    await expect(page.locator('a[href^="/article/"]').first()).toBeVisible();

    // Opening the first article shows the "Read full article" CTA.
    const firstArticleHref = await page
      .locator('a[href^="/article/"]')
      .first()
      .getAttribute('href');
    expect(firstArticleHref).toBeTruthy();
    await page.goto(firstArticleHref!);
    await expect(page.getByText('Read full article', { exact: false })).toBeVisible();
  });
});

test.describe('search', () => {
  test('typing a query into the topbar search box and pressing Enter shows results or a no-match message', async ({
    page,
  }) => {
    await page.goto('/');

    // "the" is data-independent — it'll substring-match many article
    // titles/summaries regardless of what's currently seeded, so this
    // doesn't assume specific fixture content either way.
    const searchInput = page.getByPlaceholder('Search articles…');
    await searchInput.fill('the');
    await searchInput.press('Enter');

    await expect(page).toHaveURL(/[?&]q=the\b/);
    await expect(page.getByText(/Results for|No articles match/).first()).toBeVisible();
  });
});

test.describe('auth loop', () => {
  test('dev sign in, onboarding (if needed), bookmarks, sign out', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Email').fill(DEV_EMAIL);
    await page.getByPlaceholder('Password').fill(DEV_PASSWORD);
    await page.getByRole('button', { name: 'Sign in with email' }).click();

    // Lands on either / or /onboarding depending on whether the dev user has
    // completed onboarding in a previous run.
    await page.waitForURL(/\/(onboarding)?$/, { timeout: 15_000 });

    if (page.url().includes('/onboarding')) {
      // Step 1: picking a role card advances straight to step 2 (no
      // separate "Continue" click — see onboarding-form.tsx `pickRole`).
      await page.getByRole('button', { name: /Product Manager/ }).click();

      // Step 2: topics may already be pre-selected by role defaults — leave
      // them as-is (tolerate whatever's pre-selected) and submit.
      await page.getByRole('button', { name: 'Enter Daily.Product' }).click();
      await page.waitForURL('/', { timeout: 15_000 });
    }

    // Sidebar user cell: sign-out button present (desktop viewport required
    // — sidebar is `hidden lg:flex`).
    const signOutButton = page.getByRole('button', { name: 'Sign out' });
    await expect(signOutButton).toBeVisible();

    // /bookmarks is reachable and renders its heading.
    await page.goto('/bookmarks');
    await expect(page.getByRole('heading', { name: 'Bookmarks' })).toBeVisible();

    // Sign out via the sidebar form → back to a signed-out state with a
    // "Sign in" link.
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();
  });
});

test.describe('admin gate', () => {
  test('redirects when unauthenticated, accepts the correct key, rejects a wrong one', async ({
    page,
  }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);

    // Wrong key shows an error and stays on the login page.
    await page.getByPlaceholder('Admin key').fill('definitely-not-the-secret');
    await page.getByRole('button', { name: 'Enter' }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByText('Wrong key.')).toBeVisible();

    test.skip(!ADMIN_SECRET, 'ADMIN_SECRET not set in .env.local');

    // Correct key reaches the gated queue page (heading + Sources nav).
    await page.getByPlaceholder('Admin key').fill(ADMIN_SECRET!);
    await page.getByRole('button', { name: 'Enter' }).click();
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sources' })).toBeVisible();
  });
});
