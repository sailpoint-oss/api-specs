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
