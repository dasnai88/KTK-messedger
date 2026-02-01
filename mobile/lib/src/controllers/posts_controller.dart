import 'dart:io';

import 'package:flutter/foundation.dart';

import '../models/models.dart';
import '../services/api_client.dart';

class PostsController extends ChangeNotifier {
  PostsController(this._api);

  final ApiClient _api;

  List<Post> posts = [];
  bool isLoading = false;
  bool isLoaded = false;
  final Map<String, List<Comment>> _commentsCache = {};

  Future<void> loadFeed({bool force = false}) async {
    if (isLoading) return;
    if (isLoaded && !force) return;
    isLoading = true;
    notifyListeners();
    try {
      final data = await _api.getJson('/posts');
      final raw = data['posts'] as List<dynamic>? ?? [];
      posts = raw.map((item) => Post.fromJson(item as Map<String, dynamic>)).toList();
      isLoaded = true;
    } on ApiException {
      isLoaded = false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<Post?> createPost({required String body, File? image}) async {
    final data = await _api.postMultipart(
      '/posts',
      {'body': body},
      file: image,
      fileField: image != null ? 'image' : null,
    );
    final postJson = data['post'];
    if (postJson is Map<String, dynamic>) {
      final post = Post.fromJson(postJson);
      posts.insert(0, post);
      notifyListeners();
      return post;
    }
    return null;
  }

  Future<void> toggleLike(Post post) async {
    final data = await _api.postJson('/posts/${post.id}/like', {});
    post.liked = data['liked'] == true;
    post.likesCount = _toInt(data['likesCount']);
    notifyListeners();
  }

  Future<void> toggleRepost(Post post) async {
    final data = await _api.postJson('/posts/${post.id}/repost', {});
    post.reposted = data['reposted'] == true;
    post.repostsCount = _toInt(data['repostsCount']);
    notifyListeners();
  }

  Future<List<Comment>> loadComments(String postId, {bool force = false}) async {
    if (_commentsCache.containsKey(postId) && !force) {
      return _commentsCache[postId]!;
    }
    final data = await _api.getJson('/posts/$postId/comments');
    final raw = data['comments'] as List<dynamic>? ?? [];
    final comments = raw.map((item) => Comment.fromJson(item as Map<String, dynamic>)).toList();
    _commentsCache[postId] = comments;
    notifyListeners();
    return comments;
  }

  Future<Comment?> addComment(String postId, String body) async {
    final data = await _api.postJson('/posts/$postId/comments', {'body': body});
    final commentJson = data['comment'];
    if (commentJson is Map<String, dynamic>) {
      final comment = Comment.fromJson(commentJson);
      final list = _commentsCache.putIfAbsent(postId, () => []);
      list.add(comment);
      final index = posts.indexWhere((p) => p.id == postId);
      if (index >= 0) {
        posts[index].commentsCount += 1;
      }
      notifyListeners();
      return comment;
    }
    return null;
  }

  Future<void> editPost(String postId, String body) async {
    final data = await _api.patchJson('/posts/$postId', {'body': body});
    final postJson = data['post'];
    if (postJson is Map<String, dynamic>) {
      final index = posts.indexWhere((p) => p.id == postId);
      if (index >= 0) {
        posts[index] = Post.fromJson(postJson);
      }
      notifyListeners();
    }
  }

  Future<void> deletePost(String postId) async {
    await _api.deleteJson('/posts/$postId');
    posts.removeWhere((p) => p.id == postId);
    notifyListeners();
  }

  Future<List<Post>> loadProfilePosts(String username) async {
    final data = await _api.getJson('/users/$username/posts');
    final raw = data['posts'] as List<dynamic>? ?? [];
    return raw.map((item) => Post.fromJson(item as Map<String, dynamic>)).toList();
  }

  void reset() {
    posts = [];
    isLoaded = false;
    _commentsCache.clear();
    notifyListeners();
  }
}

int _toInt(dynamic value) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value == null) return 0;
  return int.tryParse(value.toString()) ?? 0;
}
