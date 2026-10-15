import type { Metadata } from "next";
import { Guide } from "@/components/guide/guide";

export const metadata: Metadata = {
  title: { absolute: "Як працює Nodera — туторіал" },
  description: "Кожен розділ Nodera по черзі: що він робить, до чого прив'язується і де відображається.",
};

export default function GuidePage() {
  return <Guide />;
}
