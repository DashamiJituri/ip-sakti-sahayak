#!/usr/bin/env python3
"""
IP-SAKTI ingestion: PDFs in ./dataset  ->  data/corpus.json (+ data/docs.json, data/anchors.json)

* Extracts text page-by-page (pdftotext -layout), OCRs scanned PDFs (tesseract).
* Drops Hindi / legacy-font garbage from bilingual gazettes.
* Chunks by paragraph (~1000 chars), keeps page + best-effort section label.
* Registers every document with its CORRECT title, status (current / superseded / reference)
  and resolves the "anchors" that curated guidance points to. Any anchor that cannot be
  found in the text is reported and marked unverified - the app shows it as such.

Usage:  python3 scripts/ingest.py [dataset_dir]
Requires: poppler-utils (pdftotext, pdftoppm), tesseract-ocr (only for scanned PDFs).
"""
import json, os, re, subprocess, sys, glob, tempfile
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATASET = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "dataset")
OUT = os.path.join(ROOT, "data")

# tier: primary = statute/rule/gazette text; note = explanatory (non-binding); reference = long lookup list
DOCS = [
 dict(file="a1970-39.pdf", id="patents_act_current", title="The Patents Act, 1970 (as on 5 May 2026)", short="Patents Act 1970", kind="act", status="current", tier="primary", note="India Code compilation incl. Jan Vishwas Acts 2023 and 2026."),
 dict(file="73b5bf10-b04e-4f45-abef-87ff117315dc.pdf", id="patents_act_earlier", title="The Patents Act, 1970 (earlier compiled text)", short="Patents Act 1970 (earlier text)", kind="act", status="superseded", tier="primary", note="Earlier compilation. Prefer the 2026 text; kept for comparison."),
 dict(file="A1940-23.pdf", id="dc_act_1940", title="The Drugs and Cosmetics Act, 1940", short="Drugs & Cosmetics Act 1940", kind="act", status="current", tier="primary", note="Check the compilation date on India Code before relying on it."),
 dict(file="a2003-18.pdf", id="bd_act_2002", title="The Biological Diversity Act, 2002 (original text, Act 18 of 2003)", short="Biological Diversity Act 2002", kind="act", status="amended", tier="primary", note="Base Act. Sections 2, 3, 4, 6, 7 were amended in 2023 - read with the 2023 Amendment Act."),
 dict(file="BDAct_2023.pdf", id="bd_amend_act_2023", title="The Biological Diversity (Amendment) Act, 2023 (Act 10 of 2023)", short="BD Amendment Act 2023", kind="act", status="current", tier="primary", note="Introduces codified traditional knowledge; revises sections 3, 4, 6, 7."),
 dict(file="BDAct_Gazette.pdf", id="bd_amend_commencement", title="MoEFCC Notification S.O. 295(E), 18 Jan 2024 - BD (Amendment) Act 2023 in force from 1 April 2024", short="BD Amendment Act - commencement", kind="notification", status="current", tier="primary", note=""),
 dict(file="BD_Rules.pdf", id="bd_rules_2024", title="The Biological Diversity Rules, 2024 (Gazette, 25 Oct 2024)", short="BD Rules 2024", kind="rules", status="current", tier="primary", note=""),
 dict(file="AmendmentBD_Rules.pdf", id="bd_rules_amend_2025", title="The Biological Diversity (Amendment) Rules, 2025 (Gazette, 7 May 2025)", short="BD Amendment Rules 2025", kind="rules", status="current", tier="primary", note="Labelled '2024' in the earlier prototype; the Gazette shows 2025."),
 dict(file="GNABSREG_2025.pdf", id="nba_abs_regs_2025", title="Biological Diversity (Access to Biological Resources and Knowledge Associated thereto and Fair and Equitable Sharing of Benefits) Regulations, 2025 (Gazette, 30 Apr 2025)", short="NBA ABS Regulations 2025", kind="regulations", status="current", tier="primary", note="Supersedes the 2014 ABS regulations."),
 dict(file="Gazette_Notificaiton_on_exemption_of_crops_listed_in the_Annex-I_of_the_ITPGRFA.pdf", id="itpgrfa_crops_2014", title="MoEFCC Notification (18 Dec 2014) - exemption of crops listed in Annex-I of the ITPGRFA", short="ITPGRFA Annex-I crops exemption", kind="notification", status="current", tier="primary", note="Older notification; check for later changes."),
 dict(file="Corrigendum_1.pdf", id="gazette_corrigendum_minerals", title="Gazette corrigendum (list of minerals)", short="Gazette corrigendum", kind="notification", status="current", tier="reference", note="Low relevance to Ayurveda IP."),
 dict(file="44e79270-1ee7-4f0b-9cab-4342a94b6952.pdf", id="jan_vishwas_2023", title="The Jan Vishwas (Amendment of Provisions) Act, 2023 (Act 18 of 2023)", short="Jan Vishwas Act 2023", kind="act", status="current", tier="primary", note="Amends many Acts, incl. the Patents Act and the Drugs and Cosmetics Act."),
 dict(file="5720e089-4967-408c-bc76-031d2a7fd72c.pdf", id="gi_act_1999", title="The Geographical Indications of Goods (Registration and Protection) Act, 1999 (Act 48 of 1999)", short="GI Act 1999", kind="act", status="current", tier="primary", note="Labelled 'Patents (Amendment) Rules' in the earlier prototype - it is the GI Act."),
 dict(file="c9e8a57e-bc94-4b93-8518-6e8729c976bf.pdf", id="tm_act_1999", title="The Trade Marks Act, 1999 (Gazette text as enacted; opening pages missing)", short="Trade Marks Act 1999", kind="act", status="superseded", tier="primary", note="Labelled 'PPV&FR Regulations' in the earlier prototype - it is the Trade Marks Act. Mentions the Appellate Board, since replaced (Tribunals Reforms Act 2021)."),
 dict(file="b49891c8-1d3c-44bc-bc77-4d5387aaf2cd.pdf", id="tm_amend_2010", title="The Trade Marks (Amendment) Act, 2010 (Act 40 of 2010)", short="TM Amendment Act 2010", kind="act", status="current", tier="primary", note=""),
 dict(file="ce0cdd95-e960-4221-b8a7-f23d01bfeb97.pdf", id="tm_explainer", title="IP India note: New elements in the Trade Marks Act, 1999", short="TM Act explainer (IP India)", kind="explainer", status="current", tier="note", note="Explanatory note, not law."),
 dict(file="b86a073f-f3f5-4484-b98c-1ca21cd846a3.pdf", id="designs_act_2000", title="The Designs Act, 2000 (Act 16 of 2000)", short="Designs Act 2000", kind="act", status="current", tier="primary", note="As enacted."),
 dict(file="1778068140_classification_GoodsServices_29November2013 (1).pdf", id="nice_classification", title="Classification of Goods and Services (Nice-based list, 29 Nov 2013)", short="Trade mark classes list", kind="reference", status="reference", tier="reference", note="Lookup list for choosing trade mark classes. Not law."),
 dict(file="7  collaborative guidelines.pdf", id="collab_guidelines", title="Guidelines for international collaborative research involving biological resources (MoEF Notification S.O. 1911(E), 8 Nov 2006; scanned, OCR)", short="Collaborative research guidelines 2006", kind="guidelines", status="current", tier="primary", note="Scanned document; text recovered by OCR - verify against the original."),
]

