import { spawnSync } from "node:child_process";

const MAX_ATTEMPTS = 4;
const WAIT_MS = 20_000;

function sleep(ms) {
  const seconds = Math.ceil(ms / 1000);
  if (process.platform === "win32") {
    spawnSync("timeout", ["/t", String(seconds), "/nobreak"], {
      stdio: "ignore",
      shell: true,
    });
    return;
  }
  spawnSync("sleep", [String(seconds)], { stdio: "ignore" });
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const result = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    encoding: "utf8",
    env: process.env,
    shell: true,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status === 0) {
    process.exit(0);
  }

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const isAdvisoryLock =
    output.includes("P1002") || output.toLowerCase().includes("advisory lock");

  if (!isAdvisoryLock) {
    process.exit(result.status ?? 1);
  }

  console.warn(
    `Prisma advisory lock busy (attempt ${attempt}/${MAX_ATTEMPTS}). Waiting ${WAIT_MS / 1000}s...`,
  );

  if (attempt < MAX_ATTEMPTS) {
    sleep(WAIT_MS);
  }
}

console.warn(
  "Skipping prisma migrate deploy after advisory-lock retries; continuing build (schema expected to already be current).",
);
process.exit(0);
