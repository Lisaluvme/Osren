import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// App-wide Material 3 theme, aligned with the web app's Bootstrap/Tailwind
/// palette (`tailwind.config.js`): primary `#007bff`, success `#28a745`,
/// danger `#dc3545`, warning `#ffc107`, info `#17a2b8`, body text `#212529`.
///
/// Uses the Inter typeface (`GoogleFonts.inter`) so the mobile app matches the
/// web app's typography.
class AppTheme {
  const AppTheme._();

  // --- Brand palette (mirrors the web app's tailwind.config.js) ---
  static const Color primary = Color(0xFF007BFF); // Bootstrap blue
  static const Color primaryDark = Color(0xFF0062CC);
  static const Color primaryLight = Color(0xFFE7F1FF);
  static const Color secondary = Color(0xFF6C757D);
  static const Color accent = Color(0xFF17A2B8); // info / teal
  static const Color success = Color(0xFF28A745);
  static const Color warning = Color(0xFFFFC107);
  static const Color danger = Color(0xFFDC3545);
  static const Color ink = Color(0xFF212529); // Bootstrap body text
  static const Color slate = Color(0xFF6C757D); // Bootstrap muted
  static const Color line = Color(0xFFE3E7ED); // hairline borders
  static const Color canvas = Color(0xFFF4F6F9); // app background

  /// Blue brand gradient for headers / hero areas.
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF007BFF), Color(0xFF0062CC)],
  );

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
      primary: primary,
      secondary: accent,
      error: danger,
      surface: Colors.white,
    );
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: canvas,
      // Inter across the board — matches the web app's font.
      textTheme: GoogleFonts.interTextTheme(_baseTextTheme),
    );
    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 19,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
        iconTheme: IconThemeData(color: Colors.white),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        shadowColor: const Color(0xFF1B2430).withValues(alpha: 0.06),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: line),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        hintStyle: const TextStyle(color: Color(0xFF9AA3AF)),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: const BorderSide(color: line),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: primary),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xFFEEF2F7),
        labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
        side: BorderSide.none,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: line,
        thickness: 1,
        space: 1,
      ),
      listTileTheme: const ListTileThemeData(
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        selectedItemColor: primary,
        unselectedItemColor: secondary,
      ),
    );
  }

  /// Inter text theme with Bootstrap-like ink colors and tighter headings.
  static const _baseTextTheme = TextTheme(
    displayLarge: TextStyle(
        fontSize: 28, fontWeight: FontWeight.w700, color: ink, height: 1.2),
    headlineMedium: TextStyle(
        fontSize: 22, fontWeight: FontWeight.w700, color: ink, height: 1.25),
    titleLarge: TextStyle(
        fontSize: 18, fontWeight: FontWeight.w600, color: ink),
    titleMedium: TextStyle(
        fontSize: 16, fontWeight: FontWeight.w600, color: ink),
    bodyLarge: TextStyle(fontSize: 15, color: ink, height: 1.4),
    bodyMedium: TextStyle(fontSize: 14, color: ink, height: 1.4),
    labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: ink),
  );
}
