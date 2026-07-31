export const RELEASE_BUDGET_LIMITS = Object.freeze({
  maximumCompressedHtmlPerRoute: 100 * 1024,
  maximumCompressedCssTotal: 60 * 1024,
  maximumCompressedJavaScriptTotal: 80 * 1024,
  maximumHeroAvif: 450 * 1024,
  maximumSocialCard: 100 * 1024,
  maximumPdf: 750 * 1024,
  maximumStaticRelease: 15 * 1024 * 1024,
  maximumWholeRelease: 768 * 1024 * 1024,
});

export const RELEASE_SCOPE_RESERVES = Object.freeze({
  staticViewBytes: 15 * 1024 * 1024,
  characterCount: 15,
  maximumCharacterPackageBytes: 24 * 1024 * 1024,
  environmentCount: 16,
  maximumEnvironmentPackageBytes: 16 * 1024 * 1024,
  effectsDecodersAndRuntimeBytes: 128 * 1024 * 1024,
});

export const REQUIRED_COMPLETE_SCOPE_BYTES =
  RELEASE_SCOPE_RESERVES.staticViewBytes +
  RELEASE_SCOPE_RESERVES.characterCount *
    RELEASE_SCOPE_RESERVES.maximumCharacterPackageBytes +
  RELEASE_SCOPE_RESERVES.environmentCount *
    RELEASE_SCOPE_RESERVES.maximumEnvironmentPackageBytes +
  RELEASE_SCOPE_RESERVES.effectsDecodersAndRuntimeBytes;
