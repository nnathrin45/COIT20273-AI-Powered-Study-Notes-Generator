# Member 1 – Responsive and Cross-Browser Testing

**Project:** AI-Powered Study Notes Generator  
**Unit:** COIT20273  
**Member:** Christian Jeff Labaddan  
**Role:** UI/UX and Frontend Integration  
**Testing Date:** 2 September 2026  
**Related Issue:** #55 – Conduct responsive and cross-browser testing

---

## 1. Purpose

The purpose of this testing was to verify that the AI-Powered Study Notes Generator frontend remains usable and visually consistent across different screen sizes and web browsers.

Testing focused on responsive layout behaviour, readability, navigation, forms, controls, content positioning and general browser compatibility.

---

## 2. Test Environment

Responsive testing was performed using Google Chrome Developer Tools.

Cross-browser testing was performed using:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox

The frontend was tested using the local development environment.

---

## 3. Responsive Testing

The following screen sizes were tested in Google Chrome:

| Device Type | Resolution | Result |
|---|---|---|
| Mobile | 375 × 667 | PASS |
| Large Mobile | 430 × 932 | PASS |
| Tablet | 768 × 1024 | PASS |
| Laptop | 1366 × 768 | PASS |
| Desktop | 1920 × 1080 | PASS |

Testing confirmed that the application layout adapts correctly across the tested viewport sizes.

No unexpected horizontal scrolling, overlapping content, clipped controls or unreadable text were identified.

---

## 4. Pages Tested

The following frontend pages were reviewed during responsive and cross-browser testing:

| Page | Responsive Layout | Browser Compatibility | Result |
|---|---|---|---|
| Login | Working correctly | Working correctly | PASS |
| Register | Working correctly | Working correctly | PASS |
| Dashboard | Working correctly | Working correctly | PASS |
| Upload Material | Working correctly | Working correctly | PASS |
| Summary | Working correctly | Working correctly | PASS |
| Flashcards | Working correctly | Working correctly | PASS |
| Practice Quiz | Working correctly | Working correctly | PASS |
| Concept Explanation | Working correctly | Working correctly | PASS |
| Study Planner | Working correctly | Working correctly | PASS |
| Saved Materials | Working correctly | Working correctly | PASS |
| Progress | Working correctly | Working correctly | PASS |

---

## 5. Responsive Behaviour Checked

Testing verified that:

- page content remains within the viewport;
- no unintended horizontal scrolling occurs;
- text remains readable;
- cards and content sections resize appropriately;
- form inputs remain usable;
- buttons remain visible and accessible;
- navigation remains usable;
- tables and content sections remain readable;
- page spacing remains appropriate;
- content does not overlap or become clipped.

---

## 6. Cross-Browser Testing

### Google Chrome

The application was tested in Google Chrome and all tested pages displayed and operated correctly.

**Result: PASS**

### Microsoft Edge

The application was tested in Microsoft Edge.

Page layouts, forms, buttons, navigation, tables and interactive controls operated consistently with Google Chrome.

No browser-specific visual or functional issues were identified.

**Result: PASS**

### Mozilla Firefox

The application was also tested in Mozilla Firefox.

The tested pages rendered correctly and the major frontend controls remained functional.

No significant browser-specific layout or functionality issues were identified.

**Result: PASS**

---

## 7. Browser Compatibility Result

| Browser | Result |
|---|---|
| Google Chrome | PASS |
| Microsoft Edge | PASS |
| Mozilla Firefox | PASS |

The frontend displayed consistently across all three tested browsers.

---

## 8. Testing Limitations

Responsive viewport testing was performed primarily using Google Chrome Developer Tools.

Microsoft Edge and Mozilla Firefox were used for desktop cross-browser compatibility testing rather than repeating every responsive viewport size.

Testing was performed on the current frontend implementation. Pages that later receive significant backend integration or user-interface changes should be regression-tested.

---

## 9. Conclusion

Responsive and cross-browser testing was successfully completed for the current frontend implementation of the AI-Powered Study Notes Generator.

The application was tested across mobile, tablet, laptop and desktop viewport sizes and remained usable without significant layout problems.

Cross-browser testing was also completed using Google Chrome, Microsoft Edge and Mozilla Firefox.

No significant responsive design or browser compatibility defects were identified during this testing cycle.

Issue #55 is therefore considered successfully completed for the current frontend implementation.