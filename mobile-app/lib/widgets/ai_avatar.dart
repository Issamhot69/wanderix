import 'package:flutter/material.dart';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

enum AvatarGender { male, female }
enum AvatarMood { welcome, excited, informative, empathetic, professional }

// ─────────────────────────────────────────
// Widget Avatar Principal
// ─────────────────────────────────────────

class WanderixAvatar extends StatefulWidget {
  final AvatarGender gender;
  final AvatarMood mood;
  final String position;
  final bool isLoading;
  final double size;

  const WanderixAvatar({
    Key? key,
    required this.gender,
    this.mood = AvatarMood.welcome,
    this.position = 'center',
    this.isLoading = false,
    this.size = 120,
  }) : super(key: key);

  @override
  State<WanderixAvatar> createState() => _WanderixAvatarState();
}

class _WanderixAvatarState extends State<WanderixAvatar>
    with TickerProviderStateMixin {

  // Colors
  static const Color _gold = Color(0xFFD4AF37);
  static const Color _accent = Color(0xFFE8A87C);
  static const Color _purple = Color(0xFF6C63FF);
  static const Color _dark = Color(0xFF3F3D56);

  // Animation Controllers
  late AnimationController _pulseController;
  late AnimationController _floatController;
  late AnimationController _glowController;

  late Animation<double> _pulseAnimation;
  late Animation<double> _floatAnimation;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _initAnimations();
  }

  void _initAnimations() {
    // Pulse — battement de coeur
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Float — lévitation douce
    _floatController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);

    _floatAnimation = Tween<double>(begin: -5, end: 5).animate(
      CurvedAnimation(parent: _floatController, curve: Curves.easeInOut),
    );

    // Glow — halo lumineux
    _glowController = AnimationController(
      duration: const Duration(milliseconds: 2500),
      vsync: this,
    )..repeat(reverse: true);

    _glowAnimation = Tween<double>(begin: 0.3, end: 0.8).animate(
      CurvedAnimation(parent: _glowController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _floatController.dispose();
    _glowController.dispose();
    super.dispose();
  }

  // ─────────────────────────────────────
  // Couleurs selon le genre
  // ─────────────────────────────────────

  List<Color> get _avatarColors {
    return widget.gender == AvatarGender.female
        ? [_accent, _gold]
        : [_purple, _dark];
  }

  // ─────────────────────────────────────
  // Emoji selon genre + mood
  // ─────────────────────────────────────

  String get _avatarEmoji {
    if (widget.gender == AvatarGender.female) {
      switch (widget.mood) {
        case AvatarMood.excited: return '🤩';
        case AvatarMood.empathetic: return '🥺';
        case AvatarMood.professional: return '👩‍💼';
        case AvatarMood.informative: return '💁‍♀️';
        default: return '👩';
      }
    } else {
      switch (widget.mood) {
        case AvatarMood.excited: return '🤩';
        case AvatarMood.empathetic: return '🫂';
        case AvatarMood.professional: return '👨‍💼';
        case AvatarMood.informative: return '💁‍♂️';
        default: return '👨';
      }
    }
  }

  // ─────────────────────────────────────
  // Couleur du halo selon le mood
  // ─────────────────────────────────────

  Color get _moodGlowColor {
    switch (widget.mood) {
      case AvatarMood.welcome: return _gold;
      case AvatarMood.excited: return Colors.orange;
      case AvatarMood.informative: return Colors.blue;
      case AvatarMood.empathetic: return Colors.pink;
      case AvatarMood.professional: return _purple;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([
        _pulseController,
        _floatController,
        _glowController,
      ]),
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, _floatAnimation.value),
          child: Transform.scale(
            scale: _pulseAnimation.value,
            child: _buildAvatarBody(),
          ),
        );
      },
    );
  }

  Widget _buildAvatarBody() {
    return Stack(
      alignment: Alignment.center,
      children: [
        // Halo extérieur
        Container(
          width: widget.size + 30,
          height: widget.size + 30,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: _moodGlowColor.withOpacity(_glowAnimation.value * 0.5),
                blurRadius: 30,
                spreadRadius: 10,
              ),
            ],
          ),
        ),

        // Cercle extérieur
        Container(
          width: widget.size + 16,
          height: widget.size + 16,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [
                _moodGlowColor.withOpacity(0.3),
                Colors.transparent,
              ],
            ),
            border: Border.all(
              color: _moodGlowColor.withOpacity(_glowAnimation.value),
              width: 2,
            ),
          ),
        ),

        // Avatar principal
        Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: _avatarColors,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: _avatarColors[0].withOpacity(0.4),
                blurRadius: 15,
                spreadRadius: 3,
              ),
            ],
          ),
          child: widget.isLoading
              ? _buildLoadingIndicator()
              : Center(
                  child: Text(
                    _avatarEmoji,
                    style: TextStyle(
                      fontSize: widget.size * 0.5,
                    ),
                  ),
                ),
        ),

        // Badge mood
        Positioned(
          bottom: 4,
          right: 4,
          child: _buildMoodBadge(),
        ),
      ],
    );
  }

  Widget _buildLoadingIndicator() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: CircularProgressIndicator(
        valueColor: AlwaysStoppedAnimation<Color>(_gold),
        strokeWidth: 3,
      ),
    );
  }

  Widget _buildMoodBadge() {
    final moodIcons = {
      AvatarMood.welcome: '👋',
      AvatarMood.excited: '⭐',
      AvatarMood.informative: 'ℹ️',
      AvatarMood.empathetic: '💙',
      AvatarMood.professional: '💼',
    };

    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 4,
          ),
        ],
      ),
      child: Center(
        child: Text(
          moodIcons[widget.mood] ?? '👋',
          style: const TextStyle(fontSize: 14),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// Widget Bulle de conversation
// ─────────────────────────────────────────

class AvatarSpeechBubble extends StatelessWidget {
  final String text;
  final bool isRTL;

  static const Color _gold = Color(0xFFD4AF37);
  static const Color _accent = Color(0xFFE8A87C);
  static const Color _white = Color(0xFFFFFFFF);

  const AvatarSpeechBubble({
    Key? key,
    required this.text,
    this.isRTL = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: isRTL ? TextDirection.rtl : TextDirection.ltr,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              _gold.withOpacity(0.15),
              _accent.withOpacity(0.1),
            ],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: _gold.withOpacity(0.4)),
          boxShadow: [
            BoxShadow(
              color: _gold.withOpacity(0.1),
              blurRadius: 10,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Text(
          text,
          style: const TextStyle(
            color: _white,
            fontSize: 15,
            height: 1.5,
            fontWeight: FontWeight.w400,
          ),
          textAlign: isRTL ? TextAlign.right : TextAlign.left,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// Widget Indicateur de frappe
// ─────────────────────────────────────────

class AvatarTypingIndicator extends StatefulWidget {
  const AvatarTypingIndicator({Key? key}) : super(key: key);

  @override
  State<AvatarTypingIndicator> createState() => _AvatarTypingIndicatorState();
}

class _AvatarTypingIndicatorState extends State<AvatarTypingIndicator>
    with TickerProviderStateMixin {

  static const Color _gold = Color(0xFFD4AF37);
  late List<AnimationController> _controllers;
  late List<Animation<double>> _animations;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(3, (i) =>
      AnimationController(
        duration: const Duration(milliseconds: 600),
        vsync: this,
      )..repeat(reverse: true, period: Duration(milliseconds: 600 + i * 200)),
    );

    _animations = _controllers.map((c) =>
      Tween<double>(begin: 0.3, end: 1.0).animate(c),
    ).toList();
  }

  @override
  void dispose() {
    for (var c in _controllers) c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: _gold.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _gold.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(3, (i) =>
          AnimatedBuilder(
            animation: _animations[i],
            builder: (context, child) => Container(
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: _gold.withOpacity(_animations[i].value),
                shape: BoxShape.circle,
              ),
            ),
          ),
        ),
      ),
    );
  }
}