import 'package:flutter/material.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({
    super.key,
    required this.currentIndex,
    required this.onNavigate,
    required this.canManage,
  });

  final int currentIndex;
  final ValueChanged<int> onNavigate;
  final bool canManage;

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: SafeArea(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            ListTile(
              leading: const Icon(Icons.dynamic_feed),
              title: const Text('\u041B\u0435\u043D\u0442\u0430'),
              selected: currentIndex == 0,
              onTap: () => _handle(context, 0),
            ),
            ListTile(
              leading: const Icon(Icons.chat_bubble_outline),
              title: const Text('\u0427\u0430\u0442\u044B'),
              selected: currentIndex == 1,
              onTap: () => _handle(context, 1),
            ),
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: const Text('\u041F\u0440\u043E\u0444\u0438\u043B\u044C'),
              selected: currentIndex == 2,
              onTap: () => _handle(context, 2),
            ),
            if (canManage)
              ListTile(
                leading: const Icon(Icons.shield_outlined),
                title: const Text('\u0410\u0434\u043C\u0438\u043D \u043F\u0430\u043D\u0435\u043B\u044C'),
                selected: currentIndex == 3,
                onTap: () => _handle(context, 3),
              ),
          ],
        ),
      ),
    );
  }

  void _handle(BuildContext context, int index) {
    Navigator.pop(context);
    onNavigate(index);
  }
}

class AppBottomNav extends StatelessWidget {
  const AppBottomNav({
    super.key,
    required this.currentIndex,
    required this.onNavigate,
    required this.canManage,
  });

  final int currentIndex;
  final ValueChanged<int> onNavigate;
  final bool canManage;

  @override
  Widget build(BuildContext context) {
    final items = <BottomNavigationBarItem>[
      const BottomNavigationBarItem(icon: Icon(Icons.dynamic_feed), label: '\u041B\u0435\u043D\u0442\u0430'),
      const BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), label: '\u0427\u0430\u0442\u044B'),
      const BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: '\u041F\u0440\u043E\u0444\u0438\u043B\u044C'),
      if (canManage) const BottomNavigationBarItem(icon: Icon(Icons.shield_outlined), label: '\u0410\u0434\u043C\u0438\u043D'),
    ];

    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: onNavigate,
      items: items,
      type: BottomNavigationBarType.fixed,
    );
  }
}