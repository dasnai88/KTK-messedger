import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/api_client.dart';
import '../widgets/app_nav.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({
    super.key,
    required this.currentIndex,
    required this.onNavigate,
    required this.canManage,
  });

  final int currentIndex;
  final ValueChanged<int> onNavigate;
  final bool canManage;

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  final _searchController = TextEditingController();
  bool _loading = false;
  List<AdminUser> _users = [];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Admin')),
      drawer: AppDrawer(
        currentIndex: widget.currentIndex,
        onNavigate: widget.onNavigate,
        canManage: widget.canManage,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('User search', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          decoration: const InputDecoration(hintText: 'Username'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: _loading ? null : _searchUsers,
                        child: const Text('Search'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_users.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: Text('No users found.')),
            )
          else
            ..._users.map((user) => _AdminUserCard(user: user, onChanged: _updateUser)),
        ],
      ),
      bottomNavigationBar: AppBottomNav(
        currentIndex: widget.currentIndex,
        onNavigate: widget.onNavigate,
        canManage: widget.canManage,
      ),
    );
  }

  Future<void> _searchUsers() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      _showError('Enter a username');
      return;
    }
    setState(() => _loading = true);
    final api = context.read<ApiClient>();
    try {
      final encoded = Uri.encodeQueryComponent(query);
      final data = await api.getJson('/admin/users?q=$encoded');
      final raw = data['users'] as List<dynamic>? ?? [];
      if (!mounted) return;
      setState(() {
        _users = raw.map((item) => AdminUser.fromJson(item as Map<String, dynamic>)).toList();
      });
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _updateUser(AdminUser user) {
    final index = _users.indexWhere((item) => item.id == user.id);
    if (index >= 0) {
      setState(() {
        _users[index] = user;
      });
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _AdminUserCard extends StatefulWidget {
  const _AdminUserCard({required this.user, required this.onChanged});

  final AdminUser user;
  final ValueChanged<AdminUser> onChanged;

  @override
  State<_AdminUserCard> createState() => _AdminUserCardState();
}

class _AdminUserCardState extends State<_AdminUserCard> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final user = widget.user;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '@${user.username}',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text('Warnings: ${user.warningsCount}'),
            Text('Banned: ${user.isBanned ? 'yes' : 'no'}'),
            Text('Moderator: ${user.isModerator ? 'yes' : 'no'}'),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton(
                  onPressed: _busy ? null : () => _toggleBan(user),
                  child: Text(user.isBanned ? 'Unban' : 'Ban'),
                ),
                OutlinedButton(
                  onPressed: _busy ? null : () => _toggleModerator(user),
                  child: Text(user.isModerator ? 'Remove moderator' : 'Make moderator'),
                ),
                OutlinedButton(
                  onPressed: _busy ? null : () => _warnUser(user),
                  child: const Text('Warn'),
                ),
                OutlinedButton(
                  onPressed: _busy ? null : () => _clearWarnings(user),
                  child: const Text('Clear warnings'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _toggleBan(AdminUser user) async {
    final api = context.read<ApiClient>();
    setState(() => _busy = true);
    try {
      if (user.isBanned) {
        await api.postJson('/admin/unban', {'userId': user.id});
      } else {
        await api.postJson('/admin/ban', {'userId': user.id});
      }
      final updated = user.copyWith(isBanned: !user.isBanned);
      widget.onChanged(updated);
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _toggleModerator(AdminUser user) async {
    final api = context.read<ApiClient>();
    setState(() => _busy = true);
    try {
      await api.postJson('/admin/moder', {'userId': user.id, 'makeModerator': !user.isModerator});
      final updated = user.copyWith(isModerator: !user.isModerator);
      widget.onChanged(updated);
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _warnUser(AdminUser user) async {
    final reason = await _promptReason();
    if (!mounted || reason == null) return;
    final api = context.read<ApiClient>();
    setState(() => _busy = true);
    try {
      await api.postJson('/admin/warn', {'userId': user.id, 'reason': reason});
      final updated = user.copyWith(warningsCount: user.warningsCount + 1);
      widget.onChanged(updated);
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _clearWarnings(AdminUser user) async {
    final api = context.read<ApiClient>();
    setState(() => _busy = true);
    try {
      await api.postJson('/admin/clear-warnings', {'userId': user.id});
      final updated = user.copyWith(warningsCount: 0);
      widget.onChanged(updated);
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<String?> _promptReason() {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Warning reason'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Reason'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Send')),
        ],
      ),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class AdminUser {
  AdminUser({
    required this.id,
    required this.username,
    this.displayName,
    this.isBanned = false,
    this.isModerator = false,
    this.isAdmin = false,
    this.warningsCount = 0,
  });

  final String id;
  final String username;
  final String? displayName;
  final bool isBanned;
  final bool isModerator;
  final bool isAdmin;
  final int warningsCount;

  factory AdminUser.fromJson(Map<String, dynamic> json) {
    return AdminUser(
      id: _toStr(json['id']),
      username: (json['username'] ?? '').toString(),
      displayName: json['display_name']?.toString() ?? json['displayName']?.toString(),
      isBanned: json['is_banned'] == true || json['isBanned'] == true,
      isModerator: json['is_moderator'] == true || json['isModerator'] == true,
      isAdmin: json['is_admin'] == true || json['isAdmin'] == true,
      warningsCount: _toInt(json['warnings_count'] ?? json['warningsCount']),
    );
  }

  AdminUser copyWith({
    bool? isBanned,
    bool? isModerator,
    int? warningsCount,
  }) {
    return AdminUser(
      id: id,
      username: username,
      displayName: displayName,
      isBanned: isBanned ?? this.isBanned,
      isModerator: isModerator ?? this.isModerator,
      isAdmin: isAdmin,
      warningsCount: warningsCount ?? this.warningsCount,
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
