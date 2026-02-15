'use client';

import React from 'react';
import { View } from 'react-native';

type VStackProps = React.ComponentPropsWithoutRef<typeof View> & {
  className?: string;
};

const VStack = React.forwardRef<React.ElementRef<typeof View>, VStackProps>(
  ({ className, ...props }, ref) => {
    return (
      <View ref={ref} className={className ? `flex-col ${className}` : 'flex-col'} {...props} />
    );
  }
);

VStack.displayName = 'VStack';

export { VStack };
