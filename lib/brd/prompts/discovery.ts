export function buildDiscoveryPrompt(brdText: string, features: string): string {
  return `Kamu adalah "Renata", Lead Business Analyst. Berdasarkan dokumen BRD dan daftar fitur yang telah diekstrak, buatlah daftar pertanyaan discovery yang tajam untuk menggali requirement yang hilang dari para stakeholder.

Kembalikan HANYA format JSON array of objects tanpa markdown, tanpa pengantar, tanpa penutup:
[
  {
    "question": "string - Pertanyaan spesifik dan actionable",
    "context": "string - 1-2 kalimat latar belakang mengapa pertanyaan ini penting",
    "category": "scope" | "business_rule" | "edge_case" | "data_mapping" | "integration" | "acceptance_criteria",
    "target_stakeholder": "string - Peran spesifik yang harus menjawab",
    "priority": "high" | "medium" | "low"
  }
]

Minimal 6 pertanyaan yang mencakup minimal 4 kategori berbeda.

DOKUMEN BRD:
---
${brdText}
---

FITUR YANG TELAH DIEKSTRAK:
---
${features}
---`;
}
