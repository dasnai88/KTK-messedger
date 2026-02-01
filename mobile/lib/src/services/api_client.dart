import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient(this._prefs) {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseNormalized,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 20),
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = _token ?? _prefs.getString(_tokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          if (kDebugMode) {
            debugPrint('API ${options.method} ${options.uri}');
          }
          handler.next(options);
        },
      ),
    );
  }

  static const _tokenKey = 'ktk_token';
  final SharedPreferences _prefs;
  late final Dio _dio;
  String? _token;

  String? get token => _token ?? _prefs.getString(_tokenKey);

  void setToken(String? token) {
    _token = token;
    if (token == null || token.isEmpty) {
      _prefs.remove(_tokenKey);
    } else {
      _prefs.setString(_tokenKey, token);
    }
  }

  Future<Map<String, dynamic>> getJson(String path) async {
    try {
      final response = await _dio.get(_normalize(path));
      return _ensureMap(response.data);
    } on DioException catch (error) {
      throw ApiException(_parseError(error), statusCode: error.response?.statusCode);
    }
  }

  Future<Map<String, dynamic>> postJson(String path, Map<String, dynamic> body) async {
    try {
      final response = await _dio.post(_normalize(path), data: body);
      return _ensureMap(response.data);
    } on DioException catch (error) {
      throw ApiException(_parseError(error), statusCode: error.response?.statusCode);
    }
  }

  Future<Map<String, dynamic>> patchJson(String path, Map<String, dynamic> body) async {
    try {
      final response = await _dio.patch(_normalize(path), data: body);
      return _ensureMap(response.data);
    } on DioException catch (error) {
      throw ApiException(_parseError(error), statusCode: error.response?.statusCode);
    }
  }

  Future<Map<String, dynamic>> deleteJson(String path) async {
    try {
      final response = await _dio.delete(_normalize(path));
      return _ensureMap(response.data);
    } on DioException catch (error) {
      throw ApiException(_parseError(error), statusCode: error.response?.statusCode);
    }
  }

  Future<Map<String, dynamic>> postMultipart(
    String path,
    Map<String, dynamic> fields, {
    File? file,
    String? fileField,
  }) async {
    try {
      final formData = FormData.fromMap(fields);
      if (file != null && fileField != null) {
        final filename = file.path.split(Platform.pathSeparator).last;
        formData.files.add(
          MapEntry(
            fileField,
            await MultipartFile.fromFile(file.path, filename: filename),
          ),
        );
      }
      final response = await _dio.post(_normalize(path), data: formData);
      return _ensureMap(response.data);
    } on DioException catch (error) {
      throw ApiException(_parseError(error), statusCode: error.response?.statusCode);
    }
  }
}

Map<String, dynamic> _ensureMap(dynamic data) {
  if (data is Map<String, dynamic>) {
    return data;
  }
  if (data is Map) {
    return Map<String, dynamic>.from(data);
  }
  return <String, dynamic>{};
}

String _parseError(DioException error) {
  final data = error.response?.data;
  if (data is Map && data['error'] != null) {
    return data['error'].toString();
  }
  if (error.message != null && error.message!.isNotEmpty) {
    return error.message!;
  }
  return 'Unexpected error';
}

String _normalize(String path) {
  if (path.startsWith('/')) {
    return path;
  }
  return '/$path';
}
