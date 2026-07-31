# A010: Asset-linkage filename revalidation

**Date:** 2026-07-31  
**Owner:** Codex  
**Source:** `Anzania_Asset_Linkage_Actual_Filenames_v2.0.xlsx`  
**Source SHA-256:** `574c7e97139da514b12bf53b44d7a3d9dd2857cbfbddccfd8330ab5b7eb7b65d`

## Scope

The owner requested a second filename audit while the broader implementation
continued. This pass re-imported the workbook with the JavaScript spreadsheet
runtime, enumerated the current reference library, compared authoritative
filename cells case-sensitively, recomputed registry evidence from the PNG
files, scanned formula results, and rendered every sheet for visual review.

Conceptual filenames and recommended production aliases are design metadata,
not claims that same-named source files exist. They were therefore excluded
from the disk-existence gate. Only columns explicitly identifying actual
uploaded files were treated as authoritative filenames.

## Results

| Gate | Result |
| --- | ---: |
| Workbook sheets imported | 6 |
| Authoritative actual-file cells checked | 51 |
| Exact case-sensitive filename matches | 51 |
| Missing, misspelled or case-drifted actual filenames | 0 |
| Registry rows checked against source PNGs | 19 |
| Width mismatches | 0 |
| Height mismatches | 0 |
| Byte-size mismatches | 0 |
| SHA-256 mismatches | 0 |
| Non-`VERIFIED` registry states | 0 |
| Formula-error matches | 0 |
| Sheets rendered and visually reviewed | 6 |

The 51 filename checks cover:

- 16 outer and inner filenames in `Location Pairings - Corrected`;
- 16 outer and inner filenames in `Narrative Flow`;
- 19 uploaded filenames in `Actual Asset Registry`.

The registry evidence was recomputed from the current files rather than trusted
from workbook values. Every recorded dimension, byte size and digest matches
the file currently present in the reference library.

## Decision

No filename edit is required. The workbook remains the current verified v2.0
source, and the archived pre-audit copy remains untouched. A later filename
change must rerun the same exact-name, dimension, size and hash gates before it
can replace this evidence.
