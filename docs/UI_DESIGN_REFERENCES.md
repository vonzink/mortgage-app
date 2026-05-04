# UI Design References

User-provided design preferences captured during planning. These inform Phase 2 (Borrower Portal) and Phase 3 (LO UI). Source: UWM EASE platform screenshots.

## 1. Document Management Panel

Layout — two-column:

**Left sidebar (loan context card):**
- Orange "BACK TO PIPELINE" button at top
- Navy header strip with borrower name in caps (e.g. `MURSHED SAWAGED`)
- Below: stacked label/value pairs — Loan Status, Loan Number (with copy-to-clipboard icon), Property Address (multi-line)

**Main panel:**
- Navy header bar "VIEW DOCUMENTS" with refresh button on right (orange)
- Toolbar row: Search input (left) + filter radios (`Attached Documents`, `Generated Documents`, `ESigned Documents`) + orange "CLEAR FILTER" button
- Table with sortable columns and ▲▼ indicators:
  - Document Type
  - Document Name
  - Date Generated
  - Added By
  - Document (link: "View Document")
- Alternating row colors: light blue / light gray
- Sticky/colored teal column headers

**Color palette:**
- Primary navy: dark blue panel headers
- Accent orange: action buttons (BACK, CLEAR FILTER, refresh)
- Teal: column header text
- Row striping: pale blue + pale gray

## 2. Loan Summary Sidebar (LO View)

Two-column key/value table titled `MENU | SUMMARY`. Right column shows current values; flagged values are color-coded (red = warning, green = passed, orange = info).

Fields displayed (in order):
- APR / Disclosed
- QM
- HPML
- High Cost / PredProtect
- UCD Results
- Cash to Close (Amount / Available)
- EMD / Cash Deposit
- Interest Rate
- Tolerance Cure
- Principal Reduction
- Lock In Date
- Lock Expiration Date
- HTI / DTI
- PITI
- AMC
- Mortgage Purpose
- LTV / CLTV / HCLTV
- Loan Program (with validity badge — "Valid")
- MI Product
- Occupancy Type
- Base Loan Amount
- Total Loan Amount
- Appraised Value
- Sales Price
- Qualifying Credit Score
- Credit Type
- AUS Method
- Disclosures?
- Property Type
- Escrow / Impound Waiver Type
- Compensation Type
- Closing Date / Time
- Closing Method
- EASE Docs Version
- URLA Version

**Notes for implementation:**
- Many of these fields are derived/calculated — DTI, LTV, PITI come from loan + borrower + property data, not raw inputs.
- Some are LendingPad-specific (UCD Results, EASE Docs Version, AMC) — surface only if data is available, gracefully omit otherwise.
- Color coding logic: green for passed validations, red for warnings (e.g. "NOT RUN", high LTV), orange/teal for informational.
- This panel is **LO-only**. Borrower view should be a simplified subset (no AUS, no compliance flags).
