// Dizayn tokenlarini fayllarga yozadi: node docs/brandbook/tokens.cjs
// Manba: build.cjs dagi C (ranglar), SCALE (matn uslublari). Qiymatlar app/globals.css bilan bir xil.
const fs = require('fs');
const path = require('path');
const { C, GROUPS, SCALE, FIX } = require('./build.cjs');

const OUT = path.join(__dirname, 'tokens');
fs.mkdirSync(OUT, { recursive: true });
const up = (h) => h.toUpperCase();
const snake = (n) => n.replace(/-/g, '_');
const camel = (n) => n.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');

const usage = {};
for (const [, items] of GROUPS) for (const [n, u] of items) usage[n] = u;

const spacing = { 'space-4': 4, 'space-8': 8, 'space-12': 12, 'space-16': 16, 'space-20': 20, 'space-24': 24 };
const radius = { 'radius-10': 10, 'radius-12': 12, 'radius-14': 14, 'radius-16': 16, 'radius-20': 20, 'radius-24': 24, 'radius-28': 28, 'radius-pill': 999 };
const sizes = {
  'screen-width': 360, 'screen-height': 800, 'screen-margin': 16, 'status-bar': 24, 'top-bar': 56, 'bottom-nav': 80, 'exam-bottom-bar': 84,
  'button-height': 56, 'input-height': 56, 'keypad-key': 46, 'option-min-height': 60, 'option-badge': 34, 'touch-min': 48, 'icon-default': 24,
};
const weightName = { 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };

// ---- tokens.json ----
const json = {
  $description: 'Milliy sertifikat (Matematika) Android dizayn tokenlari. Manba: Figma "O\'yin" uslubi, app/globals.css',
  color: Object.fromEntries(Object.entries(C).map(([n, v]) => [n, { value: up(v), usage: usage[n] || '' }])),
  colorProposals: {
    note: 'Kontrast (WCAG AA 4.5:1) uchun hisoblangan takliflar; mavjud tokenlar o\'zgartirilmagan',
    'brand-on-white-text-ok': up(FIX.brand), 'placeholder-on-white': up(FIX.faint), 'success-on-white-text-ok': up(FIX.success), 'danger-text-on-danger-soft': up(FIX.danger),
  },
  typography: Object.fromEntries(SCALE.map(([n, fam, w, size, lh, , use]) => [n, { family: fam, weight: weightName[w], weightValue: w, sizeSp: size, lineHeightSp: lh, usage: use }])),
  spacingDp: spacing,
  radiusDp: radius,
  sizesDp: sizes,
  border: { widthDp: 2, bottomDp: { card: 4, button: 5, input: 2 }, align: 'inside' },
  elevation: { 'shadow-card': { offsetY: 8, blur: 20, spread: -10, color: '#1E1B39', alpha: 0.18 } },
  motion: { drawerMs: 220, sheetTopMs: 300, sheetTopEasing: 'cubic-bezier(0.22, 1, 0.36, 1)', reducedMotion: 'animatsiyani o\'chirish' },
  levels: [['A+', 70], ['A', 65], ['B+', 60], ['B', 55], ['C+', 50], ['C', 46]].map(([code, min]) => ({ code, minScore: min, maxScore: 75 })),
};
fs.writeFileSync(path.join(OUT, 'tokens.json'), JSON.stringify(json, null, 2) + '\n');

// ---- Android colors.xml ----
const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<!-- Milliy sertifikat: dizayn tokenlari (app/globals.css bilan bir xil) -->
<resources>
${Object.entries(C).map(([n, v]) => `    <color name="${snake(n)}">${up(v).replace('#', '#FF')}</color>`).join('\n')}
</resources>
`;
fs.writeFileSync(path.join(OUT, 'colors.xml'), colorsXml);

// ---- dimens.xml ----
const dimens = `<?xml version="1.0" encoding="utf-8"?>
<resources>
${Object.entries({ ...spacing, ...radius, ...sizes }).map(([n, v]) => `    <dimen name="${snake(n)}">${v}dp</dimen>`).join('\n')}
</resources>
`;
fs.writeFileSync(path.join(OUT, 'dimens.xml'), dimens);

// ---- Compose Color.kt ----
const colorKt = `package uz.milliysertifikat.ui.theme

import androidx.compose.ui.graphics.Color

// Dizayn tokenlari (app/globals.css bilan bir xil). Matn uchun kontrast jadvaliga qarang: brandbook.md, 3-bo'lim.
${Object.entries(C).map(([n, v]) => `val ${camel(n)} = Color(0xFF${up(v).slice(1)})`).join('\n')}
`;
fs.writeFileSync(path.join(OUT, 'Color.kt'), colorKt);

// ---- Compose Type.kt ----
const fw = (w) => `FontWeight.${{ 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' }[w]}`;
const typeKt = `package uz.milliysertifikat.ui.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import uz.milliysertifikat.R

// Shriftlar: res/font/nunito.ttf va res/font/onest.ttf (o'zgaruvchan shriftlar, docs/brandbook/fonts). API 26+.
private fun variable(res: Int, weight: Int) =
    Font(res, FontWeight(weight), variationSettings = FontVariation.Settings(FontVariation.weight(weight)))

val Nunito = FontFamily(listOf(600, 700, 800, 900).map { variable(R.font.nunito, it) })
val Onest = FontFamily(listOf(600, 700).map { variable(R.font.onest, it) })

object AppText {
${SCALE.map(([n, fam, w, size, lh]) => `    val ${n.replace(/[^A-Za-z0-9]/g, '')} = TextStyle(fontFamily = ${fam}, fontWeight = ${fw(w)}, fontSize = ${size}.sp, lineHeight = ${lh}.sp)`).join('\n')}
}
`;
fs.writeFileSync(path.join(OUT, 'Type.kt'), typeKt);
console.log('tokens:', fs.readdirSync(OUT).join(', '));
