import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../config.dart';

class Avatar extends StatelessWidget {
  const Avatar({
    super.key,
    this.url,
    this.label,
    this.size = 40,
  });

  final String? url;
  final String? label;
  final double size;

  @override
  Widget build(BuildContext context) {
    final resolved = AppConfig.resolveMediaUrl(url);
    if (resolved.isEmpty) {
      return CircleAvatar(
        radius: size / 2,
        backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
        child: Text(
          _initials(label),
          style: TextStyle(color: Theme.of(context).colorScheme.primary),
        ),
      );
    }
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: Colors.transparent,
      child: ClipOval(
        child: CachedNetworkImage(
          imageUrl: resolved,
          width: size,
          height: size,
          fit: BoxFit.cover,
          placeholder: (_, __) => Container(
            width: size,
            height: size,
            color: Colors.black12,
          ),
          errorWidget: (_, __, ___) => Container(
            width: size,
            height: size,
            color: Colors.black12,
            alignment: Alignment.center,
            child: Text(_initials(label)),
          ),
        ),
      ),
    );
  }

  String _initials(String? value) {
    if (value == null || value.trim().isEmpty) {
      return '?';
    }
    final parts = value.trim().split(' ');
    if (parts.length == 1) {
      return parts.first.substring(0, 1).toUpperCase();
    }
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1)).toUpperCase();
  }
}
