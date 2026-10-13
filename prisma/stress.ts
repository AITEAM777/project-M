/**
 * Performance fixture: `npm run db:stress` adds a map with 600 nodes and ~900 connections
 * to the demo account (run `npm run db:seed` first) so canvas rendering and autosave can be tested.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();
const id = (p: string) => p + randomBytes(9).toString("hex");
const KINDS = ["THOUGHT", "IDEA", "TASK", "QUESTION", "RESOURCE", "DECISION"] as const;
const RELS = ["RELATED_TO", "SUPPORTS", "LEADS_TO", "DEPENDS_ON", "PART_OF"] as const;

async function main() {
  const NODES = Number(process.env.NODES ?? 600);
  const user = await prisma.user.findUnique({ where: { email: "demo@nodera.app" }, include: { memberships: true } });
  if (!user) throw new Error("Run `npm run db:seed` first");
  // Large maps exceed the FREE per-map node limit, so the fixture account is upgraded.
  await prisma.user.update({ where: { id: user.id }, data: { plan: "PRO" } });
  const map = await prisma.mindMap.create({ data: { workspaceId: user.memberships[0].workspaceId, title: `Stress test (${NODES} nodes)` } });
  const nodes = Array.from({ length: NODES }, (_, i) => {
    const ring = Math.floor(Math.sqrt(i));
    const angle = i * 2.399963; // golden angle spiral
    return { id: id("n_"), mapId: map.id, kind: KINDS[i % KINDS.length], title: `Thought ${i + 1}`, x: Math.cos(angle) * ring * 140, y: Math.sin(angle) * ring * 90 };
  });
  await prisma.mapNode.createMany({ data: nodes });
  const edges = [];
  for (let i = 1; i < NODES; i++) {
    edges.push({ id: id("e_"), mapId: map.id, sourceId: nodes[Math.floor((i - 1) / 3)].id, targetId: nodes[i].id, relation: RELS[i % RELS.length] });
    if (i % 2 === 0 && i > 10) edges.push({ id: id("e_"), mapId: map.id, sourceId: nodes[i].id, targetId: nodes[(i * 7) % i].id, relation: "RELATED_TO" as const });
  }
  await prisma.mapEdge.createMany({ data: edges });
  console.log(`Created map ${map.id} with ${nodes.length} nodes and ${edges.length} edges`);
}

main().finally(() => prisma.$disconnect());
