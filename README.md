# UPSC Prelims PYQ 2000–2026: put it online and install it

Everything runs in the browser. There is no server and no login. Answers, bookmarks and the heatmap
are saved on each device (use **My data → Download backup** now and then).

## Files (upload all of them, keeping the `data` folder)
- `index.html`, `app.js`, `style.css`: the portal
- `data/pyq-*.js`: all questions, analyses and notes
- `manifest.webmanifest`, `sw.js`, `icon-*.png`, `apple-touch-icon.png`: make it installable and offline
- `.nojekyll`: tells GitHub Pages to serve the files as they are

## Go live on GitHub Pages (free)
See the step-by-step guide in the chat, or briefly:
1. Create a **public** repository on github.com, e.g. `upsc-pyq`.
2. **Add file → Upload files** → drag in everything from this folder (including the `data` folder) → **Commit changes**.
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, folder `/ (root)` → **Save**.
4. After 1–2 minutes the site is at `https://<your-username>.github.io/upsc-pyq/`.

## Install
- **Android (Chrome)**: open the link → **Install app** button (top bar), or ⋮ → *Add to Home screen* → *Install*.
- **Windows / Mac (Chrome or Edge)**: the **Install app** button, or the install icon in the address bar.
- **iPhone / iPad**: open in **Safari** → **Share** → **Add to Home Screen**.
Open it once while online; after that it works without internet.

## Updating later
Run `python -I -X utf8 work/build_pwa.py` again, then upload the new files to the same repository
(replace the old ones; delete old `data/pyq-*.js` files that are no longer in the folder).
The installed app picks up the new version the next time it is opened online. Saved progress stays.
