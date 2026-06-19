# BallotIQ

Adaptive AI tutor for election education. Gemini generates personalized learning paths; the app translates the entire UI into 8 languages and reads content aloud via Google Cloud TTS. Deployed on Google Cloud Run.

## Project layout

```
ballotiq/          ← run all commands from here (NOT the repo root)
  src/
    app/           ← Next.js App Router pages + API routes
      api/gemini/  ← server-side Gemini API routes (assess, guide, quiz, etc.)
      assess/      ← 3-question diagnostic
      choose-path/ ← guided vs open chat selector
      learn/       ← per-country learning path (dynamic [country] route)
      quiz/        ← final certification quiz
      assistant/   ← open chat mode
    components/    ← UI components (ui/, Quiz/, Journey/, Location/, Home/)
    context/       ← TranslationContext, ThemeContext
    hooks/         ← useTranslation, useTTS, useSTT, useQuiz, useAdaptiveLearning, etc.
    lib/
      gemini/      ← client, prompts, fallback content per region
      firebase/    ← client, firestore (sessions, cache, rate limiting, telemetry)
      translate/   ← Google Cloud Translation client
      tts/         ← Google Cloud TTS client
      security/    ← sanitize, rate limit
      offline/     ← IndexedDB for offline support
      constants/   ← countries, languages
    locales/       ← static JSON translations (ar, de, es, fr, hi, pt, ta, te)
    types/         ← centralized TypeScript interfaces (UserContext, ElectionStep, etc.)
  __tests__/       ← Jest tests (lib/, hooks/, components/)
  __mocks__/       ← Jest manual mocks (server-only)
  firebase.json    ← Firebase Hosting config + Firestore rules
```

## Installed Skills

Skills extend Claude Code with project-specific expertise. Invoke via `/skill-name` in Claude Code.

| Skill | What it does |
|-------|--------------|
| `core-web-vitals` | Audits and fixes LCP, INP, CLS — Google ranking signals. Gives targeted fixes for slow loads, layout shifts, and interaction delays. |
| `react-testing-library` | Reference guide for `@testing-library/react` — queries, user-event simulation, async utilities. Use when writing component tests. |
| `seo-audit` | Full technical SEO audit: meta tags, crawlability, indexing, page speed, Core Web Vitals integration, and ranking diagnostics. |
| `wcag-audit-patterns` | WCAG 2.2 accessibility audit with automated checks, manual verification steps, and remediation guidance. Covers ADA/Section 508. |

Install or update skills from `e:\Workspace\ssoc\BallotIQ\` (repo root):

```bash
# Install a skill
npx claude-code agents add <skill-name>

