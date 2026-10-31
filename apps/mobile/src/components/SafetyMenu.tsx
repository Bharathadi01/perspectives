import { ReportReason, ReportTargetType } from '@perspective/contracts';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useBlock, useReport } from '../features/hooks';
import { errorMessage } from '../lib/errors';
import { REPORT_LABEL } from '../lib/labels';
import { theme } from '../theme';
import { PaperSheet, SheetAction } from './editorial/PaperSheet';
import { CaretRightIcon, FlagIcon, ProhibitIcon } from './ui/icons';
import { useToast } from './ui/Toast';

const e = theme.editorial;

interface SafetyMenuProps {
  visible: boolean;
  onClose: () => void;
  target: { type: ReportTargetType; id: string; label: string };
  /** The person behind the content; enables Block. */
  userId?: string;
  /** Called after a report or block so the screen can hide the content locally. */
  onDone?: (action: 'reported' | 'blocked') => void;
}

/**
 * Report and block, available on every profile, post, perspective and message. In the editorial
 * look (2026-10-26): a paper sheet with the choices in a white block. What reporting and blocking do
 * is unchanged.
 */
export function SafetyMenu({ visible, onClose, target, userId, onDone }: SafetyMenuProps) {
  const [step, setStep] = useState<'menu' | 'report'>('menu');
  const report = useReport();
  const block = useBlock();
  const toast = useToast();
  const busy = report.isPending || block.isPending;

  const close = () => {
    setStep('menu');
    onClose();
  };

  const submitReport = async (reason: ReportReason) => {
    try {
      await report.run({ targetType: target.type, targetId: target.id, reason });
      toast('Thanks. We’ll review this, and it’s hidden for you.', 'success');
      close();
      onDone?.('reported');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const submitBlock = async () => {
    if (!userId) return;
    try {
      await block.run(userId);
      toast('Blocked. You won’t see each other anymore.', 'success');
      close();
      onDone?.('blocked');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <PaperSheet
      visible={visible}
      onClose={close}
      title={step === 'menu' ? 'Safety' : 'Why are you reporting this?'}
      subtitle={
        step === 'menu'
          ? 'Reports are private. Blocking hides you from each other everywhere.'
          : `Reporting ${target.label}. The other person isn’t told who reported.`
      }
    >
      {step === 'menu' ? (
        <>
          <View style={s.block}>
            <Row
              label={`Report ${target.label}`}
              icon={<FlagIcon size={20} color={e.colors.accent} />}
              onPress={() => setStep('report')}
              chevron
              disabled={busy}
            />
            {userId ? (
              <Row
                label="Block this person"
                icon={<ProhibitIcon size={20} color={e.colors.accent} />}
                onPress={() => void submitBlock()}
                last
                disabled={busy}
              />
            ) : null}
          </View>
          <SheetAction label="Cancel" onPress={close} />
        </>
      ) : (
        <>
          <View style={s.block}>
            {ReportReason.options.map((reason, i) => (
              <Row
                key={reason}
                label={REPORT_LABEL[reason]}
                onPress={() => void submitReport(reason)}
                last={i === ReportReason.options.length - 1}
                disabled={busy}
              />
            ))}
          </View>
          <SheetAction label="Back" onPress={() => setStep('menu')} />
        </>
      )}
    </PaperSheet>
  );
}

function Row({
  label,
  icon,
  onPress,
  chevron,
  last,
  disabled,
}: {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  chevron?: boolean;
  last?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.row, !last && s.rowLine, (pressed || disabled) && s.pressed]}
    >
      {icon}
      <Text style={s.rowText}>{label}</Text>
      {chevron ? <CaretRightIcon size={16} color={e.colors.muted} /> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  block: {
    backgroundColor: e.colors.surface,
    borderRadius: 20,
    borderWidth: theme.borderWidth.hairline,
    borderColor: e.colors.line,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 54,
    paddingHorizontal: theme.spacing.base,
  },
  rowLine: { borderBottomWidth: theme.borderWidth.hairline, borderBottomColor: e.colors.line },
  pressed: { opacity: theme.opacity.pressed },
  rowText: { flex: 1, fontFamily: e.fonts.bodyMedium, fontSize: 16, color: e.colors.ink },
});
