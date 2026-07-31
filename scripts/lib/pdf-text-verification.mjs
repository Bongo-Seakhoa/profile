import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const INTERNATIONAL_PHONE_PATTERN = /\+\s?\d(?:[\s().-]*\d){7,}/u;

/** @param {string} value */
function phoneDigits(value) {
  return value.replace(/\D/gu, "");
}

/**
 * @param {string} pdfPath
 * @param {{ executable?: string }} [options]
 */
export async function extractPdfText(
  pdfPath,
  { executable = process.env.PDFTOTEXT_EXECUTABLE ?? "pdftotext" } = {},
) {
  const { stdout } = await execFileAsync(
    executable,
    ["-layout", "-enc", "UTF-8", pdfPath, "-"],
    {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    },
  );

  return stdout;
}

/**
 * @param {string} text
 * @param {{ minimumLength?: number, approvedPhoneDisplay: string }} options
 * @returns {string[]}
 */
export function findPublicPdfTextIssues(
  text,
  { minimumLength = 100, approvedPhoneDisplay },
) {
  if (!approvedPhoneDisplay) {
    throw new TypeError("approvedPhoneDisplay is required");
  }

  const issues = [];
  const normalizedText = text.replace(/\r\n?/gu, "\n");
  const approvedPhoneDigits = phoneDigits(approvedPhoneDisplay);

  if (normalizedText.trim().length < minimumLength) {
    issues.push(
      `selectable text is unexpectedly short (${normalizedText.trim().length} characters)`,
    );
  }
  if (!normalizedText.includes(approvedPhoneDisplay)) {
    issues.push("the approved public phone is missing from extracted PDF text");
  }
  const unapprovedPhone = [
    ...normalizedText.matchAll(
      new RegExp(INTERNATIONAL_PHONE_PATTERN.source, "gu"),
    ),
  ]
    .map(([value]) => ({ value, digits: phoneDigits(value) }))
    .find(({ digits }) => digits !== approvedPhoneDigits);
  if (unapprovedPhone !== undefined) {
    issues.push(
      `an unapproved phone-like number appears in extracted PDF text (${unapprovedPhone.value})`,
    );
  }
  if (normalizedText.includes("\u2014")) {
    issues.push("an em dash appears in extracted PDF text");
  }

  return issues;
}
