import 'package:flutter/material.dart';
import '../../widgets/ai_avatar.dart';
import '../../services/booking_service.dart';

// ─────────────────────────────────────────
// Modèles
// ─────────────────────────────────────────

enum AvatarGender { male, female }
enum AvatarMood { welcome, excited, informative, empathetic, professional }

class AvatarMessage {
  final String text;
  final bool isAvatar;
  final AvatarMood mood;
  final DateTime timestamp;

  AvatarMessage({
    required this.text,
    required this.isAvatar,
    required this.mood,
    required this.timestamp,
  });
}

class AvatarAnimation {
  final String type;
  final String position;
  final int duration;

  AvatarAnimation({
    required this.type,
    required this.position,
    required this.duration,
  });

  factory AvatarAnimation.fromJson(Map<String, dynamic> json) {
    return AvatarAnimation(
      type: json['type'] ?? 'idle',
      position: json['position'] ?? 'center',
      duration: json['duration'] ?? 2000,
    );
  }
}

// ─────────────────────────────────────────
// Screen Principal
// ─────────────────────────────────────────

class AvatarScreen extends StatefulWidget {
  final String? destination;
  final String language;

  const AvatarScreen({
    Key? key,
    this.destination,
    this.language = 'en',
  }) : super(key: key);

  @override
  State<AvatarScreen> createState() => _AvatarScreenState();
}

