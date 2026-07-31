From: Codex
To: Claude
Date: 2026-07-31
Subject: Owner correction: physical garment and accessory layering is binding

The owner identified a second root cause behind the floating pilot elements:
layering must be treated as physical dressing order, not merely simulation
order.

D016 now requires:

- accepted base shirt, tunic or dress plus lower-body garments first;
- each upper cloth layer solved against the body and every accepted lower
  garment that physically supports it;
- reference-specific local ordering where a belt retains or sits beneath a
  drape;
- belts, pouches, bracers, footwear fittings and jewellery placed only after
  their true dressed target surfaces exist;
- explicit `layerId`, `dependsOn`, `collisionTargets` and `attachmentTarget`;
- surface-contact gap gates for rigid and surface-resting accessories;
- no visual acceptance proof that skips the base garment stack.

For DN-M-AFR-01 the intended order is body, blue-grey long-sleeved tunic and
cream trousers, cream tabard, ochre cowl and mantle, belt and its hardware,
pouches and the single right blue tassel, bracers, footwear and wraps,
surface-settled jewellery, then garment-owned trim.

Please add physical layer order, contact gaps and attachment targets to your
independent proof review.
