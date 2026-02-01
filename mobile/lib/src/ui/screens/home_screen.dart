import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../controllers/auth_controller.dart';
import 'admin_screen.dart';
import 'chats_screen.dart';
import 'feed_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final isAdmin = auth.user?.isAdmin == true;
    final isModerator = auth.user?.isModerator == true;
    final canManage = isAdmin || isModerator;
    final tabs = <Widget>[
      FeedScreen(currentIndex: _index, onNavigate: _setIndex, canManage: canManage),
      ChatsScreen(currentIndex: _index, onNavigate: _setIndex, canManage: canManage),
      ProfileScreen(currentIndex: _index, onNavigate: _setIndex, canManage: canManage),
      if (canManage) AdminScreen(currentIndex: _index, onNavigate: _setIndex, canManage: canManage),
    ];

    return IndexedStack(
      index: _index,
      children: tabs,
    );
  }

  void _setIndex(int value) {
    if (_index == value) return;
    setState(() => _index = value);
  }
}
