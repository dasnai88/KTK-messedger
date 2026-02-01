import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../config.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/posts_controller.dart';
import '../../models/models.dart';
import '../../services/api_client.dart';
import '../widgets/avatar.dart';
import '../widgets/app_nav.dart';
import '../widgets/comments_sheet.dart';
import '../widgets/post_card.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    super.key,
    required this.currentIndex,
    required this.onNavigate,
    required this.canManage,
  });

  final int currentIndex;
  final ValueChanged<int> onNavigate;
  final bool canManage;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _loadingPosts = false;
  List<Post> _posts = [];

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadPosts);
  }

  Future<void> _loadPosts() async {
    final auth = context.read<AuthController>();
    final username = auth.user?.username;
    if (username == null || username.isEmpty) return;
    setState(() => _loadingPosts = true);
    try {
      _posts = await context.read<PostsController>().loadProfilePosts(username);
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _loadingPosts = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: auth.logout,
          ),
        ],
      ),
      drawer: AppDrawer(
        currentIndex: widget.currentIndex,
        onNavigate: widget.onNavigate,
        canManage: widget.canManage,
      ),
      body: user == null
          ? const Center(child: Text('Not signed in'))
          : RefreshIndicator(
              onRefresh: () async {
                await auth.refreshMe();
                await _loadPosts();
              },
              child: ListView(
                padding: const EdgeInsets.only(bottom: 24),
                children: [
                  _buildHeader(user),
                  const SizedBox(height: 8),
                  _buildActions(user),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text('My posts', style: Theme.of(context).textTheme.titleMedium),
                  ),
                  if (_loadingPosts)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (_posts.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: Text('No posts yet.')),
                    )
                  else
                    ..._posts.map(
                      (post) => PostCard(
                        post: post,
                        canEdit: true,
                        onLike: () => context.read<PostsController>().toggleLike(post),
                        onRepost: () => context.read<PostsController>().toggleRepost(post),
                        onComments: () => _openComments(post),
                        onEdit: () => _openEditPost(post),
                        onDelete: () => _deletePost(post),
                        onImageTap: post.imageUrl != null && post.imageUrl!.isNotEmpty
                            ? () => _openImage(post.imageUrl!)
                            : null,
                      ),
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

  Widget _buildHeader(User user) {
    final theme = Theme.of(context);
    final bannerUrl = AppConfig.resolveMediaUrl(user.bannerUrl);

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
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActions(User user) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(user.bio ?? 'Add a bio', style: theme.textTheme.bodyMedium),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _InfoChip(label: user.role ?? 'role'),
                  if (user.themeColor != null && user.themeColor!.isNotEmpty)
                    _InfoChip(label: user.themeColor!),
                  if (user.isAdmin) const _InfoChip(label: 'admin'),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _openEditProfile,
                      icon: const Icon(Icons.edit_outlined),
                      label: const Text('Edit profile'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickAvatar,
                      icon: const Icon(Icons.photo_camera_outlined),
                      label: const Text('Avatar'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _pickBanner,
                  icon: const Icon(Icons.image_outlined),
                  label: const Text('Banner'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openEditProfile() async {
    final auth = context.read<AuthController>();
    final user = auth.user;
    if (user == null) return;
    final result = await showDialog<_ProfilePayload>(
      context: context,
      builder: (context) => _EditProfileDialog(user: user),
    );
    if (!mounted || result == null) return;
    try {
      await auth.updateProfile(
        displayName: result.displayName,
        bio: result.bio,
        username: result.username,
        role: result.role,
        themeColor: result.themeColor,
      );
    } on ApiException catch (error) {
      _showError(error.message);
    }
  }

  Future<void> _pickAvatar() async {
    final auth = context.read<AuthController>();
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 90);
    if (image == null) return;
    try {
      await auth.uploadAvatar(File(image.path));
    } on ApiException catch (error) {
      _showError(error.message);
    }
  }

  Future<void> _pickBanner() async {
    final auth = context.read<AuthController>();
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 90);
    if (image == null) return;
    try {
      await auth.uploadBanner(File(image.path));
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

  Future<void> _openEditPost(Post post) async {
    final controller = TextEditingController(text: post.body ?? '');
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit post'),
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
    if (!mounted || result == null || result.isEmpty) return;
    try {
      await context.read<PostsController>().editPost(post.id, result);
      await _loadPosts();
    } on ApiException catch (error) {
      _showError(error.message);
    }
  }

  Future<void> _deletePost(Post post) async {
    final confirm = await showDialog<bool>(
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
    if (!mounted || confirm != true) return;
    try {
      await context.read<PostsController>().deletePost(post.id);
      setState(() => _posts.removeWhere((item) => item.id == post.id));
    } on ApiException catch (error) {
      _showError(error.message);
    }
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

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(label: Text(label));
  }
}

class _EditProfileDialog extends StatefulWidget {
  const _EditProfileDialog({required this.user});

  final User user;

  @override
  State<_EditProfileDialog> createState() => _EditProfileDialogState();
}

class _EditProfileDialogState extends State<_EditProfileDialog> {
  late final TextEditingController _displayNameController;
  late final TextEditingController _bioController;
  late final TextEditingController _usernameController;
  late final TextEditingController _themeController;
  String _role = 'programmist';

  final _roles = const [
    'programmist',
    'tehnik',
    'polimer',
    'pirotehnik',
    'tehmash',
    'holodilchik',
  ];

  @override
  void initState() {
    super.initState();
    _displayNameController = TextEditingController(text: widget.user.displayName ?? '');
    _bioController = TextEditingController(text: widget.user.bio ?? '');
    _usernameController = TextEditingController(text: widget.user.username);
    _themeController = TextEditingController(text: widget.user.themeColor ?? '#2aa7ff');
    _role = widget.user.role ?? _roles.first;
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _bioController.dispose();
    _usernameController.dispose();
    _themeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Edit profile'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _displayNameController,
              decoration: const InputDecoration(labelText: 'Display name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _usernameController,
              decoration: const InputDecoration(labelText: 'Username'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _role,
              items: _roles
                  .map((role) => DropdownMenuItem(value: role, child: Text(role)))
                  .toList(),
              onChanged: (value) => setState(() => _role = value ?? _role),
              decoration: const InputDecoration(labelText: 'Role'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _bioController,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Bio'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _themeController,
              decoration: const InputDecoration(labelText: 'Theme color (hex)'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: () => Navigator.pop(
            context,
            _ProfilePayload(
              displayName: _displayNameController.text.trim(),
              bio: _bioController.text.trim(),
              username: _usernameController.text.trim(),
              role: _role,
              themeColor: _themeController.text.trim(),
            ),
          ),
          child: const Text('Save'),
        ),
      ],
    );
  }
}

class _ProfilePayload {
  const _ProfilePayload({
    required this.displayName,
    required this.bio,
    required this.username,
    required this.role,
    required this.themeColor,
  });

  final String displayName;
  final String bio;
  final String username;
  final String role;
  final String themeColor;
}
