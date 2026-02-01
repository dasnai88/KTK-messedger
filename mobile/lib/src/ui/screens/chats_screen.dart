import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../controllers/chats_controller.dart';
import '../../models/models.dart';
import '../../services/api_client.dart';
import '../widgets/avatar.dart';
import '../widgets/app_nav.dart';
import 'chat_screen.dart';
import 'user_search_screen.dart';

class ChatsScreen extends StatefulWidget {
  const ChatsScreen({
    super.key,
    required this.currentIndex,
    required this.onNavigate,
    required this.canManage,
  });

  final int currentIndex;
  final ValueChanged<int> onNavigate;
  final bool canManage;

  @override
  State<ChatsScreen> createState() => _ChatsScreenState();
}

class _ChatsScreenState extends State<ChatsScreen> {
  final _newChatController = TextEditingController();

  @override
  void dispose() {
    _newChatController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final chats = context.watch<ChatsController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chats'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: _openSearch,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: chats.isLoading ? null : () => chats.loadConversations(),
          ),
        ],
      ),
      drawer: AppDrawer(
        currentIndex: widget.currentIndex,
        onNavigate: widget.onNavigate,
        canManage: widget.canManage,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildStartChat(chats),
          const SizedBox(height: 16),
          Text('Conversations', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (chats.isLoading && chats.conversations.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            ),
          ...chats.conversations.map((conversation) => _ConversationTile(conversation: conversation)),
          if (!chats.isLoading && chats.conversations.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: Text('No chats yet.')),
            ),
        ],
      ),
      bottomNavigationBar: AppBottomNav(
        currentIndex: widget.currentIndex,
        onNavigate: widget.onNavigate,
        canManage: widget.canManage,
      ),
    );
  }

  Widget _buildStartChat(ChatsController chats) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Start a chat', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _newChatController,
                    decoration: const InputDecoration(hintText: 'Username'),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () => _createChat(chats),
                  child: const Text('Go'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _openGroupDialog,
              icon: const Icon(Icons.group_add_outlined),
              label: const Text('Create group chat'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _createChat(ChatsController chats) async {
    final username = _newChatController.text.trim();
    if (username.isEmpty) {
      _showError('Enter a username');
      return;
    }
    try {
      final conversation = await chats.createConversation(username);
      if (!mounted) return;
      if (conversation != null) {
        _newChatController.clear();
        _openChat(conversation);
      }
    } on ApiException catch (error) {
      _showError(error.message);
    }
  }

  Future<void> _openGroupDialog() async {
    final titleController = TextEditingController();
    final membersController = TextEditingController();
    final result = await showDialog<_GroupPayload>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New group chat'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleController,
              decoration: const InputDecoration(labelText: 'Title'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: membersController,
              decoration: const InputDecoration(labelText: 'Members (comma separated)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(
                context,
                _GroupPayload(titleController.text.trim(), membersController.text.trim()),
              );
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
    if (!mounted || result == null) return;
    final title = result.title;
    final members = result.members
        .split(',')
        .map((name) => name.trim())
        .where((name) => name.isNotEmpty)
        .toList();
    if (title.isEmpty || members.length < 2) {
      _showError('Title and at least two members required');
      return;
    }
    try {
      final chats = context.read<ChatsController>();
      final conversation = await chats.createGroupConversation(title, members);
      if (!mounted) return;
      if (conversation != null) {
        _openChat(conversation);
      }
    } on ApiException catch (error) {
      _showError(error.message);
    }
  }

  void _openChat(Conversation conversation) {
    if (conversation.id.isEmpty) {
      _showError('Chat is not ready yet. Try again.');
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ChatScreen(conversation: conversation)),
    );
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  void _openSearch() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const UserSearchScreen()),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({required this.conversation});

  final Conversation conversation;

  @override
  Widget build(BuildContext context) {
    final chats = context.watch<ChatsController>();
    final online = !conversation.isGroup && conversation.other != null
        ? chats.onlineUsers.contains(conversation.other!.id)
        : false;

    return Card(
      margin: const EdgeInsets.only(top: 10),
      child: ListTile(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ChatScreen(conversation: conversation)),
        ),
        leading: Stack(
          children: [
            Avatar(url: conversation.other?.avatarUrl, label: conversation.displayTitle, size: 44),
            if (online)
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
          ],
        ),
        title: Text(conversation.displayTitle, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(
          conversation.lastMessage ?? 'No messages yet',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Text(_formatTime(conversation.lastAt)),
      ),
    );
  }

  String _formatTime(DateTime? date) {
    if (date == null) return '--:--';
    return DateFormat('HH:mm').format(date.toLocal());
  }
}

class _GroupPayload {
  _GroupPayload(this.title, this.members);

  final String title;
  final String members;
}
