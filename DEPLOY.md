# Deploy on Render as a static site

The site builds to plain HTML, JS, and CSS in `out/`. It needs no server and
no database: all entries, verse text, and annotations ship in
`public/data/apologetics.json` (about 1.2 MB), and the browser loads that file
at runtime. Search, topic browsing, and the objection filter all run in the
browser.

## Steps

1. Push the repository to GitHub:

       git remote add origin https://github.com/<you>/<repo>.git
       git branch -M main
       git push -u origin main

2. Open render.com and sign in. In the Dashboard, select New + and then
   Static Site.

3. Connect your GitHub account if asked, then select the repository.

4. Fill in the form:

   - Name: `catholic-apologetics` (any name works)
   - Branch: `main`
   - Build command: `npm install && npm run build`
   - Publish directory: `out`

5. Select Create Static Site. Render installs the dependencies, runs
   `next build`, and serves the `out/` directory. The URL appears at the top
   of the service page (a free `onrender.com` subdomain with TLS).

Node version: Next.js 16 needs Node 20.9 or newer. If the build log shows an
engine error, open the service's Environment tab, add the environment
variable `NODE_VERSION` with value `22`, and trigger a manual deploy.

## After the first deploy

Every push to `main` rebuilds and redeploys automatically. A custom domain
and its TLS certificate are set in Settings > Custom Domains. Build logs are
under the Events or Logs tab.

Alternative to steps 2-4: the repository contains `render.yaml`, so in the
Dashboard you can select New + > Blueprint and pick the repository instead;
Render reads the service definition from that file.

## Check the build output locally

    npm install
    npm run build
    python3 -m http.server 8000 --directory out

Then open `http://localhost:8000`. The output is the same set of files Render
serves.
