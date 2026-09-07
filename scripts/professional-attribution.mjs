// Owner correction, 8 September 2026: prevent reintroduction of a misattributed qualification.
export function assertProfessionalAttribution(text, source) {
  if (
    /microbiolog|biochem|north-west-university-bsc|completed science degree/i.test(
      text,
    )
  ) {
    throw new Error(
      source + ": contains an owner-rejected education attribution",
    );
  }
}
