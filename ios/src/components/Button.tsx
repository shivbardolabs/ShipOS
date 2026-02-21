import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface Props {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  children,
}: Props) {
  const buttonStyle = getButtonStyle(variant, size, disabled);
  const textStyle = getTextStyle(variant, size);

  return (
    <TouchableOpacity
      style={[styles.base, buttonStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {children || <Text style={[styles.text, textStyle]}>{title}</Text>}
    </TouchableOpacity>
  );
}

function getButtonStyle(variant: ButtonVariant, size: ButtonSize, disabled: boolean): ViewStyle {
  const base: ViewStyle = {};

  // Variant
  switch (variant) {
    case 'primary':
      base.backgroundColor = disabled ? colors.primary + '60' : colors.primary;
      break;
    case 'secondary':
      base.backgroundColor = colors.surface;
      base.borderWidth = 1;
      base.borderColor = colors.border;
      break;
    case 'ghost':
      base.backgroundColor = 'transparent';
      break;
    case 'danger':
      base.backgroundColor = disabled ? colors.error + '60' : colors.error;
      break;
  }

  // Size
  switch (size) {
    case 'sm':
      base.paddingHorizontal = spacing.md;
      base.paddingVertical = spacing.sm;
      break;
    case 'md':
      base.paddingHorizontal = spacing.lg;
      base.paddingVertical = spacing.md;
      break;
    case 'lg':
      base.paddingHorizontal = spacing.xl;
      base.paddingVertical = spacing.lg;
      break;
  }

  return base;
}

function getTextStyle(variant: ButtonVariant, size: ButtonSize): TextStyle {
  const base: TextStyle = {};

  switch (variant) {
    case 'primary':
    case 'danger':
      base.color = colors.textPrimary;
      break;
    case 'secondary':
      base.color = colors.textSecondary;
      break;
    case 'ghost':
      base.color = colors.primary;
      break;
  }

  switch (size) {
    case 'sm':
      base.fontSize = fontSize.sm;
      break;
    case 'md':
      base.fontSize = fontSize.md;
      break;
    case 'lg':
      base.fontSize = fontSize.lg;
      break;
  }

  return base;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
