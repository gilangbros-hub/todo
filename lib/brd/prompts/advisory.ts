/**
 * Advisory prompt — generates questions, improvements, risk analysis,
 * system architecture, impacted systems, and FSD design recommendations.
 * All output in Bahasa Indonesia.
 */

export function buildAdvisoryPrompt(brdText: string): string {
  return `Kamu adalah "The Oracle" — seorang analis bisnis dan arsitek sistem yang ahli. Analisis dokumen BRD berikut dan berikan insight advisory dalam Bahasa Indonesia.

Kembalikan JSON object dengan 6 key: "improvements", "questions", "risk_analysis", "architecture_diagram", "impacted_systems", "fsd_design".

## IMPROVEMENTS (Poin Perbaikan)
Untuk setiap poin perbaikan:
- **title**: Judul singkat (maks 60 karakter)
- **description**: Penjelasan detail — mengapa penting dan cara memperbaikinya (2-4 kalimat)
- **category**: Salah satu dari "missing_requirement", "unclear_spec", "security_gap", "performance", "ux_improvement", "process_optimization", "data_integrity"
- **priority**: "low", "medium", "high"

## QUESTIONS (Pertanyaan untuk Stakeholder)
Untuk setiap pertanyaan:
- **question**: Teks pertanyaan lengkap (jelas, spesifik)
- **context**: Mengapa pertanyaan ini penting — gap atau ambiguitas apa yang ditangani (1-2 kalimat)
- **category**: Salah satu dari "scope", "technical", "business_rule", "edge_case", "integration", "security", "timeline"
- **target_role**: Siapa yang harus menjawab (misal "Product Owner", "Tech Lead", "Business User")

## RISK ANALYSIS (Analisis Risiko)
Untuk setiap risiko:
- **risk**: Deskripsi risiko (1-2 kalimat)
- **impact**: "low", "medium", "high", "critical"
- **likelihood**: "unlikely", "possible", "likely", "certain"
- **category**: Salah satu dari "technical", "business", "security", "compliance", "operational", "integration", "resource"
- **mitigation**: Strategi mitigasi yang disarankan (1-2 kalimat)

## ARCHITECTURE DIAGRAM (Diagram Arsitektur Sistem)
Buat diagram flowchart dalam format Mermaid.js yang menunjukkan arsitektur sistem.

CONTOH FORMAT YANG BENAR:
\`\`\`
graph TD
    subgraph UserLayer["Aktor / User"]
        A1["ARH - User"]
        A2["Finance HQ"]
    end
    subgraph AppLayer["Aplikasi"]
        M1["Mobile MCS ARH"]
        W1["Web Portal Finance"]
    end
    subgraph Backend["Backend Services"]
        B1["Authentication Service"]
        B2["Data Service"]
        B3["File Upload Service"]
    end
    A1 --> M1
    A2 --> W1
    M1 --> B1
    M1 --> B2
    W1 --> B2
    W1 --> B3
\`\`\`

ATURAN MERMAID YANG WAJIB DIIKUTI:
1. Node ID hanya boleh huruf, angka, dan underscore. BENAR: A1, UserNode, Core_Banking. SALAH: ARH("..."), B2[...].
2. Label node SELALU dalam tanda kutip ganda di dalam bracket: A1["Label Text Here"]
3. JANGAN gunakan tanda kurung () di dalam label. Ganti dengan dash: "Data Service - CRUD" bukan "Data Service (CRUD)"
4. JANGAN gunakan array syntax [], tanda kutip tunggal ', atau nested quotes di dalam label.
5. Subgraph title juga harus dalam quotes: subgraph Backend["Backend API Server"]
6. Gunakan graph TD (top-down) dengan subgraph untuk grouping.
7. Panah sederhana: A1 --> B1 atau A1 -->|"label"| B1

Kembalikan sebagai string Mermaid diagram yang valid (TANPA pembungkus markdown \`\`\`).
Jika ragu, gunakan label yang lebih sederhana daripada yang kompleks.

## IMPACTED SYSTEMS (Sistem yang Terdampak)
Array dari sistem yang terdampak oleh BRD ini:
- **system_name**: Nama sistem (misal "Confins", "Core Banking", "Email Gateway")
- **description**: Penjelasan dampak terhadap sistem tersebut (2-3 kalimat)
- **impact_type**: Salah satu dari "new_integration", "modification", "data_source", "notification", "reporting"

## FSD DESIGN (Rekomendasi Desain Fitur untuk FSD)
Array rekomendasi desain fitur untuk Functional Specification Document:
- **feature_name**: Nama fitur
- **explanation**: Penjelasan fitur dan tujuannya (2-3 kalimat)
- **user_action**: Aksi yang dilakukan user (langkah-langkah)
- **system_reaction**: Reaksi sistem terhadap aksi user (apa yang sistem lakukan)

ATURAN:
- Kembalikan HANYA JSON yang valid: {"improvements": [...], "questions": [...], "risk_analysis": [...], "architecture_diagram": "...", "impacted_systems": [...], "fsd_design": [...]}
- TIDAK ada markdown wrapping. Maksimum 15 item per section.
- Spesifik untuk dokumen INI — bukan saran generik.
- SEMUA teks output dalam Bahasa Indonesia.

DOKUMEN BRD:
---
${brdText}
---

Respond with ONLY the JSON object:`;
}
