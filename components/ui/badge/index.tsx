'use client';

import React from 'react';
import { Text, View } from 'react-native';
import { tva, type VariantProps } from '@gluestack-ui/utils/nativewind-utils';

const badgeStyle = tva({
  base: 'flex-row items-center justify-center rounded-full min-w-[20px]',
  variants: {
    action: {
      error: 'bg-red-500 dark:bg-red-500',
      warning: 'bg-amber-500 dark:bg-amber-500',
      success: 'bg-green-500 dark:bg-green-500',
      info: 'bg-blue-500 dark:bg-blue-500',
      muted: 'bg-gray-400 dark:bg-gray-500',
    },
    variant: {
      solid: '',
      outline: 'border border-gray-300 dark:border-gray-600 bg-transparent',
    },
    size: {
      sm: 'h-5 min-w-[20px] px-1.5',
      md: 'h-6 min-w-[24px] px-2',
      lg: 'h-7 min-w-[28px] px-2.5',
    },
  },
  defaultVariants: {
    action: 'error',
    variant: 'solid',
    size: 'md',
  },
});

const badgeTextStyle = tva({
  base: 'text-white font-semibold',
  variants: {
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type BadgeProps = React.ComponentPropsWithoutRef<typeof View> &
  VariantProps<typeof badgeStyle> & {
    className?: string;
    textClassName?: string;
  };

type BadgeTextProps = React.ComponentPropsWithoutRef<typeof Text> & {
  className?: string;
};

const Badge = React.forwardRef<React.ElementRef<typeof View>, BadgeProps>(
  ({ className, textClassName, action, variant, size, children, ...props }, ref) => {
    return (
      <View
        ref={ref}
        {...props}
        className={badgeStyle({ action, variant, size, class: className })}
      >
        {typeof children === 'object' && React.isValidElement(children) ? (
          children
        ) : (
          <Text className={badgeTextStyle({ size, class: textClassName })}>
            {children}
          </Text>
        )}
      </View>
    );
  }
);

Badge.displayName = 'Badge';

const BadgeText = React.forwardRef<React.ElementRef<typeof Text>, BadgeTextProps>(
  ({ className, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        className={badgeTextStyle({ class: className })}
        {...props}
      />
    );
  }
);

BadgeText.displayName = 'BadgeText';

export { Badge, BadgeText };
