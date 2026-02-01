import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'src/app.dart';
import 'src/controllers/auth_controller.dart';
import 'src/controllers/chats_controller.dart';
import 'src/controllers/posts_controller.dart';
import 'src/services/api_client.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final api = ApiClient(prefs);

  runApp(
    MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: api),
        ChangeNotifierProvider(create: (_) => AuthController(api, prefs)),
        ChangeNotifierProvider(create: (_) => PostsController(api)),
        ChangeNotifierProvider(create: (_) => ChatsController(api, prefs)),
      ],
      child: const KtkApp(),
    ),
  );
}
