class User {
  User({
    required this.id,
    required this.login,
    required this.username,
    this.displayName,
    this.role,
    this.bio,
    this.avatarUrl,
    this.bannerUrl,
    this.themeColor,
    this.isAdmin = false,
    this.isModerator = false,
    this.isBanned = false,
    this.warningsCount = 0,
    this.createdAt,
  });

  final String id;
  final String login;
  final String username;
  final String? displayName;
  final String? role;
  final String? bio;
  final String? avatarUrl;
  final String? bannerUrl;
  final String? themeColor;
  final bool isAdmin;
  final bool isModerator;
  final bool isBanned;
  final int warningsCount;
  final DateTime? createdAt;

  String get displayLabel => (displayName != null && displayName!.trim().isNotEmpty)
      ? displayName!.trim()
      : username;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: _toStr(json['id']),
      login: (json['login'] ?? '').toString(),
      username: (json['username'] ?? '').toString(),
      displayName: json['displayName']?.toString(),
      role: json['role']?.toString(),
      bio: json['bio']?.toString(),
      avatarUrl: json['avatarUrl']?.toString(),
      bannerUrl: json['bannerUrl']?.toString(),
      themeColor: json['themeColor']?.toString(),
      isAdmin: json['isAdmin'] == true,
      isModerator: json['isModerator'] == true,
      isBanned: json['isBanned'] == true,
      warningsCount: _toInt(json['warningsCount']),
      createdAt: _toDate(json['createdAt']),
    );
  }
}

class UserSummary {
  UserSummary({
    required this.id,
    required this.username,
    this.displayName,
    this.avatarUrl,
    this.role,
  });

  final String id;
  final String username;
  final String? displayName;
  final String? avatarUrl;
  final String? role;

  String get displayLabel => (displayName != null && displayName!.trim().isNotEmpty)
      ? displayName!.trim()
      : username;

  factory UserSummary.fromJson(Map<String, dynamic> json) {
    return UserSummary(
      id: _toStr(json['id']),
      username: (json['username'] ?? '').toString(),
      displayName: json['displayName']?.toString(),
      avatarUrl: json['avatarUrl']?.toString(),
      role: json['role']?.toString(),
    );
  }

  factory UserSummary.fromOtherJson(Map<String, dynamic> json) {
    return UserSummary(
      id: _toStr(json['id'] ?? json['other_id'] ?? json['otherId']),
      username: (json['username'] ?? json['other_username'] ?? '').toString(),
      displayName: (json['displayName'] ?? json['other_display_name'])?.toString(),
      avatarUrl: (json['avatarUrl'] ?? json['other_avatar_url'])?.toString(),
      role: (json['role'] ?? json['other_role'])?.toString(),
    );
  }
}

class Conversation {
  Conversation({
    required this.id,
    required this.isGroup,
    this.title,
    this.other,
    this.lastMessage,
    this.lastAt,
  });

  final String id;
  final bool isGroup;
  String? title;
  UserSummary? other;
  String? lastMessage;
  DateTime? lastAt;

  String get displayTitle {
    if (isGroup) {
      return (title != null && title!.trim().isNotEmpty) ? title!.trim() : 'Group chat';
    }
    return other?.displayLabel ?? 'Chat';
  }

  factory Conversation.fromJson(Map<String, dynamic> json) {
    final other = json['other'];
    return Conversation(
      id: _toStr(json['id']),
      isGroup: json['isGroup'] == true,
      title: json['title']?.toString(),
      other: other is Map<String, dynamic> ? UserSummary.fromOtherJson(other) : null,
      lastMessage: json['lastMessage']?.toString(),
      lastAt: _toDate(json['lastAt']),
    );
  }
}

class Message {
  Message({
    required this.id,
    required this.senderId,
    this.senderUsername,
    this.senderDisplayName,
    this.senderAvatarUrl,
    this.body,
    this.attachmentUrl,
    this.createdAt,
  });

