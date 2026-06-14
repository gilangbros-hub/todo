export function buildSolutionsPrompt(brdText: string, features: string): string {
  return `Kamu adalah "Renata", Lead Business Analyst dan Solution Architect. Berdasarkan dokumen BRD dan fitur yang telah diekstrak, petakan solusi teknis dan arsitektur yang spesifik untuk setiap requirement.

Kembalikan HANYA format JSON array of objects tanpa markdown, tanpa pengantar, tanpa penutup:
[
  {
    "feature_id": "string - ID fitur terkait dari daftar fitur",
    "feature_name": "string - Nama fitur yang dimapping",
    "solution_type": "architecture" | "microservice" | "api_design" | "data_model" | "integration" | "automation" | "security",
    "recommendation": "string - 3-5 kalimat rekomendasi solusi teknis spesifik",
    "tech_stack": ["string - Teknologi yang direkomendasikan"],
    "complexity": "low" | "medium" | "high",
    "estimated_effort": "string - Estimasi effort"
  }
]

Minimal 3 mapping solusi untuk fitur-fitur yang berbeda.

DOKUMEN BRD:
---
${brdText}
---

FITUR YANG TELAH DIEKSTRAK:
---
${features}
---`;
}
