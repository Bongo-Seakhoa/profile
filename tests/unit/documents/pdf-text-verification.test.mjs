import { describe, expect, it } from "vitest";

import { findPublicPdfTextIssues } from "../../../scripts/lib/pdf-text-verification.mjs";

const approvedPhoneDisplay = "+27 73 590 7659";
const safeDocumentText = `
Bongo Seakhoa
Data systems, practical analysis and reliable delivery.
Experience includes projects completed in 2024 and 2025.
LinkedIn and email contact paths remain available.
${approvedPhoneDisplay}
`;

/** @param {string} text */
function findIssues(text) {
  return findPublicPdfTextIssues(text, { approvedPhoneDisplay });
}

describe("public PDF extracted-text verification", () => {
  it("requires the approved business telephone number", () => {
    expect(findIssues(safeDocumentText)).toEqual([]);
    expect(
      findIssues(safeDocumentText.replace(approvedPhoneDisplay, "")),
    ).toContain("the approved public phone is missing from extracted PDF text");
  });

  it("rejects arbitrary phone drift after text extraction", () => {
    expect(
      findIssues(`${safeDocumentText}\nTelephone: +99 12 345 6789`),
    ).toContain(
      "an unapproved phone-like number appears in extracted PDF text (+99 12 345 6789)",
    );
  });

  it("rejects public copy containing an em dash", () => {
    expect(
      findIssues(`${safeDocumentText}\nReliable systems — clearly.`),
    ).toContain("an em dash appears in extracted PDF text");
  });

  it("fails closed when a PDF yields too little selectable text", () => {
    expect(findIssues("Bongo")).toContain(
      "selectable text is unexpectedly short (5 characters)",
    );
  });
});
