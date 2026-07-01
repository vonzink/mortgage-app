import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// ─────────────────────────────────────────────────────────────────────────────
// CRA → Vite config.
//
// Env-var strategy: the codebase reads `process.env.REACT_APP_*` at runtime in
// ~10 files (apiClient, cognitoConfig, ContinuePage, …) and the deploy pipeline
// passes those same names as build-time env vars. Rather than codemod every call
// site to `import.meta.env`, we replicate CRA's DefinePlugin behavior: bake a
// `process.env` object literal into the bundle containing NODE_ENV + every
// REACT_APP_* value. `process.env.REACT_APP_FOO` reads then resolve to the baked
// constant in the browser — identical semantics to CRA.
//
// The define is GATED OFF under Vitest (mode === 'test'): tests run in Node where
// `process.env` is a real, mutable object, and several suites mutate
// `process.env.REACT_APP_DEV_SUB` at runtime and expect source to observe it.
// Baking a constant would freeze those reads and break the tests. `envPrefix`
// additionally exposes REACT_APP_*/VITE_* on `import.meta.env` for future code.
// ─────────────────────────────────────────────────────────────────────────────
export default defineConfig(({ mode, command }) => {
  const isTest = mode === 'test' || !!process.env.VITEST;

  // loadEnv reads .env* files AND merges matching keys already present in
  // process.env (how deploy.sh injects REACT_APP_* at build time).
  const env = loadEnv(mode, process.cwd(), ['REACT_APP_', 'VITE_']);

  const define = {};
  if (!isTest) {
    const processEnv = {
      NODE_ENV: command === 'build' ? 'production' : 'development',
    };
    for (const [key, value] of Object.entries(env)) {
      if (key.startsWith('REACT_APP_')) processEnv[key] = value;
    }
    define['process.env'] = JSON.stringify(processEnv);
  }

  return {
    plugins: [react()],
    // CRA compiled JSX inside plain `.js` files; Vite/esbuild only treats `.jsx`
    // as JSX by default. Many source + test files here are `.js` with JSX, so
    // force the jsx loader for everything under src/.
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      // Same reason, for the dep pre-bundle scanner.
      esbuildOptions: { loader: { '.js': 'jsx' } },
    },
    // Keep REACT_APP_ working as an env prefix alongside Vite's native VITE_.
    envPrefix: ['VITE_', 'REACT_APP_'],
    define,
    server: {
      port: 3000,
      // Mirrors CRA's `"proxy": "http://localhost:8080"`. In practice API calls
      // use absolute bases (REACT_APP_API_URL / the :8081 fallback), so this only
      // matters for any relative `/api` request during local dev.
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      // CRA emitted build/; Vite emits dist/. deploy.sh rsyncs dist/ into the
      // box's existing frontend/build/ nginx root (no nginx change required).
      outDir: 'dist',
      sourcemap: false,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      // Process .css imports (index.css, App.css, @fontsource) instead of erroring.
      css: true,
    },
  };
});
