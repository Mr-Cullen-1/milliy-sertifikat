package uz.milliysertifikat.ui.theme

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
    val DisplayScore = TextStyle(fontFamily = Onest, fontWeight = FontWeight.Bold, fontSize = 44.sp, lineHeight = 52.sp)
    val HeadingH1 = TextStyle(fontFamily = Onest, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, lineHeight = 30.sp)
    val HeadingH2 = TextStyle(fontFamily = Onest, fontWeight = FontWeight.SemiBold, fontSize = 20.sp, lineHeight = 26.sp)
    val TitleSection = TextStyle(fontFamily = Nunito, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, lineHeight = 22.sp)
    val BodyLarge = TextStyle(fontFamily = Nunito, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, lineHeight = 24.sp)
    val BodyStrong = TextStyle(fontFamily = Nunito, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, lineHeight = 20.sp)
    val BodyRegular = TextStyle(fontFamily = Nunito, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp)
    val Caption = TextStyle(fontFamily = Nunito, fontWeight = FontWeight.Bold, fontSize = 12.sp, lineHeight = 16.sp)
    val Button = TextStyle(fontFamily = Nunito, fontWeight = FontWeight.Black, fontSize = 16.sp, lineHeight = 20.sp)
    val LabelNav = TextStyle(fontFamily = Nunito, fontWeight = FontWeight.ExtraBold, fontSize = 11.sp, lineHeight = 14.sp)
}
