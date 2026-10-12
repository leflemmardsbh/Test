import {
  Activity, Baby, Bone, Brain, Dna, Droplets, Ear, Eye, HeartPulse, Microscope,
  Pill, ShieldPlus, Stethoscope, Syringe, TestTube, Thermometer, Zap, FlaskConical,
  Scissors, UserRound, Scan, BrainCircuit, Hospital, Beaker,
} from "lucide-react";

export const ICON_OPTIONS = [
  { key: "stethoscope", label: "Stéthoscope", Icon: Stethoscope },
  { key: "heart", label: "Cœur", Icon: HeartPulse },
  { key: "brain", label: "Cerveau", Icon: Brain },
  { key: "activity", label: "Activité", Icon: Activity },
  { key: "lungs", label: "Pneumologie", Icon: Activity },
  { key: "bone", label: "Os", Icon: Bone },
  { key: "pill", label: "Médicament", Icon: Pill },
  { key: "syringe", label: "Seringue", Icon: Syringe },
  { key: "microscope", label: "Microscope", Icon: Microscope },
  { key: "flask", label: "Laboratoire", Icon: FlaskConical },
  { key: "test-tube", label: "Éprouvette", Icon: TestTube },
  { key: "dna", label: "ADN", Icon: Dna },
  { key: "baby", label: "Pédiatrie", Icon: Baby },
  { key: "eye", label: "Œil", Icon: Eye },
  { key: "ear", label: "ORL", Icon: Ear },
  { key: "shield", label: "Prévention", Icon: ShieldPlus },
  { key: "thermometer", label: "Thermomètre", Icon: Thermometer },
  { key: "droplets", label: "Hémato", Icon: Droplets },
  { key: "zap", label: "Urgences", Icon: Zap },
  { key: "scissors", label: "Chirurgie", Icon: Scissors },
  { key: "user", label: "Médecin", Icon: UserRound },
  { key: "scan", label: "Imagerie", Icon: Scan },
  { key: "hospital", label: "Hôpital", Icon: Hospital },
  { key: "beaker", label: "Chimie", Icon: Beaker },
];

export function getIcon(key) {
  const found = ICON_OPTIONS.find((o) => o.key === key);
  return found ? found.Icon : Stethoscope;
}

export const COLOR_OPTIONS = [
  { key: "teal", label: "Pétrole", hex: "#0D5C75" },
  { key: "coral", label: "Corail", hex: "#D97B6B" },
  { key: "sky", label: "Ciel", hex: "#3B82A6" },
  { key: "violet", label: "Violet", hex: "#7C6BB4" },
  { key: "amber", label: "Ambre", hex: "#C68B4C" },
  { key: "green", label: "Vert médical", hex: "#2EA44F" },
  { key: "rose", label: "Rose", hex: "#B4536B" },
  { key: "slate", label: "Ardoise", hex: "#475569" },
];
