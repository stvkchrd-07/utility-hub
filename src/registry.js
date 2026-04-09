// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
import dynamic from "next/dynamic";
import bgRemoverMeta from "./tools/bg-remover/meta";
const bgRemoverComponent = dynamic(() => import("./tools/bg-remover/Tool"), { ssr: false });
import imageResizeMeta from "./tools/image-resize/meta";
const imageResizeComponent = dynamic(() => import("./tools/image-resize/Tool"), { ssr: false });
import qrGeneratorMeta from "./tools/qr-generator/meta";
const qrGeneratorComponent = dynamic(() => import("./tools/qr-generator/Tool"), { ssr: false });

export const tools = [
  { ...bgRemoverMeta, component: bgRemoverComponent },
  { ...imageResizeMeta, component: imageResizeComponent },
  { ...qrGeneratorMeta, component: qrGeneratorComponent },
];
