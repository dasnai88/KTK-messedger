import 'package:flutter/material.dart';

ThemeData buildAppTheme() {
  const primary = Color(0xFF0FA3B1);
  const secondary = Color(0xFFF7A072);
  const surface = Color(0xFFF9F7F2);
  const background = Color(0xFFF4F1EA);

  final scheme = ColorScheme.fromSeed(
    seedColor: primary,
    primary: primary,
    secondary: secondary,
    surface: surface,
  );

  final textTheme = ThemeData.light().textTheme.apply(
    bodyColor: const Color(0xFF1B1B1B),
    displayColor: const Color(0xFF1B1B1B),
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    textTheme: textTheme,
    scaffoldBackgroundColor: background,
    appBarTheme: const AppBarTheme(
      backgroundColor: surface,
      elevation: 0,
      centerTitle: false,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      surfaceTintColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      elevation: 1.5,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: background,
      selectedColor: secondary.withValues(alpha: 0.2),
      labelStyle: textTheme.labelLarge,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
  );
}
