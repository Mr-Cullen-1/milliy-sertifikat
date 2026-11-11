# Rasmiy manbalar (saqlangan nusxalar)

Yig'ilgan sana: **2026-11-11**. Bu papka Milliy sertifikat (matematika) va DTM mock variantlarini tuzishda asos bo'ladigan rasmiy hujjatlarning nusxalari.

## Ishlatilish qoidasi (foydalanuvchi qarori, 2026-11-11)
- **Mock variantlar (A–O va keyingilari) va DTM variantlari** shu manbalarga asoslanib tuziladi: format, bo'limlar, mazmun ro'yxati (V bo'lim), savol turlari (namunaviy test) va qiyinlik (rasmiy tahlil).
- **Mashq** (mavzu bo'yicha testlar) bu manbalar bo'yicha qat'iy qurilmaydi: mavzu va qiyinlik darajasiga qarab generatsiya qilinadi (docs/content.md "Mashq zaxirasi").
- Hujjatlar qayta tahrirlanmaydi: nusxa bilan birga SHA-256 saqlangan. Yangi tahrir chiqsa yangi fayl qo'shiladi, eskisi o'chirilmaydi.

## Birlamchi (rasmiy) manbalar
| Fayl | Nima | Asl manzil | Sana | SHA-256 |
|---|---|---|---|---|
| [matematika-spetsifikatsiya-2025-04-28.pdf](matematika-spetsifikatsiya-2025-04-28.pdf) | **Eng so'nggi** "Matematika fanidan milliy test tizimi uchun test varianti tafsiloti" (format jadvali 1–45, 21 mazmun elementi va mavzular, kognitiv darajalar, kompetensiyalar, baholash) | Agentlik sahifasi [gov.uz/oz/uzbmb/sections/view/49468](https://gov.uz/oz/uzbmb/sections/view/49468) → [PDF](https://api-portal.gov.uz/uploads/165/2025/04/28/09b16d41-dca4-4d1d-2ba1-9c053525b9cf_media_.pdf) | yuklangan 2025-04-28; sahifa yangilangan 2026-10-30 | `e4086998bd3dfc8e30db83295fad13c642958df685b6e49eaa0bf4d5ed90e839` |
| [namunaviy-test-matematika-uz.pdf](namunaviy-test-matematika-uz.pdf) | Agentlikning "Matematika fanidan namunaviy test topshiriqlari" (45 savol, o'zbekcha) | [static.oliygoh.uz/uploads/4/matem.pdf](https://static.oliygoh.uz/uploads/4/matem.pdf) (agentlik e'lon qilgan nusxa, [post](https://oliygoh.uz/post/milliy-test-tizimi-uchun-test-namunalar)) | 2023-yanvar | `7f1189aa72e64f64a5d060eccd0c902df4bc884af28d273d819e4cc8d20030a6` |
| [namunaviy-test-matematika-ru.pdf](namunaviy-test-matematika-ru.pdf) | Xuddi shu namuna, ruscha | [static.oliygoh.uz/uploads/4/matem_ru.pdf](https://static.oliygoh.uz/uploads/4/matem_ru.pdf) | 2023-yanvar | `5390c2b8b0f2869ea95f2ea165db1cfb8b0ccfb46e735b1869d1a6ad4c438c38` |
| [test-tahlili-2022-12-04.pdf](test-tahlili-2022-12-04.pdf) | Agentlikning 2022-yil 4-dekabr matematika imtihoni statistik tahlili (4506 talabgor; topshiriqlar qiyinligi, Rash b) | [static.oliygoh.uz/uploads/4/Matematika fanidan test tahlili.pdf](https://static.oliygoh.uz/uploads/4/Matematika%20fanidan%20test%20tahlili.pdf) (agentlik uzbmb.uz materiali) | 2022-12 | `5944182c63d6eaaa0813c5c7464b6b597be467bc8b94566bf7be951f6d3a94c4` |

Matn nusxalari (PDF dan avtomatik ajratilgan, belgilar/formulalar ayrimlarida buzilgan; asosiy manba PDF): [matn/](matn/). Qiyinlik jadvali CSV: [qiyinlik-2022-12-04.csv](qiyinlik-2022-12-04.csv) (55 qator: T1–T35 yopiq, O36A–O45B ochiq).

## Ikkilamchi (rasmiy emas) manbalar — faqat taqqoslash uchun
| Fayl | Nima | Izoh |
|---|---|---|
| [ikkilamchi/dtm-kirish-matematika-tafsiloti-nusxa.pdf](ikkilamchi/dtm-kirish-matematika-tafsiloti-nusxa.pdf) | OTMga kirish (DTM) matematika test varianti tafsiloti | Telegram kanal belgisi bilan nusxa: asl hujjat manzili aniqlanmagan, formatlar jadvali ajratilmadi. DTM variantlarini tuzishdan oldin agentlikning asl hujjatini topish kerak. SHA-256 `38665e77dc67bd85bef77880d7fe2bcb48ebdfba80818040716d00344438c3c2` |
| ikkilamchi/oliygoh-spetsifikatsiya-2023-sahifa.txt | oliygoh.uz dagi 2023-yil 8-fevral nusxasi (sahifa matni; IV–VII bo'limlar rasm) | Eski tahrir; topshiriq ballari (1,3/2,2/1,5/1,7) faqat shu tahrirda |
| ikkilamchi/infoedu-matematika-2026-sahifa.txt | Infoedu maqolasi (yangilangan 2026-11-09) | Amaldagi tahrirda topshiriq ballari yo'qligini tasdiqlaydi |
| ikkilamchi/gov-uz-spetsifikatsiyalar-sahifasi.txt | gov.uz dagi agentlik spetsifikatsiyalar sahifasi matni | Matematika fayli 2025-04-28 ekanini ko'rsatadi |

## Tekshirib bo'lmagan
- uzbmb.uz va dtm.uz (agentlikning o'z domenlari) sertifikat xatosi tufayli ochilmadi; ularda yangiroq fayl bo'lishi mumkin. gov.uz dagi agentlik sahifasi ularning rasmiy ko'zgusi deb olindi.
- Namunaviy test 2023-yil, eng so'nggi (2025) spetsifikatsiyadan eski; tuzilishi (1–45 joylashuvi) mos keladi.
- Tahlil faqat bitta imtihon (2022-12-04) uchun; T-raqamlar o'sha variantdagi tartib raqami deb olingan.
