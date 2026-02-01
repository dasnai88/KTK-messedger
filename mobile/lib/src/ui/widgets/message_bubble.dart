import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../config.dart';
import '../../models/models.dart';

class MessageBubble extends StatelessWidget {
  const MessageBubble({
    super.key,
    required this.message,
    required this.isMe,
    required this.showSender,
    this.onLongPress,
    this.onImageTap,
  });

  final Message message;
  final bool isMe;
  final bool showSender;
  final VoidCallback? onLongPress;
  final VoidCallback? onImageTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bubbleColor = isMe ? theme.colorScheme.primary : theme.colorScheme.surfaceContainerHighest;
    final textColor = isMe ? Colors.white : Colors.black87;

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: onLongPress,
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
          decoration: BoxDecoration(
            color: bubbleColor,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (showSender)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(
                    message.senderLabel,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: isMe ? Colors.white70 : Colors.black54,
                    ),
                  ),
                ),
              if (message.body != null && message.body!.isNotEmpty)
                Text(
                  message.body!,
                  style: theme.textTheme.bodyMedium?.copyWith(color: textColor),
                ),
              if (message.attachmentUrl != null && message.attachmentUrl!.isNotEmpty) ...[
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: onImageTap,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: CachedNetworkImage(
                      imageUrl: AppConfig.resolveMediaUrl(message.attachmentUrl),
                      width: 180,
                      height: 140,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(
                        width: 180,
                        height: 140,
                        color: Colors.black12,
                      ),
                      errorWidget: (_, __, ___) => Container(
                        width: 180,
                        height: 140,
                        color: Colors.black12,
                        alignment: Alignment.center,
                        child: const Icon(Icons.broken_image_outlined),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
