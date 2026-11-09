/**
 * Lit docs/rag/*.md → lib/help/generated-catalog.ts
 * Usage : node scripts/sync-help-catalog.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ragDir = path.join(root, "docs", "rag");
const outFile = path.join(root, "lib", "help", "generated-catalog.ts");

function parseSimpleYaml(block) {
  const lines = block.replace(/\r\n/g, "\n").split("\n");
  const data = {};
  let i = 0;

  function parseValue(raw) {
    const v = raw.trim();
    if (v === "") return "";
    if (/^-?\d+$/.test(v)) return Number(v);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      return v.slice(1, -1);
    }
    return v;
  }

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i += 1;
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyMatch) {
      i += 1;
      continue;
    }
    const key = keyMatch[1];
    const rest = keyMatch[2];

    if (rest !== "") {
      data[key] = parseValue(rest);
      i += 1;
      continue;
    }

    // Nested object or list
    i += 1;
    if (i < lines.length && /^\s+-\s/.test(lines[i])) {
      const list = [];
      while (i < lines.length && /^\s+-\s/.test(lines[i])) {
        const itemLine = lines[i];
        const inline = itemLine.replace(/^\s+-\s*/, "");
        if (inline.includes(":")) {
          const obj = {};
          const [ik, ...iv] = inline.split(":");
          obj[ik.trim()] = parseValue(iv.join(":"));
          i += 1;
          while (i < lines.length && /^\s{4,}[A-Za-z0-9_]+:/.test(lines[i])) {
            const nested = lines[i].trim();
            const [nk, ...nv] = nested.split(":");
            const nkey = nk.trim();
            const nrest = nv.join(":").trim();
            if (nrest === "" && i + 1 < lines.length && /^\s+-\s/.test(lines[i + 1])) {
              i += 1;
              const arr = [];
              while (i < lines.length && /^\s+-\s/.test(lines[i])) {
                arr.push(parseValue(lines[i].replace(/^\s+-\s*/, "")));
                i += 1;
              }
              obj[nkey] = arr;
            } else {
              obj[nkey] = parseValue(nrest);
              i += 1;
            }
          }
          list.push(obj);
        } else {
          list.push(parseValue(inline));
          i += 1;
        }
      }
      data[key] = list;
      continue;
    }

    if (i < lines.length && /^\s+[A-Za-z0-9_]+:/.test(lines[i])) {
      const obj = {};
      while (i < lines.length && /^\s+[A-Za-z0-9_]+:/.test(lines[i])) {
        const nested = lines[i].trim();
        const [nk, ...nv] = nested.split(":");
        obj[nk.trim()] = parseValue(nv.join(":"));
        i += 1;
      }
      data[key] = obj;
      continue;
    }
  }

  return data;
}

function splitLocaleBody(body) {
  const text = body.replace(/\r\n/g, "\n").trim();
  const frMatch = text.match(/##\s*FR\s*\n([\s\S]*?)(?=\n##\s*EN\b|$)/i);
  const enMatch = text.match(/##\s*EN\s*\n([\s\S]*)$/i);
  return {
    fr: (frMatch?.[1] ?? "").trim(),
    en: (enMatch?.[1] ?? "").trim(),
  };
}

function parseSections(localeBody) {
  const chunks = localeBody.split(/\n(?=###\s+)/);
  const sections = [];
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const headingMatch = trimmed.match(/^###\s+(.+)\n?([\s\S]*)$/);
    if (!headingMatch) continue;
    const heading = headingMatch[1].trim();
    const content = headingMatch[2].trim();
    const paragraphs = [];
    const bullets = [];
    let para = [];
    for (const line of content.split("\n")) {
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (bullet) {
        if (para.length) {
          paragraphs.push(para.join(" ").trim());
          para = [];
        }
        bullets.push(bullet[1].trim());
        continue;
      }
      if (!line.trim()) {
        if (para.length) {
          paragraphs.push(para.join(" ").trim());
          para = [];
        }
        continue;
      }
      para.push(line.trim());
    }
    if (para.length) paragraphs.push(para.join(" ").trim());
    sections.push({ heading, paragraphs, bullets });
  }
  return sections;
}

function mergeSections(frSections, enSections) {
  const max = Math.max(frSections.length, enSections.length);
  const out = [];
  for (let i = 0; i < max; i += 1) {
    const fr = frSections[i] ?? { heading: "", paragraphs: [], bullets: [] };
    const en = enSections[i] ?? { heading: "", paragraphs: [], bullets: [] };
    const paraCount = Math.max(fr.paragraphs.length, en.paragraphs.length);
    const paragraphs = [];
    for (let p = 0; p < paraCount; p += 1) {
      paragraphs.push({
        fr: fr.paragraphs[p] ?? "",
        en: en.paragraphs[p] ?? "",
      });
    }
    const bulletCount = Math.max(fr.bullets.length, en.bullets.length);
    const bullets = [];
    for (let b = 0; b < bulletCount; b += 1) {
      bullets.push({
        fr: fr.bullets[b] ?? "",
        en: en.bullets[b] ?? "",
      });
    }
    out.push({
      heading: { fr: fr.heading, en: en.heading || fr.heading },
      paragraphs,
      ...(bullets.length ? { bullets } : {}),
    });
  }
  return out;
}

function parseMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fm) {
    throw new Error(`Frontmatter manquant : ${path.basename(filePath)}`);
  }
  const meta = parseSimpleYaml(fm[1]);
  const locales = splitLocaleBody(fm[2]);
  const sections = mergeSections(
    parseSections(locales.fr),
    parseSections(locales.en),
  );

  const routes = (meta.routes ?? []).map((r) => {
    if (typeof r === "string") return { path: r };
    const rule = { path: r.path };
    if (r.tab) rule.tab = r.tab;
    if (Array.isArray(r.excludeLast) && r.excludeLast.length) {
      rule.excludeLast = r.excludeLast;
    }
    return rule;
  });

  return {
    id: meta.id,
    source: `docs/rag/${path.basename(filePath)}`,
    priority: Number(meta.priority ?? 0),
    routes,
    title: {
      fr: meta.title?.fr ?? meta.id,
      en: meta.title?.en ?? meta.title?.fr ?? meta.id,
    },
    sections,
  };
}

function main() {
  const files = fs
    .readdirSync(ragDir)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .sort();

  const articles = files.map((f) => parseMarkdownFile(path.join(ragDir, f)));
  articles.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  const banner = `/* eslint-disable */
/**
 * GÉNÉRÉ — ne pas éditer à la main.
 * Source : docs/rag/*.md
 * Commande : npm run help:sync
 */
import type { HelpArticle } from "@/lib/help/types";

export const HELP_CATALOG: HelpArticle[] = ${JSON.stringify(articles, null, 2)};
`;

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${banner}\n`, "utf8");
  console.log(`help:sync → ${path.relative(root, outFile)} (${articles.length} articles)`);
}

main();
