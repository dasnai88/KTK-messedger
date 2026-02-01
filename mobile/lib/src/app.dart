import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'controllers/auth_controller.dart';
import 'controllers/chats_controller.dart';
import 'controllers/posts_controller.dart';
import 'theme.dart';
import 'ui/screens/auth_screen.dart';
import 'ui/screens/home_screen.dart';
import 'ui/screens/splash_screen.dart';

class KtkApp extends StatelessWidget {
  const KtkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KTK Messenger',
      theme: buildAppTheme(),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final auth = context.read<AuthController>();
    await auth.bootstrap();
    if (!mounted) return;
    setState(() {
      _initialized = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const SplashScreen();
    }

    return Consumer<AuthController>(
      builder: (context, auth, _) {
        if (!auth.isAuthenticated) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            context.read<ChatsController>().reset();
            context.read<PostsController>().reset();
          });
          return const AuthScreen();
        }

        final posts = context.read<PostsController>();
        final chats = context.read<ChatsController>();
        if (!posts.isLoaded) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            posts.loadFeed().catchError((_) {});
          });
        }
        if (!chats.isBootstrappedFor(auth.userId)) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            chats.bootstrap(auth.token, auth.userId).catchError((_) {});
          });
        }

        return const HomeScreen();
      },
    );
  }
}
