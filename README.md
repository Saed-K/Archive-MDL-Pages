# Archive-MDL-Pages

Just a quick project for a friend. A small Tampermonkey userscript that adds an “Archive” button to MyDramaList pages, allowing you to save a fully inlined, offline copy of the current page HTML + images links(JSON) in a ZIP file.

---

## Overview

- Injects an **Archive** button in the bottom‐left corner of any `https://mydramalist.com/*` page.
- Converts every `<img>` on the page into a Data URI and inlines it, producing a self-contained HTML file.
- Inlines external CSS rules so that the archived HTML renders correctly offline.
- Gathers metadata for each image (original source URL + a human‐readable name heuristic) into a JSON file (`images.json`).
- Packages everything (inlined HTML + `images.json`) into a `/\<PageTitle>_YYYY-MM-DD_HH-mm>.zip` archive for download.

---

## Requirements

- A userscript manager such as **Tampermonkey**, **Greasemonkey**, or **Violentmonkey**.

---

## Installation

1. Install a userscript manager in your browser (e.g., [Tampermonkey](https://www.tampermonkey.net/)).
2. Create a new userscript (File → New Script) to copy the script from this repo or simply drag & drop mdlarchive.js to your userscript manager.
3. 3. Save the script and ensure it’s enabled in your userscript manager.
4. Navigate to any page under `https://mydramalist.com/`. An **Archive** button will appear in the bottom‐left corner. Click it to generate and download a ZIP containing:
   - A self‐contained `<PageTitle>.html` (all images and CSS inlined).
   - An `images.json` file listing original image URLs + auto‐extracted names.

---

## Usage

1. Go to any MyDramaList page (e.g., a drama’s detail page or your profile).
2. Wait for the page to fully load (so images and CSS are available).
3. Click the **Archive** button.  
   - The script will convert every image into a Data URI, inline external CSS rules, and bundle everything into a ZIP.
   - The downloaded ZIP will be named like `\<PageTitle>_2025-06-05_14-30.zip` (timestamp in `YYYY-MM-DD_HH-mm` format).

---

## Notes

- If an image hasn’t finished loading before you click “Archive,” it may be skipped (no Data URI).  
- Filenames are sanitized by replacing illegal characters (` \ / : * ? " < > | `) with underscores.
- Image metadata (ID, original URL, and a best‐guess “name”) is stored in `images.json` for easy reference.
- CSS inlining attempts to read from accessible `document.styleSheets`. Some cross‐origin stylesheets may be skipped if they aren’t readable due to CORS.
- This script may work on non-MDL pages but to a certain degree and might produce broken results. 
---



## License

This userscript is released under the [MIT License](https://opensource.org/licenses/MIT). Feel free to modify and redistribute.  

