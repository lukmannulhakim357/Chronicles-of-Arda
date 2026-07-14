# Arda RPG — Prompt Awal untuk Claude Code: The Great Journey

## Context
Ini prototype awal Arda RPG, top-down pixel-art RPG berbasis lore Tolkien. Taruh `arda-rpg-concept.md` di root project ini dan **baca file itu dulu sebelum mulai coding** — itu source of truth untuk semua desain, aturan di bawah cuma ringkasan bagian yang relevan.

**Scope build ini: HANYA campaign origin Elf, "The Great Journey"** (Awakening di Cuiviénen sampai tiba di Valinor). Jangan bangun konten Age lain dulu.

## Aturan Inti Campaign Ini
- **Ras: cuma Elf** — satu-satunya campaign yang playable-nya 1 ras (ras lain belum exist di era ini)
- Player pilih 1 dari 3 kindred di start: **Ingwë → Vanyar**, **Finwë → Noldor**, **Elwë/Olwë → Teleri**. Pilihan ini nentuin starting flavor/home city, tapi 10 waypoint & jalur cerita di bawah sama untuk semua kindred
- **Class bebas** — 8 pilihan (Warrior, Ranger, Loresinger, Herbmaster/Healer, Smith/Artificer, Skirmisher, Captain, Summoner), race-class gak hard-lock
- Peta = **10 waypoint berurutan**, belum ada kota/hub (masih "Stone Age" — chain of wilderness waypoints along the march), bukan open-world
- Quest nempel langsung per-waypoint, bukan sistem quest terpisah
- Campaign selesai pas nyampe Valinor (waypoint 10). Valinor sebagai hub yang bisa dieksplor penuh + jadi standing/persistent teleport destination itu scope LANJUTAN, belum untuk build ini
- Detail combat/stat (STR/VIT/MAG/DEX, weapon Attack/Attack Rate, dll) ada lengkap di Section 16 dokumen — gali itu pas udah masuk bagian combat, gak perlu di-hardcode dari awal kalau fokus vertical slice dulu

## 10 Waypoint (urutan tetap)
1. **Cuiviénen** — lakeshore starlit. *"The Vanishing"* — lacak kerabat hilang, glimpse shadow-servant Melkor, ends w/ kedatangan Oromë
2. **The Steppes** — grassland/river ford. Escort keluarga yang tertinggal sambil hunting/foraging
3. **The Great Forest** — dense dark woodland. Tuntun anggota rombongan yang tersesat sebelum malam
4. **Vales of Anduin** — river valley. *"Lenwë's Choice"* — bujuk Nandor buat lanjut nyebrang gunung (outcome historis fixed, tapi 1 companion NPC bisa berubah pilihan)
5. **Misty Mountains (Hithaeglir)** — mountain pass. Boss-tier encounter signature yang blocking jalur
6. **Rhovanion** — open wildlands. Long-haul foraging/supply quest (narasikan perjalanan bertahun-tahun)
7. **Ered Luin** — mountain crossing. *"First Contact"* — first meeting sama Dwarf patrol, resolve jadi cautious respect
8. **Beleriand (Region & Neldoreth)** — river valley/forest. *"The King Is Lost"* — cari Elwë yang hilang di Nan Elmoth; farewell sama companion Sindar-remnant yang milih tinggal
9. **The Falas** — coastline. Belajar shipbuilding dari Ossë; optional dialogue stay vs lanjut
10. **Crossing to Aman** — sea passage via Tol Eressëa. Closing event: penyeberangan laut, campaign selesai pas nyampe Valinor

*(Split di waypoint 4, 8, 9 itu narrative/NPC-only outcome — Nandor/Sindar/Falathrim yang gak lanjut BUKAN playable start.)*

## Technical Directives
- **Mobile-first**: touch controls dari awal — virtual joystick atau tap-to-move, tombol touch-sized buat skill bar/inventory/dialogue choice
- **Engine**: pakai Phaser (canvas 2D) kecuali ada alasan kuat pindah ke Three.js orthographic — masih belum final, boleh dikonfirmasi ulang kalau ada pertimbangan teknis baru
- **Free save** di mana aja lewat menu + autosave tiap masuk zone baru

## Asset Directive — Pakai Asset Gratis dari Internet
Kamu punya akses internet penuh, jadi:
- Prioritas: **Liberated Pixel Cup (LPC)** dulu buat character sprite (per-kindred + gear + animasi) dan tileset — paling cocok buat genre ini
- Kalau kurang lengkap, cari CC0 tambahan di **OpenGameArt.org, itch.io, Kenney.nl**, atau GitHub mirror
- **Wajib catat lisensi tiap asset** (LPC = CC-BY-SA/GPL, butuh attribution + share-alike) — siapin credits section dari awal
- Baru pakai AI-generated custom asset (image gen) buat hal yang gak ada di free pack — misalnya arsitektur Valmar/Tirion/Alqualondë, kreatur unik, armor silhouette khas kindred tertentu

## Cutscene / Scenario Art — Jangan Buat Sendiri, Flag Aja
Untuk momen yang butuh ilustrasi narasi (bukan sprite/tileset biasa) — contoh:
- Cuiviénen di bawah cahaya bintang (opening)
- Kedatangan Oromë
- Nan Elmoth waktu nyari Elwë
- Penyeberangan laut ke Aman (closing)

Jangan coba generate sendiri. Cukup **flag dengan jelas** — di mana ilustrasi itu dibutuhkan + mood/elemen kunci yang harus ada — nanti gambarnya dibuat manual via Gemini lalu di-feed balik ke project.

## Saran Titik Mulai
Biar gak overwhelm: character creation (pilih kindred + class) → movement dasar → waypoint 1 (Cuiviénen) + quest "The Vanishing" end-to-end dulu, baru lanjut waypoint berikutnya satu-satu.
