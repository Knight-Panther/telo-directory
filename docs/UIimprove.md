# Admin Panel – Submissions Tab Adjustments

## Scope

The filtering section of the Submissions Tab is fully stable and must remain **untouched**.  
All changes apply only to the listing area and related UI elements.

---

## Listing Area (Gmail-like UI)

### Date & Time Display

-   Replace relative timestamps (`Today`, `2 days ago`) with absolute values.
-   Use the following formats:
    -   **Time of submission:** `HH:mm` (e.g., `14:50`)
    -   **Date of submission:** `DD-MMM-YYYY` (e.g., `20-Sep-2025`)

### Business Title & Links

-   Make business names **unclickable** (remove existing click logic).
-   Add **small social media icons** below each business title:
    -   Supported: Facebook, TikTok, YouTube, Instagram
    -   Show only icons for which links exist in the submission data
    -   Icons must be clickable and link to external pages

### Cities & Categories

-   Allocate **responsive, fixed spaces** for each column.
-   Keep arrays wrapped within their section:
    -   Avoid long horizontal lines
    -   Prevent truncated listings like `+3 more`
    -   Always show full content wrapped neatly

---

## Header Row

-   Add a header row immediately below the **Select All** checkbox row.
-   Include column names:
    -   Date
    -   Submission Time
    -   Company Name
    -   City
    -   Sector
    -   Duplication Flag
    -   Status
-   Extend with additional logical fields if discovered during testing.

---

## Design & Consistency

-   Maintain current **color palette**, typography, and design style.
-   If header row clashes visually:
    -   Consider restructuring listing layout to incorporate headers naturally.
-   No **new CSS or JS files**; update existing styles only.
-   Avoid over-engineering; apply minimal effective changes.

---

## Development Guidelines

-   Work **incrementally**:
    1. Date/time format change
    2. Business name + social icons
    3. Cities/categories wrapping fix
    4. Column header row
    5. Visual consistency review
    6. Final testing
-   Preserve all **optimizations and performance improvements**.
-   Double-check **code quality, consistency, and security**.
-   Do not blindly follow old docs (`adminSubmission.md`) if they diverge from working realities.

---