# Claims the app makes about the law, each pointing at exact wording in a document.
ANCHORS = {
 "PA_3P": ("patents_act_current", r"traditional knowledge or which is an aggregation or (di )?duplication of known properties"),
 "PA_3D": ("patents_act_current", r"mere discovery of a new form of a known substance"),
 "PA_3J": ("patents_act_current", r"plants and animals in whole or any part thereof"),
 "PA_3E": ("patents_act_current", r"mere admixture resulting only in the aggregation"),
 "PA_TERM": ("patents_act_current", r"term of every patent"),
 "PA_INVENTIVE": ("patents_act_current", r"inventive step.{0,20}means a feature of an invention"),
 "PA_25_TK": ("patents_act_current", r"local or indigenous community"),
 "PA_25_BIO": ("patents_act_current", r"does not disclose or wrongly mentions the source or geographical origin of biological material"),
 "DC_AUTH_BOOKS": ("dc_act_1940", r"authoritative books"),
 "DC_PROPRIETARY": ("dc_act_1940", r"all formulations containing only such ingredients"),
 "DC_COSMETIC": ("dc_act_1940", r"cosmetic.{0,10}means any article intended to be rubbed"),
 "DC_CH4A": ("dc_act_1940", r"Ayurvedic, Siddha and Unani drugs"),
 "BD_CODIFIED": ("bd_amend_act_2023", r"codified traditional knowledge.{0,3}\s*means the knowledge derived"),
 "BD_S7": ("bd_amend_act_2023", r"prior intimation to the concerned State"),
 "BD_S7_EXEMPT": ("bd_amend_act_2023", r"vaids, hakims and registered AYUSH"),
 "BD_S7_CULT": ("bd_amend_act_2023", r"certificate of origin"),
 "BD_S6_1": ("bd_amend_act_2023", r"shall obtain prior\s+approval of the National Biodiversity Authority before grant"),
 "BD_S6_1A": ("bd_amend_act_2023", r"shall register with the National Biodiversity Authority before grant"),
 "BD_S6_1B": ("bd_amend_act_2023", r"at the time of\s+commercialisation"),
 "BD_S4": ("bd_amend_act_2023", r"share or transfer any result of the research"),
 "BD_S3_FOREIGN": ("bd_amend_act_2023", r"controlled by a foreigner"),
 "BD_S3_BASE": ("bd_act_2002", r"a person who is not a citizen of India"),
 "BD_COMMENCE": ("bd_amend_commencement", r"1st day of April, 2024"),
 "ABS_TABLE": ("nba_abs_regs_2025", r"Above 5 crore to 50 crore"),
 "ABS_FORM_A": ("nba_abs_regs_2025", r"annual statement containing"),
 "ABS_DEEMED": ("nba_abs_regs_2025", r"within a period of fifteen days"),
 "ABS_COLLECTION": ("nba_abs_regs_2025", r"collection fee"),
 "ABS_HIGHVALUE": ("nba_abs_regs_2025", r"red\s+sanders, sandalwood, agarwood"),
 "ABS_RESEARCH_RESULTS": ("nba_abs_regs_2025", r"sharing or transferring results of\s+research"),
 "TM_TERM": ("tm_act_1999", r"period of ten years"),
 "TM_MARK_DEF": ("tm_act_1999", r"shape of goods, packaging or combination of colours"),
 "DES_DEF": ("designs_act_2000", r"features of shape, configuration, pattern"),
 "DES_TERM": ("designs_act_2000", r"ten registration years from the date of registration"),
 "GI_DEF": ("gi_act_1999", r"geographical indication.{0,4},\s*in relation to goods,\s*means an indication which identifies"),
 "GI_TERM": ("gi_act_1999", r"period of ten years"),
}


