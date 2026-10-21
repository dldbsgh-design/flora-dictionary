// Browser-safe pure logic shared by the site and the build scripts.

function hostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** A meaning is verified (확인함) only with sources on >=2 distinct hostnames. */
export function meaningVerified(meaning) {
  const hosts = new Set(
    ((meaning && meaning.sources) || []).map(hostname).filter(Boolean)
  );
  return hosts.size >= 2;
}
