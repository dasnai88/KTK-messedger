import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../config.dart';
import '../../models/models.dart';
import 'avatar.dart';

class PostCard extends StatelessWidget {
  const PostCard({
    super.key,
    required this.post,
    required this.onLike,
    required this.onRepost,
    required this.onComments,
    this.onEdit,
    this.onDelete,
    this.canEdit = false,
    this.onAuthorTap,
    this.onImageTap,
  });

  final Post post;
  final VoidCallback onLike;
  final VoidCallback onRepost;
  final VoidCallback onComments;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final bool canEdit;
  final VoidCallback? onAuthorTap;
  final VoidCallback? onImageTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final timestamp = _formatTime(post.createdAt);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: onAuthorTap,
                  child: Avatar(url: post.author.avatarUrl, label: post.author.displayLabel, size: 42),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: onAuthorTap,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          post.author.displayLabel,
                          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          '@${post.author.username} - $timestamp',
                          style: theme.textTheme.bodySmall?.copyWith(color: Colors.black54),
                        ),
                      ],
                    ),
                  ),
                ),
                if (canEdit)
                  PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'edit' && onEdit != null) onEdit!();
                      if (value == 'delete' && onDelete != null) onDelete!();
                    },
                    itemBuilder: (_) => [
                      const PopupMenuItem(value: 'edit', child: Text('Edit')),
                      const PopupMenuItem(value: 'delete', child: Text('Delete')),
                    ],
                  ),
              ],
            ),
            if (post.repostOf != null) ...[
              const SizedBox(height: 12),
              _RepostCard(info: post.repostOf!),
            ],
            if (post.body != null && post.body!.trim().isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(post.body!.trim(), style: theme.textTheme.bodyMedium),
            ],
            if (post.imageUrl != null && post.imageUrl!.isNotEmpty) ...[
              const SizedBox(height: 12),
              GestureDetector(
                onTap: onImageTap,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: CachedNetworkImage(
                    imageUrl: AppConfig.resolveMediaUrl(post.imageUrl),
                    fit: BoxFit.cover,
                    width: double.infinity,
                    placeholder: (_, __) => Container(
                      height: 180,
                      color: Colors.black12,
                    ),
                    errorWidget: (_, __, ___) => Container(
                      height: 180,
                      color: Colors.black12,
                      alignment: Alignment.center,
                      child: const Icon(Icons.broken_image_outlined),
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                _ActionChip(
                  icon: post.liked ? Icons.favorite : Icons.favorite_border,
                  label: post.likesCount.toString(),
                  color: post.liked ? theme.colorScheme.primary : null,
                  onTap: onLike,
                ),
                const SizedBox(width: 8),
                _ActionChip(
                  icon: Icons.repeat,
                  label: post.repostsCount.toString(),
                  color: post.reposted ? theme.colorScheme.secondary : null,
                  onTap: onRepost,
                ),
                const SizedBox(width: 8),
                _ActionChip(
                  icon: Icons.mode_comment_outlined,
                  label: post.commentsCount.toString(),
                  onTap: onComments,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime? date) {
    if (date == null) return '--:--';
    return DateFormat('HH:mm').format(date.toLocal());
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: color ?? Colors.black87),
            const SizedBox(width: 6),
            Text(label, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _RepostCard extends StatelessWidget {
  const _RepostCard({required this.info});

  final RepostInfo info;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.surfaceContainerHighest),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Repost - @${info.authorUsername ?? 'user'}',
            style: theme.textTheme.bodySmall?.copyWith(color: Colors.black54),
          ),
          if (info.body != null && info.body!.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(info.body!.trim(), style: theme.textTheme.bodyMedium),
          ],
        ],
      ),
    );
  }
}
