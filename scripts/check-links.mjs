import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checkerPath = resolve(fileURLToPath(import.meta.url));
const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

// Every file the static site publishes or keeps in the repository, scanned for
// private-data patterns. The checker itself is exempt so its own patterns do
// not produce false positives.
const textExtensions = new Set([
  ".html",
  ".css",
  ".js",
  ".svg",
  ".xml",
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
]);
const structuredExtensions = new Set([".json", ".yaml", ".yml", ".toml"]);
const textFiles = [];

// .env and .env.* have no conventional extension; match them by basename.
function isEnvFile(name) {
  return name === ".env" || name.startsWith(".env.");
}

function walk(directory) {
  for (const name of readdirSync(directory)) {
    if (name === ".git") continue;
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path);
    else {
      const ext = extname(name).toLowerCase();
      if (textExtensions.has(ext) || isEnvFile(name)) textFiles.push(path);
    }
  }
}

// Structured data files carry key:value personal fields; prose does not.
function isStructuredFile(file) {
  const name = basename(file);
  const ext = extname(name).toLowerCase();
  return structuredExtensions.has(ext) || isEnvFile(name);
}

function localTarget(href) {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return null;
  const target = clean.startsWith("/") ? join(root, clean.slice(1)) : null;
  if (!target) return null;
  if (clean.endsWith("/")) return join(target, "index.html");
  return target;
}

walk(root);

const errors = [];
const requiredPages = [
  "index.html",
  "interests/index.html",
  "skills/index.html",
  "projects/index.html",
  "projects/looper/index.html",
  "projects/search-x/index.html",
  "projects/token-atlas/index.html",
  "zh/index.html",
  "zh/interests/index.html",
  "zh/skills/index.html",
  "zh/projects/index.html",
  "zh/projects/search-x/index.html",
  "zh/projects/token-atlas/index.html",
  "zh/projects/looper/index.html",
];

function pageUrl(relative) {
  if (relative === "index.html") return "https://zoeimport.github.io/";
  return `https://zoeimport.github.io/${relative.replace(/\/index\.html$/, "")}/`;
}

function mirrorRelative(relative) {
  if (relative === "index.html") return "zh/index.html";
  if (relative.startsWith("zh/")) {
    const rest = relative.slice(3);
    return rest === "index.html" ? "index.html" : rest;
  }
  return `zh/${relative}`;
}