class _AvatarScreenState extends State<AvatarScreen>
    with TickerProviderStateMixin {

  // State
  AvatarGender _selectedGender = AvatarGender.female;
  AvatarMood _currentMood = AvatarMood.welcome;
  AvatarAnimation _currentAnimation = AvatarAnimation(
    type: 'welcoming',
    position: 'center',
    duration: 3000,
  );
  bool _isLoading = false;
  String _currentText = '';
  List<AvatarMessage> _messages = [];
  bool _isRTL = false;

  // Controllers
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  late AnimationController _avatarAnimController;
  late AnimationController _bubbleAnimController;
  late Animation<Offset> _avatarSlideAnimation;
  late Animation<double> _bubbleFadeAnimation;

  // Couleurs Wanderix
  static const Color _primary = Color(0xFF1A1A2E);
  static const Color _accent = Color(0xFFE8A87C);
  static const Color _gold = Color(0xFFD4AF37);
  static const Color _white = Color(0xFFFFFFFF);

  @override
  void initState() {
    super.initState();
    _isRTL = widget.language == 'ar';
    _initAnimations();
    _loadWelcomeMessage();
  }

  void _initAnimations() {
    _avatarAnimController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _bubbleAnimController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );

    _avatarSlideAnimation = Tween<Offset>(
      begin: const Offset(0, 1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _avatarAnimController,
      curve: Curves.easeOutBack,
    ));

    _bubbleFadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _bubbleAnimController,
      curve: Curves.easeIn,
    ));

    _avatarAnimController.forward();
  }

  Future<void> _loadWelcomeMessage() async {
    setState(() => _isLoading = true);

    // Mock welcome message
    await Future.delayed(const Duration(milliseconds: 800));

    final welcomeTexts = {
      'en': 'Welcome to Wanderix! I\'m your personal travel guide. Where would you like to go?',
      'fr': 'Bienvenue sur Wanderix! Je suis votre guide personnel. Où souhaitez-vous aller?',
      'ar': 'مرحباً بك في Wanderix! أنا دليلك الشخصي. إلى أين تريد الذهاب؟',
      'es': '¡Bienvenido a Wanderix! Soy tu guía personal. ¿A dónde quieres ir?',
      'de': 'Willkommen bei Wanderix! Ich bin Ihr persönlicher Guide. Wohin möchten Sie reisen?',
    };

    final text = welcomeTexts[widget.language] ?? welcomeTexts['en']!;

    setState(() {
      _currentText = text;
      _currentMood = AvatarMood.welcome;
      _isLoading = false;
      _messages.add(AvatarMessage(
        text: text,
        isAvatar: true,
        mood: AvatarMood.welcome,
        timestamp: DateTime.now(),
      ));
    });

    _bubbleAnimController.forward();
  }

  Future<void> _sendMessage(String message) async {
    if (message.trim().isEmpty) return;

    _inputController.clear();

    // Ajouter message utilisateur
    setState(() {
      _messages.add(AvatarMessage(
        text: message,
        isAvatar: false,
        mood: AvatarMood.informative,
        timestamp: DateTime.now(),
      ));
      _isLoading = true;
    });

    _scrollToBottom();

    // Simuler réponse avatar
    await Future.delayed(const Duration(milliseconds: 1200));

    final responses = {
      'en': [
        'Great question! Let me find the best options for you.',
        'I\'d love to help you plan that! Wanderix has amazing deals.',
        'Excellent choice! This destination is absolutely stunning.',
      ],
      'fr': [
        'Excellente question! Laissez-moi trouver les meilleures options.',
        'Je serais ravie de vous aider à planifier cela!',
        'Excellent choix! Cette destination est absolument magnifique.',
      ],
      'ar': [
        'سؤال رائع! دعني أجد أفضل الخيارات لك.',
        'يسعدني مساعدتك في التخطيط لذلك!',
        'اختيار ممتاز! هذه الوجهة رائعة تماماً.',
      ],
    };

    final langResponses = responses[widget.language] ?? responses['en']!;
    final reply = langResponses[DateTime.now().millisecond % langResponses.length];

    setState(() {
      _currentText = reply;
      _currentMood = AvatarMood.excited;
      _isLoading = false;
      _messages.add(AvatarMessage(
        text: reply,
        isAvatar: true,
        mood: AvatarMood.excited,
        timestamp: DateTime.now(),
      ));
    });

    _scrollToBottom();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _avatarAnimController.dispose();
    _bubbleAnimController.dispose();
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: _isRTL ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: _primary,
        body: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              _buildAvatarSelector(),
              _buildAvatarZone(),
              _buildChatMessages(),
              _buildInputBar(),
            ],
          ),
        ),
      ),
    );
  }

  // ─────────────────────────────────────
  // Header
  // ─────────────────────────────────────

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: _primary,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 10,
          ),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: _white),
            onPressed: () => Navigator.pop(context),
          ),
          const SizedBox(width: 8),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [_gold, _accent],
              ),
            ),
            child: const Icon(Icons.auto_awesome, color: _white, size: 20),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _selectedGender == AvatarGender.female ? 'Sofia' : 'Karim',
                style: const TextStyle(
                  color: _white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'Wanderix AI Guide',
                style: TextStyle(
                  color: _white.withOpacity(0.6),
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.green.withOpacity(0.5)),
            ),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                const Text(
                  'Online',
                  style: TextStyle(color: Colors.green, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─────────────────────────────────────
  // Sélecteur Avatar
  // ─────────────────────────────────────

  Widget _buildAvatarSelector() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Row(
        children: [
          _buildGenderButton(AvatarGender.female, '👩 Sofia'),
          const SizedBox(width: 12),
          _buildGenderButton(AvatarGender.male, '👨 Karim'),
        ],
      ),
    );
  }

  Widget _buildGenderButton(AvatarGender gender, String label) {
    final isSelected = _selectedGender == gender;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedGender = gender;
          _messages.clear();
        });
        _loadWelcomeMessage();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          gradient: isSelected
              ? LinearGradient(colors: [_gold, _accent])
              : null,
          color: isSelected ? null : Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(25),
          border: Border.all(
            color: isSelected ? _gold : Colors.white.withOpacity(0.2),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? _white : _white.withOpacity(0.6),
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  // ─────────────────────────────────────
  // Zone Avatar
  // ─────────────────────────────────────

  Widget _buildAvatarZone() {
    return Container(
      height: 220,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Fond gradient
          Container(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                colors: [
                  _gold.withOpacity(0.1),
                  Colors.transparent,
                ],
              ),
            ),
          ),

          // Avatar animé
          SlideTransition(
            position: _avatarSlideAnimation,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Avatar image
                AnimatedContainer(
                  duration: Duration(milliseconds: _currentAnimation.duration),
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: _selectedGender == AvatarGender.female
                            ? [const Color(0xFFE8A87C), const Color(0xFFD4AF37)]
                            : [const Color(0xFF6C63FF), const Color(0xFF3F3D56)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: _gold.withOpacity(0.4),
                          blurRadius: 20,
                          spreadRadius: 5,
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        _selectedGender == AvatarGender.female ? '👩' : '👨',
                        style: const TextStyle(fontSize: 60),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                // Bulle de texte
                if (_currentText.isNotEmpty)
                  FadeTransition(
                    opacity: _bubbleFadeAnimation,
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 30),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: _gold.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: _gold.withOpacity(0.3)),
                      ),
                      child: _isLoading
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                _buildDot(0),
                                _buildDot(1),
                                _buildDot(2),
                              ],
                            )
                          : Text(
                              _currentText.length > 80
                                  ? _currentText.substring(0, 80) + '...'
                                  : _currentText,
                              style: const TextStyle(
                                color: _white,
                                fontSize: 13,
                              ),
                              textAlign: TextAlign.center,
                            ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDot(int index) {
    return TweenAnimationBuilder(
      tween: Tween<double>(begin: 0, end: 1),
      duration: Duration(milliseconds: 600 + (index * 200)),
      builder: (context, double value, child) {
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: _gold.withOpacity(value),
            shape: BoxShape.circle,
          ),
        );
      },
    );
  }

  // ─────────────────────────────────────
  // Messages Chat
  // ─────────────────────────────────────

  Widget _buildChatMessages() {
    return Expanded(
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: _messages.length,
        itemBuilder: (context, index) {
          final msg = _messages[index];
          return _buildMessageBubble(msg);
        },
      ),
    );
  }

  Widget _buildMessageBubble(AvatarMessage msg) {
    final isAvatar = msg.isAvatar;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment:
            isAvatar ? MainAxisAlignment.start : MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (isAvatar) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: _gold,
              child: Text(
                _selectedGender == AvatarGender.female ? '👩' : '👨',
                style: const TextStyle(fontSize: 16),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                gradient: isAvatar
                    ? LinearGradient(
                        colors: [
                          _gold.withOpacity(0.2),
                          _accent.withOpacity(0.1),
                        ],
                      )
                    : LinearGradient(
                        colors: [_gold, _accent],
                      ),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(isAvatar ? 4 : 18),
                  bottomRight: Radius.circular(isAvatar ? 18 : 4),
                ),
                border: isAvatar
                    ? Border.all(color: _gold.withOpacity(0.3))
                    : null,
              ),
              child: Text(
                msg.text,
                style: TextStyle(
                  color: _white,
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ),
          ),
          if (!isAvatar) const SizedBox(width: 8),
        ],
      ),
    );
  }

  // ─────────────────────────────────────
  // Input Bar
  // ─────────────────────────────────────

  Widget _buildInputBar() {
    final hints = {
      'en': 'Ask Sofia or Karim anything...',
      'fr': 'Posez une question à Sofia ou Karim...',
      'ar': 'اسأل صوفيا أو كريم أي شيء...',
      'es': 'Pregunta a Sofia o Karim...',
      'de': 'Fragen Sie Sofia oder Karim...',
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _primary,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(25),
                border: Border.all(color: _gold.withOpacity(0.3)),
              ),
              child: TextField(
                controller: _inputController,
                style: const TextStyle(color: _white),
                textDirection: _isRTL ? TextDirection.rtl : TextDirection.ltr,
                decoration: InputDecoration(
                  hintText: hints[widget.language] ?? hints['en'],
                  hintStyle: TextStyle(color: _white.withOpacity(0.4)),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                ),
                onSubmitted: _sendMessage,
              ),
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: () => _sendMessage(_inputController.text),
            child: Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [_gold, _accent],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: _gold.withOpacity(0.4),
                    blurRadius: 10,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: const Icon(
                Icons.send_rounded,
                color: _white,
                size: 22,
              ),
            ),
          ),
        ],
      ),
    );
  }
}