# Manual GitHub and GitHub Pages publication

Only the owner performs these steps. No repository has been created or accessed, no Git commands have been executed, and no deployment has been triggered by this release preparation.

1. Extract the final ZIP and open its project folder in VS Code. `package.json`, `src/`, `public/` and `.github/` must be at the repository root. Do not put the entire application inside another `homography-lab/` subfolder.
2. In your browser, create an empty GitHub repository named **homography-lab** under your own account. Leave automatic README, license and .gitignore initialization unchecked to avoid a conflicting initial commit. Choose visibility appropriate for your Pages plan. Confirm that you have permission to publicly distribute the included comic and artwork; this package does not invent an open-source license.
3. In VS Code's terminal, run the local checks yourself:

```bash
npm ci
npm test
npm run typecheck
npm run build -- --mode pages
npm run preview -- --mode pages
```

Visit the displayed server URL followed by `/homography-lab/`. Stop the preview with Ctrl+C when finished.

4. For a new local folder that is not already a Git repository, run the following **yourself**, replacing YOUR_USERNAME. If the folder already belongs to a repository, inspect its setup first and do not blindly reinitialize or replace a remote.

```bash
git init
git add .
git commit -m "Release Homography Lab"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/homography-lab.git
```

5. In the GitHub repository, choose **Settings → Pages → Build and deployment → Source → GitHub Actions**. Then publish the local branch yourself:

```bash
git push -u origin main
```

Use your normal GitHub authentication in VS Code; do not paste credentials into this project. The push activates the prepared workflow. If Pages was not enabled before the first push, enable it and manually run or rerun the workflow from the Actions tab.

6. Inspect the workflow's build and deploy jobs. On success, visit `https://YOUR_USERNAME.github.io/homography-lab/`, reload it, drag a corner, rectify, and open the comic. Replace the README placeholder with the working URL only after verifying the public site.

## Configuration

`.github/workflows/deploy.yml` runs on pushes to `main` and manual dispatch. It uses Node 24, npm ci, tests, TypeScript, the Pages-mode build, and official upload/deploy actions. Deployment has Pages-write and OIDC permissions; no personal access token or repository secret is required by this workflow. Repository policies or environment protections can still require owner approval.

`vite.config.mjs` selects `/` normally and `/homography-lab/` in `pages` mode. For a different repository name or custom domain, set `VITE_BASE_PATH` to the desired leading/trailing-slash path in the build job (for example `/new-name/` or `/`). Use the same override when previewing. Public comic URLs and the lazy reader follow Vite's base. There is no client-side path router: navigation stays on the single index page.

In PowerShell, an optional temporary override is:

```powershell
$env:VITE_BASE_PATH='/new-name/'
npm run build -- --mode pages
npm run preview -- --mode pages
# After stopping the preview:
Remove-Item Env:VITE_BASE_PATH
```

Only upload `dist/` as the Pages artifact; source code, browser harnesses and development dependencies are not part of the deployed site. Keep `public/comic/` in the repository so the build can copy its required assets.

References: [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite static deployment](https://v6.vite.dev/guide/static-deploy).
