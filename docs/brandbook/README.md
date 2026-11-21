# Brandbook paketi

Milliy sertifikat (Matematika) Android ilovasi uchun brend va dizayn materiallari.

| Papka / fayl | Nima |
|--------------|------|
| `brandbook.md` | Asosiy hujjat: shriftlar, ranglar, o'lchamlar, komponentlar, ikonkalar, holatlar, qoidalar |
| `assets/*.png`, `assets/*.svg` | 10 ta ko'rgazmali sahifa (1440 px kenglikda): logotip, ranglar, kontrast, shriftlar, o'lchamlar, komponentlar, ikonkalar, holatlar, ilova belgisi, ekranlar xaritasi |
| `tokens/` | Tayyor tokenlar: `tokens.json`, `colors.xml`, `dimens.xml`, `Color.kt`, `Type.kt` |
| `fonts/` | Nunito va Onest (o'zgaruvchan TTF, SIL OFL litsenziya matnlari bilan) |
| `build.cjs`, `render.cjs`, `tokens.cjs` | Chizmalar va tokenlarni qayta yaratish skriptlari (Node.js; PNG uchun Chrome yoki Edge) |

SVG fayllar shriftni `../fonts/` dan oladi: ularni ochganda `assets/` va `fonts/` papkalari yonma-yon turishi kerak.

Qayta yaratish:

    node build.cjs     # SVG
    node render.cjs    # PNG (Chrome/Edge)
    node tokens.cjs    # tokens/

Figma maketi (17 ekran): https://www.figma.com/design/EgMX8rtOFvqG3RbUiL3aKO
