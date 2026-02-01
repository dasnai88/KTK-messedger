import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import '../services/api_client.dart';

class AuthController extends ChangeNotifier {
  AuthController(this._api, this._prefs);

  final ApiClient _api;
  final SharedPreferences _prefs;

  User? user;
  bool isBusy = false;
  bool _bootstrapped = false;

  bool get isAuthenticated => user != null;
  String? get token => _api.token;
  String? get userId => user?.id;

  Future<void> bootstrap() async {
    if (_bootstrapped) return;
    _bootstrapped = true;
    final stored = _prefs.getString('ktk_token');
    if (stored == null || stored.isEmpty) {
      return;
    }
    _api.setToken(stored);
    try {
      final data = await _api.getJson('/me');
      user = User.fromJson(data['user'] as Map<String, dynamic>);
      notifyListeners();
    } on ApiException {
      _api.setToken(null);
    }
  }

  Future<void> login(String login, String password) async {
    _setBusy(true);
    try {
      final data = await _api.postJson('/auth/login', {
        'login': login,
        'password': password,
      });
      _api.setToken(data['token']?.toString());
      user = User.fromJson(data['user'] as Map<String, dynamic>);
      notifyListeners();
    } finally {
      _setBusy(false);
    }
  }

  Future<void> register({
    required String login,
    required String username,
    required String password,
    required String role,
  }) async {
    _setBusy(true);
    try {
      final data = await _api.postJson('/auth/register', {
        'login': login,
        'username': username,
        'password': password,
        'role': role,
      });
      _api.setToken(data['token']?.toString());
      user = User.fromJson(data['user'] as Map<String, dynamic>);
      notifyListeners();
    } finally {
      _setBusy(false);
    }
  }

  Future<void> refreshMe() async {
    final data = await _api.getJson('/me');
    user = User.fromJson(data['user'] as Map<String, dynamic>);
    notifyListeners();
  }

  Future<void> updateProfile({
    String? displayName,
    String? bio,
    String? username,
    String? role,
    String? themeColor,
  }) async {
    final payload = <String, dynamic>{};
    if (displayName != null) payload['displayName'] = displayName;
    if (bio != null) payload['bio'] = bio;
    if (username != null) payload['username'] = username;
    if (role != null) payload['role'] = role;
    if (themeColor != null) payload['themeColor'] = themeColor;
    final data = await _api.patchJson('/me', payload);
    user = User.fromJson(data['user'] as Map<String, dynamic>);
    notifyListeners();
  }

  Future<void> uploadAvatar(File file) async {
    final data = await _api.postMultipart('/me/avatar', {}, file: file, fileField: 'avatar');
    user = User.fromJson(data['user'] as Map<String, dynamic>);
    notifyListeners();
  }

  Future<void> uploadBanner(File file) async {
    final data = await _api.postMultipart('/me/banner', {}, file: file, fileField: 'banner');
    user = User.fromJson(data['user'] as Map<String, dynamic>);
    notifyListeners();
  }

  void logout() {
    user = null;
    _api.setToken(null);
    notifyListeners();
  }

  void _setBusy(bool value) {
    if (isBusy == value) return;
    isBusy = value;
    notifyListeners();
  }
}
