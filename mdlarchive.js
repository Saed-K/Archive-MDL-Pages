// ==UserScript==
// @name         Archive MDL
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Archive pages on MDL.
// @match        https://mydramalist.com/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.0/jszip.min.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Create and style the Archive button
    const btn = document.createElement("button");
    btn.innerText = "Archive";
    btn.style.cssText = `
        position: fixed;
        bottom: 14px;
        left: 14px;
        z-index: 10000;
        padding: 6px 11px;
        background-color: #125e92;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 10px;
    `;
    document.body.appendChild(btn);

    // Helper function to sanitize filenames
    function sanitizeFilename(name) {
        return name.replace(/[\\\/:*?"<>|]/g, '_').trim() || "untitled";
    }

    // New heuristic to extract a name for the image
    function getImageName(img) {
        // 1. Try the alt attribute.
        let name = img.getAttribute("alt");
        if (name && name.trim()) return name.trim();

        // 2. Look for a nearest list item container and extract from a primary link
        let listItem = img.closest("li.list-item");
        if (listItem) {
            // Try to find an <a> with class "text-primary" that wraps a <b> element
            let aPrimary = listItem.querySelector("a.text-primary b");
            if (aPrimary && aPrimary.textContent.trim()) {
                return aPrimary.textContent.trim();
            }
        }

        // 3. If not found, check if the image is inside a link with a title attribute.
        const parentA = img.closest("a[title]");
        if (parentA && parentA.getAttribute("title")) return parentA.getAttribute("title").trim();

        // 4. Check if the parent element has a title attribute.
        if (img.parentElement && img.parentElement.getAttribute("title")) {
            return img.parentElement.getAttribute("title").trim();
        }

        // 5. As a last resort, check the immediate next sibling's text.
        const sibling = img.nextElementSibling;
        if (sibling && sibling.textContent.trim()) return sibling.textContent.trim();

        return "";
    }

    // Convert an image element to a data URI using canvas (using already loaded image data)
    function imageToDataURI(img) {
        return new Promise((resolve, reject) => {
            try {
                // Ensure image is loaded
                if (!img.complete || img.naturalWidth === 0) {
                    resolve(null);
                    return;
                }
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL("image/png");
                resolve(dataURL);
            } catch (e) {
                console.error("Error converting image to Data URI:", e);
                resolve(null);
            }
        });
    }

    // Inline external CSS by replacing <link rel="stylesheet"> with a <style> block containing its CSS rules
    function inlineStylesInClone(cloneDoc) {
        const links = cloneDoc.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(link => {
            const href = link.href;
            let cssText = "";
            // Look for the matching stylesheet in the live document
            for (let sheet of document.styleSheets) {
                if (sheet.href === href) {
                    try {
                        for (let rule of sheet.cssRules) {
                            cssText += rule.cssText + "\n";
                        }
                    } catch (e) {
                        console.warn("Could not access cssRules for", href, e);
                    }
                    break;
                }
            }
            if (cssText) {
                const styleElem = cloneDoc.createElement("style");
                styleElem.textContent = cssText;
                link.parentNode.insertBefore(styleElem, link);
                link.remove();
            }
        });
    }

    // Main archive function
    async function archivePage() {
        // Array to store image info for the JSON file
        const imageInfoArray = [];

        // Process images in the live document: assign a unique attribute and convert to data URI
        const liveImages = Array.from(document.querySelectorAll("img"));
        for (let i = 0; i < liveImages.length; i++) {
            const img = liveImages[i];
            const archiveId = "archive-id-" + i;
            img.setAttribute("data-archive-id", archiveId);
            const originalSrc = img.src;
            const name = getImageName(img);
            imageInfoArray.push({ id: archiveId, originalSrc: originalSrc, name: name });
            // Compute data URI from already loaded image
            const dataURI = await imageToDataURI(img);
            if (dataURI) {
                img.setAttribute("data-inlined-src", dataURI);
            }
        }

        // Clone the entire document as a starting point for our offline copy
        const clonedDocElem = document.documentElement.cloneNode(true);
        const parser = new DOMParser();
        let cloneHTML = "<!DOCTYPE html>\n" + clonedDocElem.outerHTML;
        let cloneDoc = parser.parseFromString(cloneHTML, "text/html");

        // In the cloned document, update each <img> with its corresponding inlined data URI
        const clonedImages = cloneDoc.querySelectorAll("img[data-archive-id]");
        clonedImages.forEach(img => {
            const archiveId = img.getAttribute("data-archive-id");
            // Find the corresponding live image using the unique attribute
            const liveImg = document.querySelector(`img[data-archive-id="${archiveId}"]`);
            if (liveImg) {
                const inlined = liveImg.getAttribute("data-inlined-src");
                if (inlined) {
                    img.src = inlined;
                }
            }
            // Remove temporary data attributes
            img.removeAttribute("data-archive-id");
            img.removeAttribute("data-inlined-src");
        });

        // Inline external CSS in the clone
        inlineStylesInClone(cloneDoc);

        // Serialize the final cloned document with DOCTYPE
        const finalHTML = "<!DOCTYPE html>\n" + cloneDoc.documentElement.outerHTML;
        const pageTitle = sanitizeFilename(document.title);

        // Create JSON content for original image links along with names
        const jsonContent = JSON.stringify(imageInfoArray, null, 2);

        // Create a timestamp string in format YYYY-MM-DD_HH-mm
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        //const second = String(now.getSeconds()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}_${hour}-${minute}`;

        // Archive both files into a zip using JSZip with maximum compression
        const zip = new JSZip();
        zip.file(`${pageTitle}.html`, finalHTML);
        zip.file("images.json", jsonContent);

        const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 9 }
        });

        // Trigger the download of the zip file with the timestamp appended
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(zipBlob);
        downloadLink.download = `${pageTitle}_${dateStr}.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    btn.addEventListener("click", archivePage);
})();
