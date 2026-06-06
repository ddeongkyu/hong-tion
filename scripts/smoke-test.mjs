const apiUrl = process.env.SMOKE_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const accessToken = process.env.SMOKE_ACCESS_TOKEN;
const workspaceId = process.env.SMOKE_WORKSPACE_ID;

const checks = [
  { name: "API health", url: `${apiUrl}/api/health` },
  { name: "DB health", url: `${apiUrl}/api/health/db` },
];

if (accessToken) {
  checks.push({
    headers: { authorization: `Bearer ${accessToken}` },
    name: "Authenticated workspaces",
    url: `${apiUrl}/api/workspaces`,
  });
}

if (accessToken && workspaceId) {
  checks.push({
    headers: { authorization: `Bearer ${accessToken}` },
    name: "Workspace pages",
    url: `${apiUrl}/api/workspaces/${workspaceId}/pages`,
  });
}

let failed = false;

for (const check of checks) {
  try {
    const response = await fetch(check.url, {
      headers: check.headers ?? {},
    });

    if (!response.ok) {
      failed = true;
      console.error(`FAIL ${check.name}: ${response.status} ${await response.text()}`);
      continue;
    }

    console.log(`OK   ${check.name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) {
  process.exit(1);
}