# List installed skills
npx claude-code agents list
```

Skill definitions live in `.agents/skills/` and the lock file is `skills-lock.json` at the repo root.

---

## Next.js Docs

**STOP. What you remember about Next.js is WRONG for this project.** This project uses Next.js 15+ with App Router. Always search the local docs index before writing any Next.js code.

Docs index is embedded at the bottom of this file (`<!-- NEXT-AGENTS-MD-START -->`). Docs files live in `.next-docs/` at the repo root.

Regenerate docs if missing:

```bash
cd ballotiq
npm run install-nextjs-docs
```

---

## Commands

Run from `ballotiq/`:

```bash
npm run dev          # Next.js dev server on :3000
npm run build        # static export to /out (trailing slash URLs)
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm test             # Jest (ts-jest, jsdom)
```

Run a single test file:

```bash
npx jest __tests__/lib/validator.test.ts
```

Run tests matching a name:

```bash
npx jest -t "validator"
```

## Key facts

- **React 19 + Next.js 15+** — Server Components are the default; client components need `"use client"`. Read Next.js docs in `node_modules/next/dist/docs/` before writing code; APIs may differ from training data.
- **Tailwind CSS v4** — PostCSS via `@tailwindcss/postcss`. Custom glassmorphism components (`.glass`, `.bento-card`) and utilities (`.bg-grain`, `.hover-glow`, `.text-gradient`) defined in `tailwind.config.ts`.
- **Path alias**: `@/*` maps to `./src/*`. Use it consistently.
- **Theme system** — Dark/light mode via CSS variables, toggled by inline `<script>` in layout to avoid flash. `ThemeProvider` reads `localStorage('ballotiq_theme')`. Components reference `var(--background)`, `var(--foreground)`, etc.
- **Firebase anonymous auth is required** — All Firestore operations depend on `ensureAnonymousAuth()`. The test setup mocks this.
- **Static export** — `output: 'standalone'` + `trailingSlash: true`. Firebase Hosting rewrites all routes to `index.html`. Don't use Next.js server-side rendering features (ISR, `revalidate`, etc.) — they won't work in the static export.
- **API routes in `src/app/api/gemini/`** — These are server-side only (they use `server-only` module). The client calls these via `fetch`.
- **RTL support** — Arabic (`ar`) is the only RTL language. Use `getTextDirection()` from `lib/constants/languages.ts` when building directional UI.

## Testing

- **Jest config**: `jest.config.ts` at `ballotiq/` root. Uses `ts-jest` preset, `jsdom` environment.
- **Mocks**: `server-only` is mocked as empty module (`__mocks__/server-only.ts`). Firebase, translation context, analytics, and Firestore are all mocked globally in `jest.setup.ts`.
- **Coverage thresholds**: 70% lines/functions, 60% branches.
- **Pattern**: `__tests__/` mirrors `src/` structure. Tests use `@testing-library/react` and `jest-axe` for accessibility.
- **If you add a new module that imports `server-only`**, it will fail in tests unless that import is mocked. Check `jest.setup.ts` for existing mocks.

## Environment variables

All prefixed `NEXT_PUBLIC_` (exposed to client). Required in `.env.local`:

- `NEXT_PUBLIC_GEMINI_API_KEY`
- `NEXT_PUBLIC_FIREBASE_*` (api key, auth domain, project id, storage bucket, messaging sender id, app id, measurement id)
- `NEXT_PUBLIC_TRANSLATE_API_KEY`
- `NEXT_PUBLIC_TTS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Removing any Google service integration breaks the app. Each is load-bearing.

## Conventions

- **Centralized types** — All shared interfaces live in `src/types/index.ts`. Import from there.
- **Fallback content** — Gemini can fail; `lib/gemini/fallback/` has hardcoded election data per region (usa, india, europe, africa-asia, etc.). The fallback system is tested in `__tests__/lib/fallback.test.ts`.
- **Translation keys** — UI text goes through `useTranslation().translate()`. Never hardcode user-visible strings outside of locale JSON files.
- **Dynamic imports** — Heavy components (PollingStationFinder, CountrySelector, LanguageSelector) use `next/dynamic` with `ssr: false`.

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output AGENTS.md|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-images-and-fonts.mdx,05-css-and-styling.mdx,06-data-fetching-and-streaming.mdx}|01-app/02-building-your-application/01-routing:{01-defining-routes.mdx,02-pages.mdx,03-layouts-and-templates.mdx,04-linking-and-navigating.mdx,05-error-handling.mdx,06-loading-ui-and-streaming.mdx,07-redirecting.mdx,08-route-groups.mdx,10-dynamic-routes.mdx,11-parallel-routes.mdx,12-intercepting-routes.mdx,13-route-handlers.mdx,14-middleware.mdx,15-internationalization.mdx}|01-app/02-building-your-application/02-data-fetching:{01-fetching.mdx,03-server-actions-and-mutations.mdx,04-incremental-static-regeneration.mdx}|01-app/02-building-your-application/03-rendering:{01-server-components.mdx,02-client-components.mdx,03-composition-patterns.mdx,04-partial-prerendering.mdx,05-edge-and-nodejs-runtimes.mdx}|01-app/02-building-your-application/05-styling:{01-css.mdx,02-tailwind-css.mdx,03-sass.mdx,04-css-in-js.mdx}|01-app/02-building-your-application/06-optimizing:{01-images.mdx,02-videos.mdx,03-fonts.mdx,04-metadata.mdx,05-scripts.mdx,06-package-bundling.mdx,07-lazy-loading.mdx,08-analytics.mdx,09-instrumentation.mdx,10-open-telemetry.mdx,11-static-assets.mdx,12-third-party-libraries.mdx,13-memory-usage.mdx}|01-app/02-building-your-application/07-configuring:{03-environment-variables.mdx,05-mdx.mdx,06-src-directory.mdx,10-custom-server.mdx,11-draft-mode.mdx,15-content-security-policy.mdx,16-debugging.mdx,16-progressive-web-apps.mdx}|01-app/02-building-your-application/08-testing:{01-vitest.mdx,02-jest.mdx,03-playwright.mdx,04-cypress.mdx}|01-app/02-building-your-application/10-deploying:{01-production-checklist.mdx,02-static-exports.mdx,03-multi-zones.mdx}|01-app/02-building-your-application/11-upgrading:{01-codemods.mdx,02-canary.mdx,03-version-15.mdx,04-version-14.mdx,05-app-router-migration.mdx,06-from-create-react-app.mdx,07-from-vite.mdx}|01-app/03-api-reference:{07-edge.mdx,08-turbopack.mdx}|01-app/03-api-reference/01-directives:{use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.mdx,manifest.mdx,opengraph-image.mdx,robots.mdx,sitemap.mdx}|01-app/03-api-reference/03-file-conventions:{default.mdx,error.mdx,forbidden.mdx,instrumentation.mdx,layout.mdx,loading.mdx,mdx-components.mdx,middleware.mdx,not-found.mdx,page.mdx,route-segment-config.mdx,route.mdx,template.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,connection.mdx,cookies.mdx,draft-mode.mdx,fetch.mdx,forbidden.mdx,generate-image-metadata.mdx,generate-metadata.mdx,generate-sitemaps.mdx,generate-static-params.mdx,generate-viewport.mdx,headers.mdx,image-response.mdx,next-request.mdx,next-response.mdx,not-found.mdx,permanentRedirect.mdx,redirect.mdx,revalidatePath.mdx,revalidateTag.mdx,unauthorized.mdx,unstable_cache.mdx,unstable_expirePath.mdx,unstable_expireTag.mdx,unstable_noStore.mdx,unstable_rethrow.mdx,use-params.mdx,use-pathname.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,use-selected-layout-segment.mdx,use-selected-layout-segments.mdx,userAgent.mdx}|01-app/03-api-reference/05-config/01-next-config-js:{appDir.mdx,assetPrefix.mdx,authInterrupts.mdx,basePath.mdx,cacheLife.mdx,compress.mdx,crossOrigin.mdx,cssChunking.mdx,devIndicators.mdx,distDir.mdx,dynamicIO.mdx,env.mdx,eslint.mdx,expireTime.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,incrementalCacheHandlerPath.mdx,inlineCss.mdx,logging.mdx,mdxRs.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,ppr.mdx,productionBrowserSourceMaps.mdx,reactCompiler.mdx,reactMaxHeadersLength.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,sassOptions.mdx,serverActions.mdx,serverComponentsHmrCache.mdx,serverExternalPackages.mdx,staleTimes.mdx,staticGeneration.mdx,trailingSlash.mdx,transpilePackages.mdx,turbo.mdx,typedRoutes.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|01-app/03-api-reference/05-config:{02-typescript.mdx,03-eslint.mdx}|01-app/03-api-reference/06-cli:{create-next-app.mdx,next.mdx}|02-pages/01-getting-started:{01-installation.mdx,02-project-structure.mdx}|02-pages/02-building-your-application/01-routing:{01-pages-and-layouts.mdx,02-dynamic-routes.mdx,03-linking-and-navigating.mdx,04-redirecting.mdx,05-custom-app.mdx,06-custom-document.mdx,07-api-routes.mdx,08-custom-error.mdx,10-internationalization.mdx,11-middleware.mdx}|02-pages/02-building-your-application/02-rendering:{01-server-side-rendering.mdx,02-static-site-generation.mdx,04-automatic-static-optimization.mdx,05-client-side-rendering.mdx,06-edge-and-nodejs-runtimes.mdx}|02-pages/02-building-your-application/03-data-fetching:{01-get-static-props.mdx,02-get-static-paths.mdx,03-forms-and-mutations.mdx,03-get-server-side-props.mdx,04-incremental-static-regeneration.mdx,05-client-side.mdx}|02-pages/02-building-your-application/04-styling:{01-css.mdx,02-tailwind-css.mdx,03-css-in-js.mdx,04-sass.mdx}|02-pages/02-building-your-application/05-optimizing:{01-images.mdx,02-fonts.mdx,03-scripts.mdx,05-static-assets.mdx,06-package-bundling.mdx,07-analytics.mdx,08-lazy-loading.mdx,09-instrumentation.mdx,10-open-telemetry.mdx,11-third-party-libraries.mdx}|02-pages/02-building-your-application/06-configuring:{03-environment-variables.mdx,05-src-directory.mdx,06-mdx.mdx,07-amp.mdx,08-babel.mdx,09-post-css.mdx,10-custom-server.mdx,11-draft-mode.mdx,12-error-handling.mdx,13-preview-mode.mdx,14-content-security-policy.mdx,16-debugging.mdx}|02-pages/02-building-your-application/07-testing:{01-vitest.mdx,02-jest.mdx,03-playwright.mdx,04-cypress.mdx}|02-pages/02-building-your-application/09-deploying:{01-production-checklist.mdx,02-static-exports.mdx,03-multi-zones.mdx,04-ci-build-caching.mdx}|02-pages/02-building-your-application/10-upgrading:{01-codemods.mdx,02-app-router-migration.mdx,03-from-vite.mdx,04-from-create-react-app.mdx,05-version-14.mdx,06-version-13.mdx,07-version-12.mdx,08-version-11.mdx,09-version-10.mdx,10-version-9.mdx}|02-pages/03-api-reference:{06-edge.mdx,08-turbopack.mdx}|02-pages/03-api-reference/01-components:{font.mdx,form.mdx,head.mdx,image-legacy.mdx,image.mdx,link.mdx,script.mdx}|02-pages/03-api-reference/02-file-conventions:{instrumentation.mdx}|02-pages/03-api-reference/03-functions:{get-initial-props.mdx,get-server-side-props.mdx,get-static-paths.mdx,get-static-props.mdx,next-request.mdx,next-response.mdx,use-amp.mdx,use-report-web-vitals.mdx,use-router.mdx,userAgent.mdx}|02-pages/03-api-reference/04-config/01-next-config-js:{assetPrefix.mdx,basePath.mdx,bundlePagesRouterDependencies.mdx,compress.mdx,crossOrigin.mdx,devIndicators.mdx,distDir.mdx,env.mdx,eslint.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,runtime-configuration.mdx,serverExternalPackages.mdx,trailingSlash.mdx,transpilePackages.mdx,turbo.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|02-pages/03-api-reference/04-config:{01-typescript.mdx,02-eslint.mdx}|02-pages/03-api-reference/05-cli:{create-next-app.mdx,next.mdx}|03-architecture:{accessibility.mdx,fast-refresh.mdx,nextjs-compiler.mdx,supported-browsers.mdx}|04-community:{01-contribution-guide.mdx}<!-- NEXT-AGENTS-MD-END -->
