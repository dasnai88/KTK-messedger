import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../controllers/chats_controller.dart';
import '../../models/models.dart';
import '../../services/api_client.dart';
import '../widgets/avatar.dart';
import 'chat_screen.dart';
import 'user_profile_screen.dart';

class UserSearchScreen extends StatefulWidget {
  const UserSearchScreen({super.key});

  @override
  State<UserSearchScreen> createState() => _UserSearchScreenState();
}

class _UserSearchScreenState extends State<UserSearchScreen> {
  final _controller = TextEditingController();
  bool _loading = false;
  List<UserSummary> _results = [];
  String? _creatingFor;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Search users'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: const InputDecoration(hintText: 'Username'),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _loading ? null : _search,
                  child: const Text('Search'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (_results.isEmpty)
              const Text('No users found')
            else
              Expanded(
                child: ListView.separated(
                  itemCount: _results.length,
                  separatorBuilder: (_, __) => const Divider(height: 16),
                  itemBuilder: (context, index) {
                    final user = _results[index];
                    final isCreating = _creatingFor == user.username;
                    return ListTile(
                      leading: Avatar(url: user.avatarUrl, label: user.displayLabel, size: 42),
                      title: Text(user.displayLabel),
                      subtitle: Text('@${user.username}'),
                      trailing: IconButton(
                        icon: const Icon(Icons.chat_bubble_outline),
                        onPressed: isCreating ? null : () => _startChat(user.username),
                      ),
                      onTap: () => _openProfile(user.username),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _search() async {
    final query = _controller.text.trim();
    if (query.length < 3) {
      _showError('Minimum 3 characters');
      return;
    }
    setState(() => _loading = true);
    try {
      final results = await context.read<ChatsController>().searchUsers(query);
      if (!mounted) return;
      setState(() => _results = results);
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _startChat(String username) async {
    setState(() => _creatingFor = username);
    try {
      final conversation = await context.read<ChatsController>().createConversation(username);
      if (!mounted || conversation == null) return;
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => ChatScreen(conversation: conversation)),
      );
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _creatingFor = null);
    }
  }

  void _openProfile(String username) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => UserProfileScreen(username: username)),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}
