import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../controllers/posts_controller.dart';
import '../../models/models.dart';
import '../../services/api_client.dart';
import 'avatar.dart';

class CommentsSheet extends StatefulWidget {
  const CommentsSheet({super.key, required this.post});

  final Post post;

  @override
  State<CommentsSheet> createState() => _CommentsSheetState();
}

class _CommentsSheetState extends State<CommentsSheet> {
  final _commentController = TextEditingController();
  bool _loading = false;
  bool _sending = false;
  List<Comment> _comments = [];

  @override
  void initState() {
    super.initState();
    _loadComments();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _loadComments() async {
    setState(() => _loading = true);
    final controller = context.read<PostsController>();
    try {
      _comments = await controller.loadComments(widget.post.id, force: true);
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              Container(
                width: 48,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.black12,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(height: 12),
              Text('Comments', style: theme.textTheme.titleMedium),
              const SizedBox(height: 12),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : ListView.separated(
                        controller: scrollController,
                        itemCount: _comments.length,
                        separatorBuilder: (_, __) => const Divider(height: 24),
                        itemBuilder: (context, index) {
                          final comment = _comments[index];
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Avatar(
                                url: comment.user.avatarUrl,
                                label: comment.user.displayLabel,
                                size: 36,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      comment.user.displayLabel,
                                      style: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(comment.body, style: theme.textTheme.bodyMedium),
                                  ],
                                ),
                              ),
                            ],
                          );
                        },
                      ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _commentController,
                      decoration: const InputDecoration(hintText: 'Add a comment...'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _sending ? null : _sendComment,
                    icon: _sending
                        ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.send),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _sendComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      final controller = context.read<PostsController>();
      final comment = await controller.addComment(widget.post.id, text);
      if (comment != null) {
        if (!mounted) return;
        setState(() {
          _comments.add(comment);
          _commentController.clear();
        });
      }
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}
