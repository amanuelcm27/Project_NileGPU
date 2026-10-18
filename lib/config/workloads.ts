import type { WorkloadKind } from "@/components/visuals/WorkloadGlyph";

export interface WorkloadEntry {
  id: WorkloadKind;
  /** Display index, e.g. "01". */
  index: string;
  title: string;
  /** Short label used in the workload rail. */
  railLabel: string;
  description: string;
  /** Monospace technical annotations shown with the workload. */
  annotations: string[];
  /** Framing line shown under the diagram. */
  note: string;
}

/**
 * Workload catalogue.
 *
 * These are conceptual targets for the early-access programme, described in
 * terms of what they require from compute — not a list of products or hardware
 * that is available today.
 */
export const workloads: WorkloadEntry[] = [
  {
    id: "llm_inference",
    index: "01",
    title: "LLM inference",
    railLabel: "Inference",
    description:
      "Serve open-source language models for chat, code assistance and document processing. Memory capacity and batching behaviour decide which models fit and how much traffic one worker can answer.",
    annotations: ["KV CACHE", "REQUEST BATCHING", "QUANTISED WEIGHTS"],
    note: "Memory capacity usually sets the model ceiling; batching sets the throughput.",
  },
  {
    id: "fine_tuning",
    index: "02",
    title: "Fine-tuning open-source models",
    railLabel: "Fine-tuning",
    description:
      "Adapt a pretrained model to your own data with LoRA adapters or a full fine-tune. Runs are usually dataset-bound, so sustained GPU time and available memory matter more than peak clock speed.",
    annotations: ["ADAPTER LAYERS", "GRADIENT CHECKPOINTS", "DATASET-BOUND"],
    note: "Ideal candidate for rented compute: infrequent, heavy, and time-boxed.",
  },
  {
    id: "training_from_scratch",
    index: "03",
    title: "Training models from scratch",
    railLabel: "Training",
    description:
      "Train research models over many epochs. These jobs run for hours or days, hold a full optimizer state in memory and often need several GPUs coordinating gradients together.",
    annotations: ["MULTI-GPU", "ALLREDUCE", "CHECKPOINTING"],
    note: "The workload that most often justifies infrastructure beyond a single workstation.",
  },
  {
    id: "computer_vision",
    index: "04",
    title: "Computer vision",
    railLabel: "Vision",
    description:
      "Train and run detection, segmentation and classification over images and video streams — from small labelled datasets through to continuous inference on live input.",
    annotations: ["CONVOLUTION / VIT", "AUGMENTATION", "STREAMED INPUT"],
    note: "Often mixed: training bursts followed by steady, low-latency inference.",
  },
  {
    id: "image_generation",
    index: "05",
    title: "Image generation",
    railLabel: "Image gen",
    description:
      "Generate and iterate on images with diffusion and flow models: single prompts at interactive speed, or large batches scheduled in the background.",
    annotations: ["DIFFUSION STEPS", "ATTENTION HEAVY", "BATCH JOBS"],
    note: "Latency-sensitive for exploration, throughput-sensitive for production batches.",
  },
  {
    id: "video_generation",
    index: "06",
    title: "Video generation",
    railLabel: "Video gen",
    description:
      "Produce short clips from prompts or existing footage. Temporal models hold far more state per request, which makes this the most demanding common workload in both memory and sustained compute.",
    annotations: ["TEMPORAL LAYERS", "SUSTAINED LOAD", "SMALL BATCHES"],
    note: "Closest to the edge of what consumer hardware can do at all.",
  },
];

export const workloadDisclaimer =
  "Reference descriptions of common workload types — not a hardware or product offer. The service is in early access and the delivery model is not final.";
