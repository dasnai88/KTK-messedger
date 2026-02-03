import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../config.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/chats_controller.dart';
import '../../models/models.dart';
import '../../services/api_client.dart';
import '../widgets/message_bubble.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.conversation});

  final Conversation conversation;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  File? _attachment;
  bool _sending = false;
  bool _searchOpen = false;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    if (widget.conversation.id.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _showError('Chat is not ready');
        Navigator.pop(context);
      });
      return;
    }
    context.read<ChatsController>().setActiveConversation(widget.conversation.id);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadMessages());
  }

  @override
  void dispose() {
    context.read<ChatsController>().setActiveConversation(null);
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      await context.read<ChatsController>().loadMessages(widget.conversation.id, force: true);
      _scrollToBottom();
    } on ApiException catch (error) {
      _showError(error.message);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
    });
  }

  @override
  Widget build(BuildContext context) {
    final chats = context.watch<ChatsController>();
    final auth = context.watch<AuthController>();
    final messages = chats.messagesFor(widget.conversation.id);
    final pinned = chats.pinnedFor(widget.conversation.id);
    final filtered = _searchQuery.trim().isEmpty
        ? messages
        : messages.where((msg) => (msg.body ?? '').toLowerCase().contains(_searchQuery.trim().toLowerCase())).toList();
    final isDirect = !widget.conversation.isGroup;
    final otherId = widget.conversation.other?.id;
    final isBlocked = isDirect && otherId != null && chats.isBlocked(otherId);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.conversation.displayTitle),
        actions: [
          IconButton(
            icon: Icon(_searchOpen ? Icons.close : Icons.search),
            onPressed: () {
              setState(() {
                _searchOpen = !_searchOpen;
                if (!_searchOpen) _searchQuery = '';
              });
            },
          ),
        ],
      ),
      body: Column(
        children: [
          if (_searchOpen)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: TextField(
                decoration: const InputDecoration(hintText: 'Search messages'),
                onChanged: (value) => setState(() => _searchQuery = value),
              ),
            ),
          if (pinned != null)
            Container(
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.push_pin, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      pinned.body ?? '[image]',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () => chats.unpinMessage(widget.conversation.id),
                  ),
                ],
              ),
            ),
          if (isBlocked)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text('You blocked this user. Unblock to send messages.'),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => chats.loadMessages(widget.conversation.id, force: true),
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                itemCount: filtered.length,
                itemBuilder: (context, index) {
                  final message = filtered[index];
                  final isMe = auth.userId == message.senderId;
                  final showSender = widget.conversation.isGroup && !isMe;
                  return MessageBubble(
                    message: message,
                    isMe: isMe,
                    showSender: showSender,
                    onLongPress: (isMe || auth.user?.isAdmin == true)
                        ? () => _showMessageActions(message)
                        : null,
                    onImageTap: message.attachmentUrl != null && message.attachmentUrl!.isNotEmpty
                        ? () => _openImage(message.attachmentUrl!)
                        : null,
                  );
                },
              ),
            ),
          ),
          if (!isBlocked) _buildComposer(),
        ],
      ),
    );
  }

  Widget _buildComposer() {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          border: const Border(top: BorderSide(color: Colors.black12)),
        ),
        child: Column(
          children: [
            if (_attachment != null)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                child: Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(
                        _attachment!,
                        height: 120,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                    Positioned(
                      top: 4,
                      right: 4,
                      child: IconButton(
                        onPressed: () => setState(() => _attachment = null),
                        icon: const Icon(Icons.close),
                        color: Colors.white,
                        style: IconButton.styleFrom(backgroundColor: Colors.black54),
                      ),
                    ),
                  ],
                ),
              ),
            Row(
              children: [
                IconButton(
                  onPressed: _sending ? null : _pickAttachment,
                  icon: const Icon(Icons.photo_outlined),
                ),
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: const InputDecoration(hintText: 'Message'),
                    minLines: 1,
                    maxLines: 4,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _sending ? null : _sendMessage,
                  icon: _sending
                      ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.send),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickAttachment() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (image == null) return;
    setState(() => _attachment = File(image.path));
  }

  Future<void> _sendMessage() async {
    final body = _messageController.text.trim();
    if (body.isEmpty && _attachment == null) {
      _showError('Message is empty');
      return;
    }
    setState(() => _sending = true);
    try {
      await context.read<ChatsController>().sendMessage(
        conversationId: widget.conversation.id,
        body: body,
        image: _attachment,
      );
      if (!mounted) return;
      _messageController.clear();
      setState(() => _attachment = null);
      _scrollToBottom();
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  Future<void> _showMessageActions(Message message) async {
    final chats = context.read<ChatsController>();
    final isPinned = chats.pinnedFor(widget.conversation.id)?.id == message.id;
    final result = await showModalBottomSheet<_MessageAction>(
      context: context,
      builder: (context) => _MessageActionsSheet(message: message, isPinned: isPinned),
    );
    if (!mounted || result == null) return;
    if (result == _MessageAction.edit) {
      final updated = await _openEditDialog(message);
      if (!mounted) return;
      if (updated != null) {
        try {
          await context.read<ChatsController>().editMessage(
            conversationId: widget.conversation.id,
            messageId: message.id,
            body: updated,
          );
        } on ApiException catch (error) {
          _showError(error.message);
        }
      }
    } else if (result == _MessageAction.delete) {
      try {
        await context.read<ChatsController>().deleteMessage(
          conversationId: widget.conversation.id,
          messageId: message.id,
        );
      } on ApiException catch (error) {
        _showError(error.message);
      }
    } else if (result == _MessageAction.pin) {
      if (isPinned) {
        chats.unpinMessage(widget.conversation.id);
      } else {
        chats.pinMessage(widget.conversation.id, message);
      }
    }
  }

  Future<String?> _openEditDialog(Message message) async {
    final controller = TextEditingController(text: message.body ?? '');
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit message'),
        content: TextField(
          controller: controller,
          maxLines: 4,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Save')),
        ],
      ),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  void _openImage(String path) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        insetPadding: const EdgeInsets.all(16),
        child: InteractiveViewer(
          child: Image.network(AppConfig.resolveMediaUrl(path)),
        ),
      ),
    );
  }
}

enum _MessageAction { edit, delete, pin }

class _MessageActionsSheet extends StatelessWidget {
  const _MessageActionsSheet({required this.message, required this.isPinned});

  final Message message;
  final bool isPinned;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.edit_outlined),
            title: const Text('Edit'),
            onTap: () => Navigator.pop(context, _MessageAction.edit),
          ),
          ListTile(
            leading: const Icon(Icons.delete_outline),
            title: const Text('Delete'),
            onTap: () => Navigator.pop(context, _MessageAction.delete),
          ),
          ListTile(
            leading: const Icon(Icons.push_pin),
            title: Text(isPinned ? 'Unpin' : 'Pin'),
            onTap: () => Navigator.pop(context, _MessageAction.pin),
          ),
        ],
      ),
    );
  }
}
