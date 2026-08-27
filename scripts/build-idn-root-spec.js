#!/usr/bin/env node
/**
 * build-idn-root-spec.js
 *
 * Assembles idn/sailpoint-api.root.yaml from all idn/apis/{partition}/openapi.yaml
 * files, then bundles it into idn/sailpoint-api.yaml via redocly.
 *
 * The root spec header (openapi, info, servers, security) is preserved from the
 * existing sailpoint-api.root.yaml. Tags and paths are regenerated from the partitions.
 */

"use strict";

const fs            = require("fs");
const path          = require("path");
const { spawnSync } = require("child_process");
const yaml          = require("js-yaml");

const REPO_ROOT   = path.resolve(__dirname, "..");
const IDN_DIR     = path.join(REPO_ROOT, "idn");
const APIS_DIR    = path.join(IDN_DIR, "apis");
const ROOT_SPEC   = path.join(IDN_DIR, "sailpoint-api.root.yaml");
const TARGET_SPEC = path.join(IDN_DIR, "sailpoint-api.yaml");

const SECURITY_SCHEMES = {
  userAuth: {
    type: "oauth2",
    "x-displayName": "Personal Access Token",
    description:
      "OAuth2 Bearer token (JWT) generated using either a [personal access token (PAT)](https://developer.sailpoint.com/docs/api/authentication/#generate-a-personal-access-token) or through the [authorization code flow](https://developer.sailpoint.com/docs/api/authentication/#request-access-token-with-authorization-code-grant-flow).\n\nPersonal access tokens are associated with a user in Identity Security Cloud and relies on the user's [user level](https://documentation.sailpoint.com/saas/help/common/users/index.html) (ex. Admin, Helpdesk, etc.) to determine a base level of access.\n\nSee [Identity Security Cloud REST API Authentication](https://developer.sailpoint.com/docs/api/authentication/) for more information.\n",
    flows: {
      clientCredentials: {
        tokenUrl: "https://example-tenant.api.identitynow.com/oauth/token",
        scopes: {
          "sp:scopes:default": "default scope",
          "sp:scopes:all": "access to all scopes",
        },
      },
      authorizationCode: {
        authorizationUrl: "https://example-tenant.login.sailpoint.com/oauth/authorize",
        tokenUrl: "https://example-tenant.api.identitynow.com/oauth/token",
        scopes: {
          "sp:scopes:default": "default scope",
          "sp:scopes:all": "access to all scopes",
        },
      },
    },
  },
  applicationAuth: {
    type: "oauth2",
    "x-displayName": "Client Credentials",
    description:
      "OAuth2 Bearer token (JWT) generated using [client credentials flow](https://developer.sailpoint.com/docs/api/authentication/#request-access-token-with-client-credentials-grant-flow).\n\nClient credentials refers to tokens that are not associated with a user in Identity Security Cloud.\n\nSee [Identity Security Cloud REST API Authentication](https://developer.sailpoint.com/docs/api/authentication/) for more information.\n",
    flows: {
      clientCredentials: {
        tokenUrl: "https://example-tenant.api.identitynow.com/oauth/token",
        scopes: {
          "sp:scopes:default": "default scope",
          "sp:scopes:all": "access to all scopes",
        },
      },
    },
  },
};

function buildRootSpec() {
  const existing = yaml.load(fs.readFileSync(ROOT_SPEC, "utf8"));

  const root = {
    openapi: existing.openapi,
    info:    existing.info,
    servers: existing.servers,
  };
  if (existing.security) root.security = existing.security;

  const allTags  = [];
  const seenTags = new Set();
  const allPaths = {};

  const partitions = fs.readdirSync(APIS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();

  for (const partitionName of partitions) {
    const openapiFile = path.join(APIS_DIR, partitionName, "openapi.yaml");
    if (!fs.existsSync(openapiFile)) continue;

    const part = yaml.load(fs.readFileSync(openapiFile, "utf8"));

    for (const tag of part.tags || []) {
      if (!seenTags.has(tag.name)) {
        allTags.push(tag);
        seenTags.add(tag.name);
      }
    }

    for (const [pathKey, pathValue] of Object.entries(part.paths || {})) {
      if (pathValue && pathValue.$ref) {
        const ref = pathValue.$ref.replace(/^\.\//, "");
        allPaths[pathKey] = { $ref: `./apis/${partitionName}/${ref}` };
      } else {
        allPaths[pathKey] = pathValue;
      }
    }
  }

  root.tags  = allTags;
  root.paths = allPaths;
  root.components = {
    ...(existing.components || {}),
    securitySchemes: SECURITY_SCHEMES,
  };

  fs.writeFileSync(ROOT_SPEC, yaml.dump(root, { lineWidth: -1, noRefs: true }), "utf8");
  console.log(`Written idn/sailpoint-api.root.yaml (${Object.keys(allPaths).length} paths, ${allTags.length} tags)`);
}

function bundleSpec() {
  const result = spawnSync("redocly", ["bundle", ROOT_SPEC, "-o", TARGET_SPEC], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(`[ERROR] redocly bundle failed:\n${result.stderr}`);
    process.exit(1);
  }
  const sizeKb = Math.round(fs.statSync(TARGET_SPEC).size / 1024);
  console.log(`Written idn/sailpoint-api.yaml (${sizeKb} KB)`);
}

buildRootSpec();
bundleSpec();
