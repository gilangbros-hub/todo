/**
 * Core prompt — extracts features and flow process in one call.
 * This is the primary analysis that defines what the BRD contains.
 */

export function buildCorePrompt(brdText: string): string {
  return `Kamu adalah "The Oracle" — seorang analis bisnis yang ahli. Analisis dokumen BRD ini dan ekstrak fitur + alur proses. Semua output dalam Bahasa Indonesia.

Kembalikan JSON object dengan dua key: "features" dan "flow_process".

## FEATURES (Fitur)
Ekstrak SEMUA fitur. Untuk setiap fitur:
1. **name**: Nama fitur yang ringkas (maks 80 karakter)
2. **description**: Ringkasan 2-4 kalimat — apa yang dilakukan, siapa yang dilayani, mengapa penting (maks 600 karakter)
3. **requirement_type**: "functional" atau "non_functional"
4. **suggested_priority**: "normal", "rare", "epic", atau "legendary"
5. **user_roles**: Array role pengguna (misal ["OPSI", "Finance HQ"])
6. **scope**: "in_scope", "out_of_scope", atau "unknown"
7. **as_is**: Realitas bisnis saat ini — pain point, langkah manual (2-4 kalimat)
8. **to_be**: Kondisi masa depan setelah implementasi — apa yang membaik (2-4 kalimat)
9. **precondition**: Kondisi sistem/data yang harus ada sebelum fitur ini bisa dijalankan (1-2 kalimat, teknis)
10. **postcondition**: Kondisi sistem/data yang dijamin setelah satu eksekusi berhasil (1-2 kalimat, teknis)
11. **business_flow**: Narasi langkah demi langkah bagaimana fitur ini dioperasikan (3-6 kalimat)
12. **impacted_process**: Proses bisnis yang lebih luas yang terhubung dengan fitur ini (satu frasa)
13. **risks**: Risiko konkret dan dependensi (2-3 kalimat)
14. **accounting_impact**: Logika jurnal akuntansi jika ada, string kosong jika tidak ada

PERBEDAAN: as_is/to_be = cerita bisnis dari waktu ke waktu. precondition/postcondition = kontrak teknis dari satu eksekusi. JANGAN ulangi konten antar keduanya.

## FLOW PROCESS (Alur Proses)
Array langkah untuk proses end-to-end:
- **id**: Nomor berurutan dari 1
- **actor**: Nama role (misal "OPSI", "System", "Finance HQ")
- **action**: Apa yang terjadi (maks 60 karakter)
- **type**: "start", "process", "decision", atau "end"
- **next**: Array ID langkah berikutnya

8-20 langkah. Jalur utama (happy path) dengan keputusan kunci.

ATURAN:
- Kembalikan HANYA JSON yang valid: {"features": [...], "flow_process": [...]}
- TIDAK ada markdown wrapping. Maksimum 20 fitur.
- Gunakan string kosong "" untuk field yang tidak bisa ditentukan.
- SEMUA teks output dalam Bahasa Indonesia.

DOKUMEN BRD:
---
${brdText}
---

Respond with ONLY the JSON object:`;
}
