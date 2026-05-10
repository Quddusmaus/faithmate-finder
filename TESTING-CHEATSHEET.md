# FaithMate E2E Testing Cheat Sheet

## How the testing works (plain English)

Every time code is pushed to GitHub - whether by you, Lovable, or Claude Code -
GitHub automatically runs 81 tests that act like a robot user clicking through the app.
You don't have to do anything. The tests run on their own.

---

## After Lovable makes a change - what to do

1. Lovable pushes the change to GitHub automatically
2. Go to GitHub Actions: https://github.com/Quddusmaus/faithmate-finder/actions
3. Look at the top run (most recent):
   - Yellow spinner = still running (wait ~15 min)
      - Green checkmark = all tests passed, you're good!
         - Red X = something broke, follow steps below

         ---

         ## If tests fail - what to do in Lovable

         1. Go to: https://github.com/Quddusmaus/faithmate-finder/actions
         2. Click the red X run at the top
         3. Click "Playwright E2E" (the failed job)
         4. Scroll down to find the red step (the one that failed)
         5. Copy the error message
         6. Go to Lovable and paste this prompt:

         "After your last change, this E2E test is failing in GitHub Actions:
         [paste the error here]
         Please fix it without breaking any other tests."

         7. Lovable will push a fix - go back to GitHub Actions and verify it goes green

         ---

         ## Current test suite status (as of May 2026)

         - Auth (signup, login, logout): ~16 tests - PASSING
         - Profiles: ~12 tests - PASSING
         - Browse and Discovery: ~10 tests - PASSING
         - Messaging: ~8 tests - PASSING
         - Subscriptions: ~15 tests - PASSING
         - Admin panel: 5 tests - PASSING
         - Email confirmation link: 1 test - SKIPPED (intentional, needs email infrastructure)
         - TOTAL: 81 passing, 1 skipped

         ---

         ## Key links

         - GitHub Actions (test results): https://github.com/Quddusmaus/faithmate-finder/actions
         - Supabase Dashboard: https://supabase.com/dashboard/project/qclefndzismozdogsfot
         - Auth Users: https://supabase.com/dashboard/project/qclefndzismozdogsfot/auth/users
         - GitHub Secrets: https://github.com/Quddusmaus/faithmate-finder/settings/secrets/actions

         ---

         ## Important rules - never break these

         - Never delete the e2e/ folder or .github/workflows/e2e.yml - that runs the tests
         - Never remove these GitHub secrets: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY
         - The 1 skipped test (email confirmation link) is intentional - ignore it
         - Tests take ~15 minutes to run on GitHub Actions - be patient before panicking
         - If tests go red after a Lovable change, fix that before pushing more changes
