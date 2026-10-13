"use client";
import { use } from "react";
import { MapEditor } from "@/components/canvas/map-editor";

export default function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MapEditor mapId={id} />;
}
