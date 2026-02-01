import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config.dart';
import '../models/models.dart';
import '../services/api_client.dart';

class ChatsController extends ChangeNotifier {
  ChatsController(this._api, this._prefs) {
    _loadBlocked();
    _loadPins();
  }

  static const _blockedKey = 'ktk_blocked_users';
  static const _pinsKey = 'ktk_pinned_messages';

  final ApiClient _api;
  final SharedPreferences _prefs;

  List<Conversation> conversations = [];
  final Map<String, List<Message>> _messages = {};
  final Set<String> onlineUsers = {};
  bool isLoading = false;
  String? _bootstrappedUserId;
  io.Socket? _socket;

  final Set<String> _blockedUsers = {};
  final Map<String, Message> _pinnedMessages = {};

  bool isBootstrappedFor(String? userId) => userId != null && _bootstrappedUserId == userId;

  List<Message> messagesFor(String conversationId) => _messages[conversationId] ?? [];

  bool isBlocked(String userId) => _blockedUsers.contains(userId);

  Message? pinnedFor(String conversationId) => _pinnedMessages[conversationId];

  Future<void> bootstrap(String? token, String? userId) async {
    if (token == null || token.isEmpty || userId == null) return;
    _bootstrappedUserId = userId;
    await loadConversations();
    await loadPresence();
    _connectSocket(token);
  }

