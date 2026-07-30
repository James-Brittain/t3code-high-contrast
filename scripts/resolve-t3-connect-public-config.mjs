#!/usr/bin/env node

import * as NodeChildProcess from "node:child_process";
import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

const npmMetadataUrl =
  process.env.T3CODE_CONFIG_NPM_METADATA_URL?.trim() || "https://registry.npmjs.org/t3/latest";

function fail(message) {
  throw new Error(`[t3-connect-config] ${message}`);
}

async function fetchOk(url, label) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "t3code-high-contrast-release",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    fail(`${label} returned HTTP ${response.status}.`);
  }
  return response;
}

function extractUniqueValue(sources, name) {
  const escapedName = name.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(`${escapedName}\\s*:\\s*[\`"']([^\`"']+)[\`"']`, "gu");
  const matches = new Set();

  for (const source of sources) {
    for (const match of source.matchAll(pattern)) {
      const value = match[1]?.trim();
      if (value) matches.add(value);
    }
  }

  if (matches.size !== 1) {
    fail(`Expected exactly one ${name} value in the published t3 client, found ${matches.size}.`);
  }
  return [...matches][0];
}

function validateConfig(config) {
  if (!/^pk_(?:live|test)_[A-Za-z0-9_-]+$/u.test(config.clerkPublishableKey)) {
    fail("The Clerk publishable key has an unexpected format.");
  }
  if (!/^[A-Za-z0-9._-]+$/u.test(config.clerkJwtTemplate)) {
    fail("The Clerk JWT template has an unexpected format.");
  }
  if (!/^[A-Za-z0-9_-]+$/u.test(config.clerkCliOauthClientId)) {
    fail("The Clerk CLI OAuth client ID has an unexpected format.");
  }

  const relayUrl = new URL(config.relayUrl);
  if (
    relayUrl.protocol !== "https:" ||
    relayUrl.username ||
    relayUrl.password ||
    relayUrl.search ||
    relayUrl.hash ||
    relayUrl.pathname !== "/"
  ) {
    fail("The relay URL is not a secure HTTPS origin.");
  }
}

function decodeClerkFrontendHost(publishableKey) {
  const encoded = publishableKey.replace(/^pk_(?:live|test)_/u, "");
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  if (!decoded.endsWith("$")) {
    fail("The Clerk publishable key did not decode to a frontend host.");
  }
  const host = decoded.slice(0, -1);
  if (!/^[A-Za-z0-9.-]+$/u.test(host)) {
    fail("The Clerk publishable key decoded to an invalid frontend host.");
  }
  return host;
}

function emitOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT?.trim();
  if (outputPath) {
    NodeFS.appendFileSync(outputPath, `${name}=${value}\n`);
  }
}

const metadataResponse = await fetchOk(npmMetadataUrl, "npm metadata");
const metadata = await metadataResponse.json();
const packageVersion = String(metadata.version ?? "").trim();
const tarballUrl = String(metadata.dist?.tarball ?? "").trim();
const integrity = String(metadata.dist?.integrity ?? "").trim();

if (!packageVersion || !tarballUrl || !integrity.startsWith("sha512-")) {
  fail("The npm metadata is missing a version, tarball URL, or SHA-512 integrity.");
}

const tarballResponse = await fetchOk(tarballUrl, "npm tarball");
const tarball = Buffer.from(await tarballResponse.arrayBuffer());
const actualIntegrity = `sha512-${NodeCrypto.createHash("sha512")
  .update(tarball)
  .digest("base64")}`;
if (actualIntegrity !== integrity) {
  fail("The downloaded npm tarball failed its SHA-512 integrity check.");
}

const temporaryDirectory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-connect-config-"));
const tarballPath = NodePath.join(temporaryDirectory, "t3.tgz");
NodeFS.writeFileSync(tarballPath, tarball);

const entries = NodeChildProcess.execFileSync("tar", ["-tzf", tarballPath], { encoding: "utf8" })
  .split("\n")
  .filter((entry) => /^package\/dist\/client\/assets\/index-[^/]+\.js$/u.test(entry));

if (entries.length === 0) {
  fail("The published t3 package has no production client index asset.");
}

const clientSources = entries.map((entry) =>
  NodeChildProcess.execFileSync("tar", ["-xOzf", tarballPath, entry], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }),
);

const config = {
  clerkPublishableKey: extractUniqueValue(clientSources, "VITE_CLERK_PUBLISHABLE_KEY"),
  clerkJwtTemplate: extractUniqueValue(clientSources, "VITE_CLERK_JWT_TEMPLATE"),
  clerkCliOauthClientId: extractUniqueValue(clientSources, "VITE_CLERK_CLI_OAUTH_CLIENT_ID"),
  relayUrl: extractUniqueValue(clientSources, "VITE_T3CODE_RELAY_URL"),
};
validateConfig(config);

const relayResponse = await fetchOk(new URL("/openapi.json", config.relayUrl), "T3 Connect relay");
const relayDocument = await relayResponse.json();
if (relayDocument.info?.title !== "T3 Code Relay API") {
  fail("The configured relay did not identify itself as the T3 Code Relay API.");
}

const clerkFrontendHost = decodeClerkFrontendHost(config.clerkPublishableKey);
await fetchOk(`https://${clerkFrontendHost}/v1/environment`, "Clerk frontend API");

emitOutput("clerk_publishable_key", config.clerkPublishableKey);
emitOutput("clerk_jwt_template", config.clerkJwtTemplate);
emitOutput("clerk_cli_oauth_client_id", config.clerkCliOauthClientId);
emitOutput("relay_url", config.relayUrl);
emitOutput("source_package_version", packageVersion);
emitOutput("source_tarball_url", tarballUrl);

const summaryPath = process.env.GITHUB_STEP_SUMMARY?.trim();
if (summaryPath) {
  NodeFS.appendFileSync(
    summaryPath,
    [
      "### T3 Connect public configuration",
      "",
      `Resolved from the integrity-checked official \`t3@${packageVersion}\` npm package.`,
      "",
      `- \`T3CODE_CLERK_PUBLISHABLE_KEY=${config.clerkPublishableKey}\``,
      `- \`T3CODE_CLERK_JWT_TEMPLATE=${config.clerkJwtTemplate}\``,
      `- \`T3CODE_CLERK_CLI_OAUTH_CLIENT_ID=${config.clerkCliOauthClientId}\``,
      `- \`T3CODE_RELAY_URL=${config.relayUrl}\``,
      "",
    ].join("\n"),
  );
}

console.log(
  JSON.stringify(
    {
      sourcePackage: `t3@${packageVersion}`,
      ...config,
      clerkFrontendHost,
    },
    null,
    2,
  ),
);
