import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Agent worktrees under .claude/ are separate checkouts with their own tests.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