// Privacy patterns target concrete secret/data shapes, not descriptive words,
// so policy documents (which may mention "phone number" or "access token")
// do not false-positive.
const privacyPatterns = [
  { label: "local macOS home path", re: /\/Users\/[^\s<>"']+/ },
  { label: "local POSIX home path", re: /\b\/home\/[a-z0-9._-]+\//i },
  { label: "local system path", re: /\/var\/lib\/|\/private\/|\/etc\// },
  { label: "phone number", re: /(?:^|[^0-9])1[3-9][0-9]{9}(?:[^0-9]|$)/ },
  { label: "email address", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/ },
  { label: "wxid", re: /\bwxid_[A-Za-z0-9_-]{4,}\b/i },
  { label: "bearer token", re: /Bearer\s+[A-Za-z0-9._~-]{8,}/i },
  { label: "env secret name", re: /\b[A-Z][A-Z0-9_]{2,}_(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|ACCESS_KEY|PRIVATE_KEY|CLIENT_SECRET)\b/ },
  { label: "OpenAI-style key", re: /\bsk-[A-Za-z0-9]{16,}\b/ },
  { label: "GitHub token", re: /\bghp_[A-Za-z0-9]{20,}\b/ },
];

// Structured personal fields only exist as keys in data files
// (.json/.yaml/.yml/.toml/.env), so only keys are inspected, never values.
// JSON is parsed and walked; the other formats are scanned for line-start
// keys (quoted and dotted included). Keys are normalized across camelCase,
// snake_case, hyphens, spaces, and dots, then exact-matched against aliases,
// so key-like text inside a value or prose naming a category never matches.
const personalFieldAliases = {
  phone: ["phone", "mobile", "phone_number", "手机号", "电话"],
  email: ["email", "email_address", "邮箱", "电子邮箱"],
  wechat: ["wechat", "wechat_id", "weixin", "weixin_id", "wxid", "微信", "微信号"],
  age: ["age", "年龄"],
  gender: ["gender", "sex", "性别"],
  "native place": ["native_place", "hometown", "籍贯", "家乡"],
  "job-seeking status": ["job_seeking_status", "job_search_status", "求职状态"],
  "preferred city": ["preferred_city", "expected_city", "target_city", "期望城市", "意向城市"],
};
const normalizeKey = (key) => key.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, "");
const personalFieldSets = Object.fromEntries(
  Object.entries(personalFieldAliases).map(([label, keys]) => [
    label,
    new Set(keys.map(normalizeKey)),
  ])
);

function matchPersonalField(key) {
  const normalized = normalizeKey(key);
  for (const [label, set] of Object.entries(personalFieldSets)) {
    if (set.has(normalized)) return label;
  }
  return null;
}

function jsonKeyScan(value, labels) {
  if (Array.isArray(value)) {
    for (const item of value) jsonKeyScan(item, labels);
    return;
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      const label = matchPersonalField(key);
      if (label) labels.add(label);
      jsonKeyScan(value[key], labels);
    }
  }
}

function lineStartKeyScan(content, labels) {
  for (let line of content.split("\n")) {
    line = line.trim();
    if (line.startsWith("export ")) line = line.slice(7).trim();
    if (line.startsWith("- ")) line = line.slice(2).trim();
    if (!line || line[0] === "#" || line[0] === ";" || line[0] === "[") continue;
    const yamlSep = line.search(/:(?:\s|$)/);
    const eqSep = line.indexOf("=");
    const cut = yamlSep === -1 ? eqSep : eqSep === -1 ? yamlSep : Math.min(yamlSep, eqSep);
    if (cut === -1) continue;
    let key = line.slice(0, cut).trim();
    if (key.length >= 2 && key[0] === key[key.length - 1] && (key[0] === '"' || key[0] === "'")) {
      key = key.slice(1, -1);
    }
    const label = matchPersonalField(key);
    if (label) labels.add(label);
  }
}

for (const file of textFiles) {
  if (file === checkerPath) continue;
  const content = readFileSync(file, "utf8");
  const relative = file.slice(root.length + 1);
  for (const { label, re } of privacyPatterns) {
    if (re.test(content)) errors.push(`${relative}: matched private-data pattern (${label})`);
  }
  if (isStructuredFile(file)) {
    const labels = new Set();
    if (extname(file).toLowerCase() === ".json") {
      try {
        jsonKeyScan(JSON.parse(content), labels);
      } catch {
        lineStartKeyScan(content, labels);
      }
    } else {
      lineStartKeyScan(content, labels);
    }
    for (const label of labels) {
      errors.push(`${relative}: matched structured personal field (${label})`);
    }
  }
}

const htmlFiles = textFiles.filter((file) => file.endsWith(".html"));

for (const page of requiredPages) {
  if (!existsSync(join(root, page))) errors.push(`missing required page ${page}`);
}

function validateTagBalance(html, relative) {
  const stack = [];
  const source = html.replace(/<!--[\s\S]*?-->/g, "");

  for (const match of source.matchAll(/<\/?([a-zA-Z][\w:-]*)(?:\s[^<>]*?)?\s*\/?>/g)) {
    const raw = match[0];
    const tag = match[1].toLowerCase();
    if (voidElements.has(tag) || raw.endsWith("/>")) continue;

    if (raw.startsWith("</")) {
      const open = stack.pop();
      if (open !== tag) {
        errors.push(`${relative}: closing </${tag}> does not match <${open ?? "none"}>`);
        return;
      }
    } else {
      stack.push(tag);
    }
  }

  if (stack.length) errors.push(`${relative}: unclosed tags ${stack.join(", ")}`);
}

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const relative = file.slice(root.length + 1);
  if (!/^<!doctype html>/i.test(html)) errors.push(`${relative}: missing HTML5 doctype`);
  if (!/<html\s+lang="[^"]+"/i.test(html)) errors.push(`${relative}: missing document language`);
  validateTagBalance(html, relative);
  const h1Count = (html.match(/<h1(?:\s|>)/g) || []).length;
  if (h1Count !== 1) errors.push(`${relative}: expected one h1, found ${h1Count}`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${relative}: missing title`);
  if (relative !== "404.html" && !/rel="canonical"/.test(html)) {
    errors.push(`${relative}: missing canonical link`);
  }
  if (relative !== "404.html" && !/href="https:\/\/github\.com\/ZoeImport(?:[?"/])/.test(html)) {
    errors.push(`${relative}: missing GitHub profile backlink`);
  }

  if (relative !== "404.html") {
    const mirror = mirrorRelative(relative);
    const hasMirror = existsSync(join(root, mirror));

    // Bilingual pairs must declare lang alternates; legacy single-language
    // pages (e.g. the frozen Looper case study) are exempt.
    if (hasMirror) {
      if (!/hreflang="en"/.test(html)) errors.push(`${relative}: missing hreflang="en" alternate`);
      if (!/hreflang="zh-CN"/.test(html)) errors.push(`${relative}: missing hreflang="zh-CN" alternate`);
      if (!/hreflang="x-default"/.test(html)) errors.push(`${relative}: missing hreflang="x-default"`);

      const isZh = relative === "zh/index.html" || relative.startsWith("zh/");
      const mirrorUrl = pageUrl(mirror);
      const mirrorPattern = isZh
        ? /rel="alternate" hreflang="en" href="([^"]+)"/
        : /rel="alternate" hreflang="zh-CN" href="([^"]+)"/;
      const mirrorMatch = html.match(mirrorPattern);
      if (!mirrorMatch) errors.push(`${relative}: missing ${isZh ? "en" : "zh-CN"} mirror alternate`);
      else if (mirrorMatch[1] !== mirrorUrl) {
        errors.push(`${relative}: mirror alternate ${mirrorMatch[1]} does not match expected ${mirrorUrl}`);
      }
    }

    for (const scriptMatch of html.matchAll(/<script\b([^>]*)>/g)) {
      const src = scriptMatch[1].match(/src="([^"]+)"/);
      if (src && src[1] !== "/assets/home.js") {
        errors.push(`${relative}: unexpected script src ${src[1]}`);
      } else if (!src) {
        errors.push(`${relative}: inline script is not allowed (only /assets/home.js may enhance pages)`);
      }
    }
  }

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|tel:|#)/.test(href)) continue;
    const target = localTarget(href);
    if (target && !existsSync(target)) errors.push(`${relative}: broken local reference ${href}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  `Validated ${htmlFiles.length} HTML files and scanned ${textFiles.length} text files: HTML5 structure, balanced tags, titles, h1s, canonical URLs, local links, assets, and private-data boundaries.`
);
