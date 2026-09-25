"use client";
import { useEffect, useRef, useState } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, type SimulationNodeDatum } from "d3-force";
import type { DocMeta } from "@/lib/types";
import { EDGES } from "@/lib/graph-data";

interface Node extends SimulationNodeDatum {
  id: string;
  label: string;
  tier: string;
  status: string;
}

const KIND_COLOR: Record<string, string> = {
  amends: "rgb(var(--turmeric))",
  implements: "rgb(var(--neem))",
  commences: "rgb(var(--indigo))",
  supersedes: "rgb(var(--sindoor))",
  explains: "rgb(var(--muted))",
  relates_to: "rgb(var(--line))",
};

export default function DocGraph({ docs, onSelect }: { docs: DocMeta[]; onSelect: (id: string) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [dims] = useState({ w: 720, h: 480 });

  useEffect(() => {
    const idSet = new Set(docs.map((d) => d.id));
    const edges = EDGES.filter((e) => idSet.has(e.from) && idSet.has(e.to));
    const involved = new Set<string>();
    edges.forEach((e) => {
      involved.add(e.from);
      involved.add(e.to);
    });
    const list: Node[] = docs
      .filter((d) => involved.has(d.id))
      .map((d) => ({ id: d.id, label: d.short, tier: d.tier, status: d.status }));

    const sim = forceSimulation<Node>(list)
      .force(
        "link",
        forceLink(edges.map((e) => ({ source: e.from, target: e.to })) as never)
          .id((d) => (d as unknown as Node).id)
          .distance(110)
          .strength(0.5)
      )
      .force("charge", forceManyBody().strength(-260))
      .force("center", forceCenter(dims.w / 2, dims.h / 2))
      .force("collide", forceCollide(48))
      .stop();
    for (let i = 0; i < 260; i++) sim.tick();
    setNodes([...list]);
  }, [docs, dims.w, dims.h]);

  const idSet = new Set(docs.map((d) => d.id));
  const edges = EDGES.filter((e) => idSet.has(e.from) && idSet.has(e.to));
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <svg ref={ref} viewBox={`0 0 ${dims.w} ${dims.h}`} className="w-full h-[420px] md:h-[480px]">
      <g>
        {edges.map((e, i) => {
          const a = byId[e.from];
          const b = byId[e.to];
          if (!a || !b) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={KIND_COLOR[e.kind]} strokeWidth={1.5} opacity={0.55} markerEnd="url(#arrow)" />;
        })}
      </g>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="rgb(var(--muted))" />
        </marker>
      </defs>
      <g>
        {nodes.map((n) => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`} className="cursor-pointer" onClick={() => onSelect(n.id)}>
            <circle r={n.tier === "primary" ? 22 : 16} fill={n.tier === "primary" ? "rgb(var(--neem-soft))" : "rgb(var(--sunk))"} stroke={n.tier === "primary" ? "rgb(var(--neem))" : "rgb(var(--line))"} strokeWidth={1.5} />
            <text textAnchor="middle" dy={n.tier === "primary" ? 36 : 30} fontSize={10} fill="rgb(var(--ink))" className="select-none">
              {n.label.length > 22 ? n.label.slice(0, 20) + "…" : n.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