def sh(cmd):
    return subprocess.run(cmd, capture_output=True)


def pdf_pages(path):
    r = sh(["pdftotext", "-layout", path, "-"])
    txt = r.stdout.decode("utf-8", errors="replace")
    pages = txt.split("\f")
    if pages and not pages[-1].strip():
        pages = pages[:-1]
    words = sum(len(p.split()) for p in pages)
    npages = len(pages)
    if npages and words / max(npages, 1) < 25:  # looks scanned -> OCR
        print(f"   low text ({words} words / {npages} pages) -> OCR")
        pages = []
        with tempfile.TemporaryDirectory() as td:
            sh(["pdftoppm", "-r", "200", "-png", path, os.path.join(td, "p")])
            for img in sorted(glob.glob(os.path.join(td, "p*.png"))):
                o = sh(["tesseract", img, "-", "-l", "eng"])
                pages.append(o.stdout.decode("utf-8", errors="replace"))
    return pages


DEVANAGARI = re.compile(r"[\u0900-\u097F]")


def clean_lines(text, bilingual):
    out = []
    for ln in text.splitlines():
        if DEVANAGARI.search(ln):
            continue
        if bilingual and sum(1 for c in ln if 0xA0 <= ord(c) <= 0xFF) >= 2:  # legacy-font Hindi
            continue
        out.append(ln)
    return out


SEC_RE = re.compile(r"^\s{0,16}(\d{1,3}[A-Z]{0,2})\.\s+([A-Z“\"(\[][^\n]{4,})")


def build_vocab():
    v = Counter()
    for f in ("a1970-39.pdf", "A1940-23.pdf"):
        for p in pdf_pages(os.path.join(DATASET, f)):
            v.update(w for w in re.findall(r"[a-z]{3,}", p.lower()))
    return {w for w, c in v.items() if c >= 2}


def englishness(text, vocab):
    toks = re.findall(r"[A-Za-z]{3,}", text.lower())
    if len(toks) < 8:
        return 0.0
    return sum(1 for t in toks if t in vocab) / len(toks)


