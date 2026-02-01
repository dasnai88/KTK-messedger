import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../controllers/auth_controller.dart';
import '../../controllers/posts_controller.dart';
import '../../models/models.dart';
import '../../services/api_client.dart';
import '../../config.dart';
import '../widgets/avatar.dart';
import '../widgets/app_nav.dart';
import '../widgets/comments_sheet.dart';
import '../widgets/post_card.dart';
import 'user_profile_screen.dart';

class FeedScreen extends StatefulWidget {
  const FeedScreen({
    super.key,
    required this.currentIndex,
    required this.onNavigate,
    required this.canManage,
  });

  final int currentIndex;
  final ValueChanged<int> onNavigate;
  final bool canManage;

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  final _composerController = TextEditingController();
  File? _composerImage;
  bool _sending = false;

  @override
  void dispose() {
    _composerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final postsController = context.watch<PostsController>();
    final auth = context.watch<AuthController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Feed'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: postsController.isLoading
                ? null
                : () => postsController.loadFeed(force: true),
          ),
        ],
      ),
      drawer: AppDrawer(
        currentIndex: widget.currentIndex,
        onNavigate: widget.onNavigate,
        canManage: widget.canManage,
      ),
      body: RefreshIndicator(
        onRefresh: () => postsController.loadFeed(force: true),
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            _buildComposer(context),
            const SizedBox(height: 8),
            if (postsController.isLoading && postsController.posts.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
            ...postsController.posts.map(
              (post) {
                final canEdit = auth.user != null &&
                    (post.author.id == auth.user!.id || auth.user!.isAdmin);
                return PostCard(
                  post: post,
                  canEdit: canEdit,
                  onLike: () => postsController.toggleLike(post),
                  onRepost: () => postsController.toggleRepost(post),
                  onComments: () => _openComments(post),
                  onEdit: canEdit ? () => _openEditPost(post) : null,
                  onDelete: canEdit ? () => _confirmDelete(post) : null,
                  onAuthorTap: () => _openUserProfile(post.author.username),
                  onImageTap: post.imageUrl != null && post.imageUrl!.isNotEmpty
                      ? () => _openImage(post.imageUrl!)
                      : null,
                );
              },
            ),
            if (!postsController.isLoading && postsController.posts.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('No posts yet.')),
              ),
          ],
        ),
      ),
      bottomNavigationBar: AppBottomNav(
        currentIndex: widget.currentIndex,
        onNavigate: widget.onNavigate,
        canManage: widget.canManage,
      ),
    );
  }

  Widget _buildComposer(BuildContext context) {
    final auth = context.read<AuthController>();
    final postsController = context.read<PostsController>();
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Avatar(
                  url: auth.user?.avatarUrl,
                  label: auth.user?.displayLabel,
                  size: 40,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _composerController,
                    maxLines: 3,
                    minLines: 1,
                    decoration: const InputDecoration(
                      hintText: 'Share an update...'
                    ),
                  ),
                ),
              ],
            ),
            if (_composerImage != null) ...[
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(
                  _composerImage!,
                  height: 160,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                IconButton(
                  onPressed: _sending ? null : _pickComposerImage,
                  icon: const Icon(Icons.photo_outlined),
                ),
                if (_composerImage != null)
                  TextButton(
                    onPressed: _sending
                        ? null
                        : () => setState(() => _composerImage = null),
                    child: const Text('Remove'),
                  ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: _sending
                      ? null
                      : () async {
                          final body = _composerController.text.trim();
                          if (body.isEmpty && _composerImage == null) {
                            _showError('Post is empty');
                            return;
                          }
                          setState(() => _sending = true);
                          try {
                            await postsController.createPost(
                              body: body,
                              image: _composerImage,
                            );
                            if (!mounted) return;
                            _composerController.clear();
                            setState(() => _composerImage = null);
                          } on ApiException catch (error) {
                            _showError(error.message);
                          } finally {
                            setState(() => _sending = false);
                          }
                        },
                  icon: const Icon(Icons.send),
                  label: _sending
                      ? const SizedBox(
                          height: 14,
                          width: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Post'),
                ),
              ],
            ),
            Text(
              'Logged in as @${auth.user?.username ?? ''}',
              style: theme.textTheme.bodySmall?.copyWith(color: Colors.black54),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickComposerImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (image == null) return;
    setState(() => _composerImage = File(image.path));
  }

  Future<void> _openComments(Post post) async {
    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => CommentsSheet(post: post),
    );
  }

  Future<void> _openEditPost(Post post) async {
    final controller = TextEditingController(text: post.body ?? '');
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit post'),
        content: TextField(
          controller: controller,
          maxLines: 4,
          decoration: const InputDecoration(hintText: 'Update text'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Save')),
        ],
      ),
    );
    if (!mounted || result == null || result.isEmpty) return;
    try {
      await context.read<PostsController>().editPost(post.id, result);
    } on ApiException catch (error) {
      _showError(error.message);
    }
  }

  Future<void> _confirmDelete(Post post) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete post'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
        ],
      ),
    );
    if (!mounted || result != true) return;
    try {
      await context.read<PostsController>().deletePost(post.id);
    } on ApiException catch (error) {
      _showError(error.message);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  void _openUserProfile(String username) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => UserProfileScreen(username: username)),
    );
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
