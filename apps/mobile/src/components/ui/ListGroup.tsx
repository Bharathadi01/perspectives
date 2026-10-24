import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Card } from './Card';

interface ListGroupProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}

/** A captioned group of ListRows. The last row loses its separator. */
export function ListGroup({ title, footer, children }: ListGroupProps) {
  const rows = React.Children.toArray(children).filter(React.isValidElement);
  return (
    <View style={s.group}>
      {title ? <Text style={s.caption}>{title}</Text> : null}
      <Card elevation="none">
        {rows.map((row, i) =>
          React.cloneElement(row as React.ReactElement<{ last?: boolean }>, {
            last: i === rows.length - 1,
          }),
        )}
      </Card>
      {footer ? <Text style={s.footer}>{footer}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  group: { gap: theme.spacing.sm },
  caption: {
    ...theme.textStyles.overline,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.xs,
  },
  footer: {
    ...theme.textStyles.callout,
    color: theme.colors.muted,
    paddingHorizontal: theme.spacing.xs,
  },
});