  final String id;
  final String senderId;
  final String? senderUsername;
  final String? senderDisplayName;
  final String? senderAvatarUrl;
  final String? body;
  final String? attachmentUrl;
  final DateTime? createdAt;

  String get senderLabel {
    if (senderDisplayName != null && senderDisplayName!.trim().isNotEmpty) {
      return senderDisplayName!.trim();
    }
    if (senderUsername != null && senderUsername!.trim().isNotEmpty) {
      return senderUsername!.trim();
    }
    return 'User';
  }

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: _toStr(json['id']),
      senderId: _toStr(json['senderId'] ?? json['sender_id'] ?? json['fromUserId']),
      senderUsername: json['senderUsername']?.toString(),
      senderDisplayName: json['senderDisplayName']?.toString(),
      senderAvatarUrl: json['senderAvatarUrl']?.toString(),
      body: json['body']?.toString(),
      attachmentUrl: json['attachmentUrl']?.toString(),
      createdAt: _toDate(json['createdAt']),
    );
  }
}

class RepostInfo {
  RepostInfo({
    required this.id,
    this.authorUsername,
    this.authorDisplayName,
    this.body,
    this.imageUrl,
    this.createdAt,
  });

  final String id;
  final String? authorUsername;
  final String? authorDisplayName;
  final String? body;
  final String? imageUrl;
  final DateTime? createdAt;

  factory RepostInfo.fromJson(Map<String, dynamic> json) {
    return RepostInfo(
      id: _toStr(json['id']),
      authorUsername: json['authorUsername']?.toString(),
      authorDisplayName: json['authorDisplayName']?.toString(),
      body: json['body']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      createdAt: _toDate(json['createdAt']),
    );
  }
}

class Post {
  Post({
    required this.id,
    required this.author,
    this.body,
    this.imageUrl,
    this.createdAt,
    this.editedAt,
    this.deletedAt,
    this.likesCount = 0,
    this.commentsCount = 0,
    this.repostsCount = 0,
    this.liked = false,
    this.reposted = false,
    this.repostOf,
  });

  final String id;
  final UserSummary author;
  final String? body;
  final String? imageUrl;
  final DateTime? createdAt;
  final DateTime? editedAt;
  final DateTime? deletedAt;
  int likesCount;
  int commentsCount;
  int repostsCount;
  bool liked;
  bool reposted;
  final RepostInfo? repostOf;

  factory Post.fromJson(Map<String, dynamic> json) {
    final repost = json['repostOf'];
    return Post(
      id: _toStr(json['id']),
      author: UserSummary.fromJson(json['author'] as Map<String, dynamic>),
      body: json['body']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      createdAt: _toDate(json['createdAt']),
      editedAt: _toDate(json['editedAt']),
      deletedAt: _toDate(json['deletedAt']),
      likesCount: _toInt(json['likesCount']),
      commentsCount: _toInt(json['commentsCount']),
      repostsCount: _toInt(json['repostsCount']),
      liked: json['liked'] == true,
      reposted: json['reposted'] == true,
      repostOf: repost is Map<String, dynamic> ? RepostInfo.fromJson(repost) : null,
    );
  }
}

class Comment {
  Comment({
    required this.id,
    required this.user,
    required this.body,
    this.createdAt,
  });

  final String id;
  final UserSummary user;
  final String body;
  final DateTime? createdAt;

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: _toStr(json['id']),
      user: UserSummary.fromJson(json['user'] as Map<String, dynamic>),
      body: (json['body'] ?? '').toString(),
      createdAt: _toDate(json['createdAt']),
    );
  }
}

int _toInt(dynamic value) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value == null) return 0;
  return int.tryParse(value.toString()) ?? 0;
}

String _toStr(dynamic value) {
  if (value == null) return '';
  return value.toString();
}

DateTime? _toDate(dynamic value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  return DateTime.tryParse(value.toString());
}
