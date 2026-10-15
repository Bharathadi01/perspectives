import { ReportReason, ReportTargetType } from '@perspective/contracts';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useBlock, useReport } from '../features/hooks';
import { errorMessage } from '../lib/errors';
import { REPORT_LABEL } from '../lib/labels';
import { theme } from '../theme';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { useToast } from './ui/Toast';

interface SafetyMenuProps {
  visible: boolean;
  onClose: () => void;
  target: { type: ReportTargetType; id: string; label: string };
  /** The person behind the content; enables Block. */
  userId?: string;
  /** Called after a report or block so the screen can hide the content locally. */
  onDone?: (action: 'reported' | 'blocked') => void;
}

/** Report and block, available on every profile, post, perspective and message. */
export function SafetyMenu({ visible, onClose, target, userId, onDone }: SafetyMenuProps) {
  const [step, setStep] = useState<'menu' | 'report'>('menu');
  const report = useReport();
  const block = useBlock();
  const toast = useToast();

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
    <Sheet
      visible={visible}
      onClose={close}
      title={step === 'menu' ? 'Safety' : 'Why are you reporting this?'}
      subtitle={step === 'report' ? `Reporting ${target.label}. The other person isn’t told who reported.` : undefined}
    >
      {step === 'menu' ? (
        <>
          <Row label={`Report ${target.label}`} onPress={() => setStep('report')} danger />
          {userId ? <Row label="Block this person" onPress={() => void submitBlock()} danger /> : null}
          <Button title="Cancel" variant="secondary" onPress={close} />
        </>
      ) : (
        <>
          {ReportReason.options.map((reason) => (
            <Row key={reason} label={REPORT_LABEL[reason]} onPress={() => void submitReport(reason)} />
          ))}
          <Button title="Back" variant="secondary" onPress={() => setStep('menu')} />
        </>
      )}
    </Sheet>
  );
}

function Row({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.row, pressed && s.pressed]}>
      <Text style={[s.rowText, danger && s.danger]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    minHeight: theme.touchTarget.min,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pressed: { opacity: 0.6 },
  rowText: { fontSize: theme.typography.fontSize.base, color: theme.colors.ink },
  danger: { color: theme.colors.danger, fontWeight: theme.typography.fontWeight.semibold },
});