def chunk_page(lines, cur_section, size=1000):
    paras, buf, sec_for_para = [], [], []
    for ln in lines:
        m = SEC_RE.match(ln)
        if m:
            cur_section = m.group(1)
        if ln.strip():
            buf.append(ln.strip())
        else:
            if buf:
                paras.append(" ".join(buf)); sec_for_para.append(cur_section); buf = []
    if buf:
        paras.append(" ".join(buf)); sec_for_para.append(cur_section)
    chunks, cur, cur_sec = [], "", None
    for p, s in zip(paras, sec_for_para):
        p = re.sub(r"\s+", " ", p)
        if cur and len(cur) + len(p) > size:
            chunks.append((cur_sec, cur.strip())); cur = ""
        if not cur:
            cur_sec = s
        cur += (" " if cur else "") + p
        while len(cur) > size * 1.6:
            cut = cur.rfind(". ", 0, size)
            cut = cut + 1 if cut > 200 else size
            chunks.append((cur_sec, cur[:cut].strip())); cur = cur[cut:].strip()
    if cur.strip():
        chunks.append((cur_sec, cur.strip()))
    return chunks, cur_section


def main():
    os.makedirs(OUT, exist_ok=True)
    vocab = build_vocab()
    chunks, docs_out = [], []
    for d in DOCS:
        path = os.path.join(DATASET, d["file"])
        if not os.path.exists(path):
            print(f"!! missing file: {d['file']} (skipped)")
            continue
        print(f"-> {d['id']}")
        pages = pdf_pages(path)
        bilingual = d["id"] in ("jan_vishwas_2023", "nba_abs_regs_2025", "bd_rules_2024", "bd_rules_amend_2025", "bd_amend_commencement", "itpgrfa_crops_2014", "gi_act_1999", "collab_guidelines")
        cur_section, n = None, 0
        for pi, ptxt in enumerate(pages, start=1):
            lines = clean_lines(ptxt, bilingual)
            cs, cur_section = chunk_page(lines, cur_section)
            for ci, (sec, text) in enumerate(cs):
                if len(text) < 60:
                    continue
                if bilingual and englishness(text, vocab) < 0.55:
                    continue
                chunks.append(dict(id=f"{d['id']}:p{pi}:c{ci}", docId=d["id"], page=pi, section=sec, text=text))
                n += 1
        docs_out.append({**{k: v for k, v in d.items() if k != "file"}, "jurisdiction": "india", "pages": len(pages), "chunks": n})
        print(f"   {len(pages)} pages, {n} chunks")

    by_doc = {}
    for c in chunks:
        by_doc.setdefault(c["docId"], []).append(c)
    anchors, missing = {}, []
    for key, (doc, rx) in ANCHORS.items():
        pat = re.compile(rx, re.I | re.S)
        lst = by_doc.get(doc, [])
        hit = next((c for c in lst if pat.search(c["text"])), None)
        if hit is None:
            for a, b in zip(lst, lst[1:]):
                if pat.search(a["text"] + " " + b["text"]):
                    hit = a
                    break
        anchors[key] = dict(docId=doc, chunkId=hit["id"] if hit else None, page=hit["page"] if hit else None, verified=bool(hit))
        if not hit:
            missing.append(key)
    print("\nanchors verified:", sum(a["verified"] for a in anchors.values()), "/", len(anchors))
    if missing:
        print("UNVERIFIED anchors:", missing)

    with open(os.path.join(OUT, "curated_intl.json"), encoding="utf-8") as f:
        intl = json.load(f)
    for e in intl["entries"]:
        chunks.append(dict(id=f"intl:{e['id']}", docId="curated_intl", page=None, section=e["label"], text=e["text"], verifyUrl=e.get("verifyUrl")))
    docs_out.append(dict(id="curated_intl", title="Curated international summaries (treaties, export-market regimes)", short="Curated international summaries", kind="curated", status="curated", tier="curated", note="Written summaries, NOT the treaty text. Verify against the official source linked on each entry.", jurisdiction="international", pages=0, chunks=len(intl["entries"])))

    json.dump(chunks, open(os.path.join(OUT, "corpus.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    json.dump(docs_out, open(os.path.join(OUT, "docs.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(anchors, open(os.path.join(OUT, "anchors.json"), "w", encoding="utf-8"), indent=1)
    print(f"\nTOTAL chunks: {len(chunks)}   corpus.json: {os.path.getsize(os.path.join(OUT, 'corpus.json')) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
