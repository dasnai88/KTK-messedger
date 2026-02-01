import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/chats_controller.dart';
import '../../controllers/posts_controller.dart';
import '../../models/models.dart';
import '../../services/api_client.dart';
import '../widgets/avatar.dart';
import '../widgets/comments_sheet.dart';
import '../widgets/post_card.dart';
import 'chat_screen.dart';

class UserProfileScreen extends StatefulWidget {
  const UserProfileScreen({super.key, required this.username});

  final String username;

  @override
  State<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends State<UserProfileScreen> {
  User? _user;
  List<Post> _posts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiClient>();
      final postsController = context.read<PostsController>();
      final profileData = await api.getJson('/users/${widget.username}');
      final userJson = profileData['user'];
      if (userJson is Map<String, dynamic>) {
        _user = User.fromJson(userJson);
      }
      _posts = await postsController.loadProfilePosts(widget.username);
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final me = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.username),
        actions: [
          IconButton(
            icon: const Icon(Icons.chat_bubble_outline),
            onPressed: _user == null ? null : _startChat,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _user == null
              ? const Center(child: Text('User not found'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.only(bottom: 24),
                    children: [
                      _buildHeader(_user!),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text('Posts', style: Theme.of(context).textTheme.titleMedium),
                      ),
                      if (_posts.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(24),
                          child: Center(child: Text('No posts yet.')),
                        )
                      else
                        ..._posts.map(
                          (post) => PostCard(
                            post: post,
                            canEdit: me != null && (post.author.id == me.id || me.isAdmin),
                            onLike: () => context.read<PostsController>().toggleLike(post),
                            onRepost: () => context.read<PostsController>().toggleRepost(post),
                            onComments: () => _openComments(post),
                            onAuthorTap: () {},
                            onImageTap: post.imageUrl != null && post.imageUrl!.isNotEmpty
                                ? () => _openImage(post.imageUrl!)
                                : null,
                          ),
                        ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildHeader(User user) {
    final theme = Theme.of(context);
    final bannerUrl = AppConfig.resolveMediaUrl(user.bannerUrl);
    final me = context.read<AuthController>().user;
    final isMe = me != null && me.id == user.id;
    final chats = context.read<ChatsController>();
    final isBlocked = !isMe && chats.isBlocked(user.id);

    return Stack(
      children: [
        Container(
          height: 180,
          decoration: BoxDecoration(
            color: theme.colorScheme.primary.withValues(alpha: 0.2),
            image: bannerUrl.isNotEmpty
                ? DecorationImage(image: NetworkImage(bannerUrl), fit: BoxFit.cover)
                : null,
          ),
        ),
        Positioned(
          left: 16,
          bottom: 0,
          child: Avatar(
            url: user.avatarUrl,
            label: user.displayLabel,
            size: 84,
          ),
        ),
        Positioned(
          right: 16,
          bottom: 12,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                user.displayLabel,
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              Text('@${user.username}', style: theme.textTheme.bodySmall),
              const SizedBox(height: 8),
              if (!isMe)
                OutlinedButton(
                  onPressed: () {
                    chats.toggleBlock(user.id);
                    setState(() {});
                  },
                  child: Text(isBlocked ? 'Unblock' : 'Block'),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _startChat() async {
    if (_user == null) return;
    try {
      final conversation = await context.read<ChatsController>().createConversation(_user!.username);
      if (!mounted || conversation == null) return;
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => ChatScreen(conversation: conversation)),
      );
    } on ApiException catch (error) {
      _showError(error.message);
    }
  }

  Future<void> _openComments(Post post) async {
    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => CommentsSheet(post: post),
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

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}
