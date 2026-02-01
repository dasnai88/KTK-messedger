import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../controllers/auth_controller.dart';
import '../../services/api_client.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _loginController = TextEditingController();
  final _loginPasswordController = TextEditingController();
  final _registerLoginController = TextEditingController();
  final _registerUsernameController = TextEditingController();
  final _registerPasswordController = TextEditingController();
  String _selectedRole = 'programmist';
  List<RoleOption> _roles = const [
    RoleOption('programmist', 'Programmer'),
    RoleOption('tehnik', 'Technician'),
    RoleOption('polimer', 'Polymer'),
    RoleOption('pirotehnik', 'Pyrotechnician'),
    RoleOption('tehmash', 'Techmash'),
    RoleOption('holodilchik', 'Cooling'),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadRoles();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _loginController.dispose();
    _loginPasswordController.dispose();
    _registerLoginController.dispose();
    _registerUsernameController.dispose();
    _registerPasswordController.dispose();
    super.dispose();
  }

  Future<void> _loadRoles() async {
    final api = context.read<ApiClient>();
    try {
      final data = await api.getJson('/roles');
      final raw = data['roles'] as List<dynamic>? ?? [];
      if (raw.isNotEmpty) {
        if (!mounted) return;
        setState(() {
          _roles = raw
              .map((item) => RoleOption(
                    item['value']?.toString() ?? '',
                    item['label']?.toString() ?? '',
                  ))
              .where((role) => role.value.isNotEmpty)
              .toList();
          if (_roles.isNotEmpty) {
            _selectedRole = _roles.first.value;
          }
        });
      }
    } catch (_) {
      // Keep fallback roles.
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final media = MediaQuery.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              Text(
                'KTK Messenger',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'Sign in to continue',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 24),
              TabBar(
                controller: _tabController,
                labelColor: Theme.of(context).colorScheme.primary,
                tabs: const [
                  Tab(text: 'Login'),
                  Tab(text: 'Register'),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildLogin(auth),
                    _buildRegister(auth),
                  ],
                ),
              ),
              if (media.viewInsets.bottom == 0) const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLogin(AuthController auth) {
    return SingleChildScrollView(
      child: Column(
        children: [
          TextField(
            controller: _loginController,
            decoration: const InputDecoration(labelText: 'Login or username'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _loginPasswordController,
            decoration: const InputDecoration(labelText: 'Password'),
            obscureText: true,
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: auth.isBusy ? null : _handleLogin,
              child: auth.isBusy
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Login'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRegister(AuthController auth) {
    return SingleChildScrollView(
      child: Column(
        children: [
          TextField(
            controller: _registerLoginController,
            decoration: const InputDecoration(labelText: 'Login'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _registerUsernameController,
            decoration: const InputDecoration(labelText: 'Username'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _registerPasswordController,
            decoration: const InputDecoration(labelText: 'Password'),
            obscureText: true,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _selectedRole,
            items: _roles
                .map((role) => DropdownMenuItem<String>(
                      value: role.value,
                      child: Text(role.label.isEmpty ? role.value : role.label),
                    ))
                .toList(),
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _selectedRole = value;
              });
            },
            decoration: const InputDecoration(labelText: 'Role'),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: auth.isBusy ? null : _handleRegister,
              child: auth.isBusy
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Create account'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleLogin() async {
    final auth = context.read<AuthController>();
    try {
      await auth.login(_loginController.text.trim(), _loginPasswordController.text.trim());
    } on ApiException catch (error) {
      _showError(error.message);
    }
  }

  Future<void> _handleRegister() async {
    final auth = context.read<AuthController>();
    try {
      await auth.register(
        login: _registerLoginController.text.trim(),
        username: _registerUsernameController.text.trim(),
        password: _registerPasswordController.text.trim(),
        role: _selectedRole,
      );
    } on ApiException catch (error) {
      _showError(error.message);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}

class RoleOption {
  const RoleOption(this.value, this.label);

  final String value;
  final String label;
}