  Future<void> loadConversations() async {
    isLoading = true;
    notifyListeners();
    try {
      final data = await _api.getJson('/conversations');
      final raw = data['conversations'] as List<dynamic>? ?? [];
      final list = raw.map((item) => Conversation.fromJson(item as Map<String, dynamic>)).toList();
      final filtered = list.where((item) => item.id.isNotEmpty).toList();
      if (kDebugMode && filtered.length != list.length) {
        debugPrint('Warning: filtered ${list.length - filtered.length} conversations with empty id');
        debugPrint('Raw conversations: $raw');
      }
      conversations = filtered;
      _sortConversations();
    } on ApiException {
      // ignore errors
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadPresence() async {
    try {
      final data = await _api.getJson('/presence');
      final raw = data['online'] as List<dynamic>? ?? [];
      onlineUsers
        ..clear()
        ..addAll(raw.map((id) => id.toString()));
      notifyListeners();
    } on ApiException {
      // ignore presence errors
    }
  }

  Future<List<Message>> loadMessages(String conversationId, {bool force = false}) async {
    if (conversationId.isEmpty) {
      throw ApiException('Chat is not ready');
    }
    if (_messages.containsKey(conversationId) && !force) {
      return _messages[conversationId]!;
    }
    try {
      final data = await _api.getJson('/conversations/$conversationId/messages');
      final raw = data['messages'] as List<dynamic>? ?? [];
      final list = raw.map((item) => Message.fromJson(item as Map<String, dynamic>)).toList();
      _messages[conversationId] = list;
      notifyListeners();
      return list;
    } on ApiException {
      return _messages[conversationId] ?? [];
    }
  }

  Future<Message?> sendMessage({
    required String conversationId,
    required String body,
    File? image,
  }) async {
    if (conversationId.isEmpty) {
      throw ApiException('Chat is not ready');
    }
    Map<String, dynamic> data;
    if (image != null) {
      data = await _api.postMultipart(
        '/conversations/$conversationId/messages',
        {'body': body},
        file: image,
        fileField: 'file',
      );
    } else {
      data = await _api.postJson('/conversations/$conversationId/messages', {'body': body});
    }
    final messageJson = data['message'];
    if (messageJson is Map<String, dynamic>) {
      final message = Message.fromJson(messageJson);
      final list = _messages.putIfAbsent(conversationId, () => []);
      list.add(message);
      _touchConversation(conversationId, _previewFor(message), message.createdAt);
      notifyListeners();
      return message;
    }
    return null;
  }

  Future<void> editMessage({
    required String conversationId,
    required String messageId,
    required String body,
  }) async {
    final data = await _api.patchJson('/messages/$messageId', {'body': body});
    final messageJson = data['message'];
    if (messageJson is Map<String, dynamic>) {
      final list = _messages[conversationId];
      if (list != null) {
        final index = list.indexWhere((item) => item.id == messageId);
        if (index >= 0) {
          list[index] = Message.fromJson(messageJson);
          notifyListeners();
        }
      }
    }
  }

  Future<void> deleteMessage({
    required String conversationId,
    required String messageId,
  }) async {
    await _api.deleteJson('/messages/$messageId');
    final list = _messages[conversationId];
    if (list == null) return;
    final index = list.indexWhere((item) => item.id == messageId);
    if (index >= 0) {
      list[index] = Message(
        id: list[index].id,
        senderId: list[index].senderId,
        senderUsername: list[index].senderUsername,
        senderDisplayName: list[index].senderDisplayName,
        senderAvatarUrl: list[index].senderAvatarUrl,
        body: '[deleted]',
        attachmentUrl: null,
        createdAt: list[index].createdAt,
      );
      notifyListeners();
    }
  }

  Future<Conversation?> createConversation(String username) async {
    final data = await _api.postJson('/conversations', {'username': username});
    final convoJson = data['conversation'];
    if (convoJson is Map<String, dynamic>) {
      final conversation = Conversation.fromJson(convoJson);
      if (conversation.id.isNotEmpty) {
        _upsertConversation(conversation);
        return conversation;
      }
    }
    await loadConversations();
    final found = conversations.firstWhere(
      (item) => !item.isGroup && item.other?.username == username,
      orElse: () => Conversation(id: '', isGroup: false),
    );
    if (found.id.isEmpty) {
      throw ApiException('Chat is not ready');
    }
    return found;
  }

  Future<Conversation?> createGroupConversation(String title, List<String> members) async {
    final data = await _api.postJson('/conversations/group', {
      'title': title,
      'members': members,
    });
    final convoJson = data['conversation'];
    if (convoJson is Map<String, dynamic>) {
      final conversation = Conversation.fromJson(convoJson);
      if (conversation.id.isNotEmpty) {
        _upsertConversation(conversation);
        return conversation;
      }
    }
    await loadConversations();
    final found = conversations.firstWhere(
      (item) => item.isGroup && (item.title ?? '') == title,
      orElse: () => Conversation(id: '', isGroup: true, title: title),
    );
    if (found.id.isEmpty) {
      throw ApiException('Chat is not ready');
    }
    return found;
  }

  Future<List<UserSummary>> searchUsers(String query) async {
    final encoded = Uri.encodeQueryComponent(query);
    final data = await _api.getJson('/users/search?username=$encoded');
    final raw = data['users'] as List<dynamic>? ?? [];
    return raw.map((item) => UserSummary.fromJson(item as Map<String, dynamic>)).toList();
  }

  void toggleBlock(String userId) {
    if (_blockedUsers.contains(userId)) {
      _blockedUsers.remove(userId);
    } else {
      _blockedUsers.add(userId);
    }
    _saveBlocked();
    notifyListeners();
  }

  void pinMessage(String conversationId, Message message) {
    _pinnedMessages[conversationId] = message;
    _savePins();
    notifyListeners();
  }

  void unpinMessage(String conversationId) {
    if (_pinnedMessages.containsKey(conversationId)) {
      _pinnedMessages.remove(conversationId);
      _savePins();
      notifyListeners();
    }
  }

  void disposeSocket() {
    _socket?.disconnect();
    _socket = null;
  }

  void reset() {
    conversations = [];
    _messages.clear();
    onlineUsers.clear();
    _bootstrappedUserId = null;
    disposeSocket();
    notifyListeners();
  }

  void _connectSocket(String token) {
    if (_socket != null) {
      _socket!.disconnect();
    }
    final socket = io.io(
      AppConfig.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    socket.on('presence', (data) {
      if (data is Map) {
        final userId = data['userId']?.toString() ?? '';
        final online = data['online'] == true;
        if (userId.isNotEmpty) {
          if (online) {
            onlineUsers.add(userId);
          } else {
            onlineUsers.remove(userId);
          }
          notifyListeners();
        }
      }
    });

    socket.on('message', (data) {
      if (data is Map) {
        final conversationId = data['conversationId']?.toString() ?? '';
        final messageJson = data['message'];
        if (conversationId.isEmpty || messageJson is! Map) return;
        final message = Message.fromJson(Map<String, dynamic>.from(messageJson));
        final list = _messages.putIfAbsent(conversationId, () => []);
        list.add(message);
        _touchConversation(conversationId, _previewFor(message), message.createdAt);
        notifyListeners();
      }
    });

    socket.connect();
    _socket = socket;
  }

  void _touchConversation(String conversationId, String body, DateTime? at) {
    final index = conversations.indexWhere((item) => item.id == conversationId);
    if (index >= 0) {
      conversations[index].lastMessage = body;
      conversations[index].lastAt = at ?? DateTime.now();
      _sortConversations();
    }
  }

  void _upsertConversation(Conversation conversation) {
    final index = conversations.indexWhere((item) => item.id == conversation.id);
    if (index >= 0) {
      conversations[index] = conversation;
    } else {
      conversations.insert(0, conversation);
    }
    _sortConversations();
    notifyListeners();
  }

  void _sortConversations() {
    conversations.sort((a, b) {
      final aTime = a.lastAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bTime = b.lastAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bTime.compareTo(aTime);
    });
  }

  String _previewFor(Message message) {
    final text = message.body?.trim() ?? '';
    if (text.isNotEmpty) return text;
    if (message.attachmentUrl != null && message.attachmentUrl!.isNotEmpty) {
      return '[image]';
    }
    return '';
  }

  void _loadBlocked() {
    try {
      final raw = _prefs.getString(_blockedKey);
      if (raw == null || raw.isEmpty) return;
      final list = List<String>.from((raw.split(',')));
      _blockedUsers
        ..clear()
        ..addAll(list.where((id) => id.isNotEmpty));
    } catch (_) {}
  }

  void _saveBlocked() {
    final value = _blockedUsers.join(',');
    _prefs.setString(_blockedKey, value);
  }

  void _loadPins() {
    try {
      final raw = _prefs.getString(_pinsKey);
      if (raw == null || raw.isEmpty) return;
      final Map<String, dynamic> data = Map<String, dynamic>.from(Uri.splitQueryString(raw));
      data.forEach((key, value) {
        if (key.isEmpty) return;
        final message = Message.fromJson(Map<String, dynamic>.from(Uri.splitQueryString(value)));
        _pinnedMessages[key] = message;
      });
    } catch (_) {}
  }

  void _savePins() {
    final Map<String, String> data = {};
    _pinnedMessages.forEach((key, value) {
      data[key] = Uri(queryParameters: {
        'id': value.id,
        'senderId': value.senderId,
        'senderUsername': value.senderUsername ?? '',
        'senderDisplayName': value.senderDisplayName ?? '',
        'senderAvatarUrl': value.senderAvatarUrl ?? '',
        'body': value.body ?? '',
        'attachmentUrl': value.attachmentUrl ?? '',
        'createdAt': value.createdAt?.toIso8601String() ?? ''
      }).query;
    });
    _prefs.setString(_pinsKey, Uri(queryParameters: data).query);
  }
}
