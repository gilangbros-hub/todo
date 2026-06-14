/**
 * Map-phase prompt to extract raw business requirements from a chunk of text.
 * Used for the Map-Reduce chunking pipeline.
 */

export function buildExtractionPrompt(chunkText: string, chunkIndex: number, totalChunks: number): string {
  return `Kamu adalah spesialis ekstraksi data bisnis (Data Extraction Specialist).
Tugasmu adalah membaca bagian ke-${chunkIndex + 1} dari ${totalChunks} dari sebuah dokumen BRD (Business Requirements Document) yang sangat panjang, dan mengekstrak SEMUA fakta, aturan bisnis, aktor, dan requirement teknis ke dalam poin-poin padat (bullet points).

TUGASMU:
1. Abaikan basa-basi, filler text, atau daftar isi.
2. Ekstrak entitas sistem, aktor (siapa yang menggunakan), dan proses (apa yang mereka lakukan).
3. Ekstrak business rules (aturan bisnis) dan validasi yang disebutkan.
4. Ekstrak non-functional requirements: performa, keamanan, skalabilitas, ketersediaan, kepatuhan, maintainability, usability, reliability.
5. Jangan menyimpulkan hal yang tidak ada dalam teks. Jika teks ini hanya berisi pendahuluan, kembalikan "Tidak ada requirement teknis di bagian ini."
6. Format outputmu harus berupa Markdown bullet points sederhana. Tidak perlu JSON. Tidak perlu pembuka/penutup.

DOKUMEN BRD (BAGIAN ${chunkIndex + 1}/${totalChunks}):
---
${chunkText}
---

Tuliskan hasil ekstraksi (bullet points) di bawah ini:`;
}
