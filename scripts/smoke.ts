// Quick sanity check of the data files + module wiring, without starting Next. Run: npm run smoke
import { allDocs, corpusSize, search } from "../src/lib/retrieval";
import anchors from "../data/anchors.json";

const anchorVals = Object.values(anchors as Record<string, { verified: boolean }>);
console.log(`Docs: ${allDocs().length}`);
console.log(`Chunks: ${corpusSize()}`);
console.log(`Anchors verified: ${anchorVals.filter((a) => a.verified).length}/${anchorVals.length}`);
const hits = search("patent traditional knowledge section 3(p)", { jurisdiction: "india", k: 3 });
console.log("Sample search top hit:", hits[0]?.doc.short, "score", hits[0]?.score.toFixed(2));
if (allDocs().length === 0 || corpusSize() === 0) {
  console.error("Corpus is empty — run `npm run ingest` first.");
  process.exit(1);
}
console.log("Smoke test OK.");
