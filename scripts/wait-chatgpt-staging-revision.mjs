const origin = requireCanonicalOrigin(process.env.STAGING_ORIGIN);
const expectedRevision = requireSourceRevision(process.env.LIVE_SOURCE_REVISION);
const deadlineAt = Date.now() + 180_000;
const requiredConsecutiveMatches = 3;
let consecutiveMatches = 0;

while (Date.now() < deadlineAt && consecutiveMatches < requiredConsecutiveMatches) {
  const observed = await observeRevision();
  consecutiveMatches = observed === expectedRevision ? consecutiveMatches + 1 : 0;
  if (consecutiveMatches < requiredConsecutiveMatches) await wait(2_000);
}

if (consecutiveMatches !== requiredConsecutiveMatches) {
  console.error("Staging container did not converge to the expected source revision within 180 seconds.");
  process.exit(1);
}

console.log(`Staging container converged to exact source revision ${expectedRevision}.`);

async function observeRevision() {
  try {
    const response = await fetch(`${origin}/readyz`, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const observed = response.status === 200
      ? response.headers.get("x-tax-lien-source-revision")
      : null;
    await response.body?.cancel();
    return observed;
  } catch {
    return null;
  }
}

function requireCanonicalOrigin(value) {
  if (typeof value !== "string" || value.length === 0) failConfiguration();
  let url;
  try {
    url = new URL(value);
  } catch {
    failConfiguration();
  }
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !/^tax-lien-chatgpt-staging\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.workers\.dev$/iu.test(url.hostname)
  ) {
    failConfiguration();
  }
  return url.origin;
}

function requireSourceRevision(value) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/u.test(value)) failConfiguration();
  return value;
}

function failConfiguration() {
  console.error("Staging revision convergence configuration is invalid.");
  process.exit(1);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
