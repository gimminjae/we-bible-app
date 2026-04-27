'use client';

import React from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

type TableProps = React.ComponentPropsWithoutRef<typeof View> & {
  className?: string;
  contentClassName?: string;
  minWidth?: number;
};

const Table = React.forwardRef<React.ElementRef<typeof View>, TableProps>(
  ({ className = '', contentClassName = '', minWidth, style, children, ...props }, ref) => {
    const content = (
      <View
        className={contentClassName}
        style={minWidth ? ({ width: minWidth } satisfies ViewStyle) : { width: '100%' }}
      >
        {children}
      </View>
    );

    return (
      <View
        ref={ref}
        className={`overflow-hidden rounded-3xl border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900 ${className}`.trim()}
        style={style}
        {...props}
      >
        {minWidth ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            bounces={false}
            showsHorizontalScrollIndicator
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </View>
    );
  }
);

Table.displayName = 'Table';

type TableSectionProps = React.ComponentPropsWithoutRef<typeof View> & {
  className?: string;
};

const TableHeader = React.forwardRef<React.ElementRef<typeof View>, TableSectionProps>(
  ({ className = '', ...props }, ref) => (
    <View
      ref={ref}
      className={`w-full flex-row border-b border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/60 ${className}`.trim()}
      {...props}
    />
  )
);

TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<React.ElementRef<typeof View>, TableSectionProps>(
  ({ className = '', ...props }, ref) => (
    <View ref={ref} className={`w-full ${className}`.trim()} {...props} />
  )
);

TableBody.displayName = 'TableBody';

type TableRowProps = React.ComponentPropsWithoutRef<typeof Pressable> & {
  className?: string;
  selected?: boolean;
  isLast?: boolean;
};

const TableRow = React.forwardRef<React.ElementRef<typeof Pressable>, TableRowProps>(
  ({ className = '', selected = false, isLast = false, disabled, ...props }, ref) => (
    <Pressable
      ref={ref}
      disabled={disabled}
      className={[
        'w-full flex-row items-stretch',
        !isLast ? 'border-b border-gray-200 dark:border-gray-700' : '',
        selected ? 'bg-primary-50 dark:bg-primary-950/30' : 'bg-white dark:bg-gray-900',
        !disabled ? 'active:bg-gray-50 dark:active:bg-gray-800/80' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
);

TableRow.displayName = 'TableRow';

type TableTextProps = {
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
  style?: React.ComponentPropsWithoutRef<typeof View>['style'];
  numberOfLines?: number;
};

const isPrimitiveCellValue = (value: React.ReactNode) =>
  typeof value === 'string' || typeof value === 'number';

const TableHead = React.forwardRef<React.ElementRef<typeof View>, TableTextProps>(
  (
    { className = '', textClassName = '', style, numberOfLines = 1, children },
    ref
  ) => (
    <View
      ref={ref}
      className={`justify-center px-4 py-3 ${className}`.trim()}
      style={style}
    >
      <Text
        numberOfLines={numberOfLines}
        className={`text-xs font-semibold uppercase tracking-[0.6px] text-gray-500 dark:text-gray-400 ${textClassName}`.trim()}
      >
        {children}
      </Text>
    </View>
  )
);

TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<React.ElementRef<typeof View>, TableTextProps>(
  (
    { className = '', textClassName = '', style, numberOfLines, children },
    ref
  ) => (
    <View
      ref={ref}
      className={`justify-center px-4 py-3 ${className}`.trim()}
      style={style}
    >
      {isPrimitiveCellValue(children) ? (
        <Text
          numberOfLines={numberOfLines}
          className={`text-sm leading-5 text-gray-700 dark:text-gray-200 ${textClassName}`.trim()}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
);

TableCell.displayName = 'TableCell';

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
