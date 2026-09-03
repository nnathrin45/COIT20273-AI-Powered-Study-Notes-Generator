# Member 1 – Accessibility Testing

**Project:** AI-Powered Study Notes Generator  
**Unit:** COIT20273  
**Member:** Christian Jeff Labaddan  
**Role:** UI/UX and Frontend Integration  
**Testing Date:** 2 September 2026  
**Related Issue:** #54 – Conduct accessibility testing

---

## 1. Purpose

The purpose of this testing was to evaluate the accessibility of the AI-Powered Study Notes Generator frontend using automated Lighthouse accessibility audits and manual keyboard-navigation testing.

Testing focused on semantic page structure, colour contrast, form accessibility, keyboard operation, focus behaviour and general accessibility of interactive controls.

---

## 2. Test Environment

- Frontend: React
- Browser: Google Chrome
- Automated testing tool: Chrome Lighthouse
- Lighthouse mode: Navigation
- Device: Desktop
- Category: Accessibility
- Manual testing: Keyboard-only interaction

---

## 3. Initial Lighthouse Results

| Page | Initial Score | Finding | Status |
|---|---:|---|---|
| Login | 97 | Missing main landmark | Improvement required |
| Register | 97 | Missing main landmark | Improvement required |
| Dashboard | 100 | No automated accessibility issues detected | PASS |
| Upload Material | 100 | No automated accessibility issues detected | PASS |
| Summary | 100 | No automated accessibility issues detected | PASS |
| Flashcards | 100 | No automated accessibility issues detected | PASS |
| Practice Quiz | 100 | No automated accessibility issues detected | PASS |
| Concept Explanation | 100 | No automated accessibility issues detected | PASS |
| Study Planner | 100 | No automated accessibility issues detected | PASS |
| Saved Materials | 100 | No automated accessibility issues detected | PASS |
| Progress | 95 | Insufficient foreground/background colour contrast | Improvement required |

---

## 4. Accessibility Issues Identified

### A11Y-01 – Login Missing Main Landmark

Lighthouse reported that the Login page did not contain a semantic main landmark.

The outer page container was changed from a standard `div` element to a semantic `main` element.

### A11Y-02 – Register Missing Main Landmark

The Register page had the same missing-main-landmark issue.

The outer page container was changed from a standard `div` element to a semantic `main` element.

### A11Y-03 – Progress Page Colour Contrast

Lighthouse identified insufficient contrast for recent-activity timestamps such as:

- Today
- Yesterday
- 2 days ago

The text colour was changed from:

`text-gray-400`

to:

`text-gray-600`

to provide stronger foreground/background contrast while retaining the secondary visual style.

---

## 5. Final Lighthouse Results

After implementing the accessibility fixes, Lighthouse accessibility testing was repeated.

| Page | Final Score | Result |
|---|---:|---|
| Login | 100 | PASS |
| Register | 100 | PASS |
| Dashboard | 100 | PASS |
| Upload Material | 100 | PASS |
| Summary | 100 | PASS |
| Flashcards | 100 | PASS |
| Practice Quiz | 100 | PASS |
| Concept Explanation | 100 | PASS |
| Study Planner | 100 | PASS |
| Saved Materials | 100 | PASS |
| Progress | 100 | PASS |

All tested frontend pages achieved a final Lighthouse Accessibility score of 100.

---

## 6. Manual Keyboard Accessibility Testing

Manual testing was performed using keyboard-only navigation.

The following keyboard controls were tested:

- `Tab`
- `Shift + Tab`
- `Enter`
- `Space`
- Arrow keys where applicable

The testing verified that:

- interactive controls can be reached using the keyboard;
- focus follows a logical order;
- visible focus indicators are provided;
- buttons can be activated using the keyboard;
- links can be activated using the keyboard;
- form controls can be accessed using the keyboard;
- select elements can be operated using keyboard controls;
- checkboxes can be toggled using the keyboard;
- disabled controls cannot be activated;
- keyboard focus does not become trapped;
- users can move backwards using `Shift + Tab`.

---

## 7. Pages Manually Tested

| Page | Keyboard Navigation | Focus Behaviour | Result |
|---|---|---|---|
| Login | Working | Logical and visible | PASS |
| Register | Working | Logical and visible | PASS |
| Dashboard | Working | Logical and visible | PASS |
| Upload Material | Working | Logical and visible | PASS |
| Summary | Working | Logical and visible | PASS |
| Flashcards | Working | Logical and visible | PASS |
| Practice Quiz | Working | Logical and visible | PASS |
| Concept Explanation | Working | Logical and visible | PASS |
| Study Planner | Working | Logical and visible | PASS |
| Saved Materials | Working | Logical and visible | PASS |
| Progress | Working | Logical and visible | PASS |

---

## 8. Accessibility Features Confirmed

Testing confirmed that the current frontend provides:

- semantic page landmarks;
- labelled form controls;
- accessible buttons and links;
- visible keyboard focus states;
- keyboard-operable forms;
- keyboard-operable checkboxes and select controls;
- appropriate error/status presentation;
- adequate foreground/background contrast;
- logical heading and page structure;
- protected disabled-control states.

---

## 9. Testing Limitation

Automated Lighthouse testing cannot identify every possible accessibility issue.

Manual keyboard testing was therefore performed in addition to Lighthouse.

Dedicated screen-reader testing was not included in this test cycle and may be considered as an additional future accessibility check if required.

Saved Materials and Progress currently contain temporary/sample frontend data and should be regression-tested after their final backend integrations are completed.

---

## 10. Conclusion

Accessibility testing identified three frontend issues:

1. Missing semantic main landmark on Login.
2. Missing semantic main landmark on Register.
3. Insufficient timestamp colour contrast on Progress.

All three issues were corrected.

After the changes, all eleven tested pages achieved a Lighthouse Accessibility score of 100.

Manual keyboard testing also confirmed that the tested frontend pages and interactive controls can be navigated and operated using the keyboard without keyboard traps.

Issue #54 accessibility testing is therefore considered successfully completed for the current frontend implementation.