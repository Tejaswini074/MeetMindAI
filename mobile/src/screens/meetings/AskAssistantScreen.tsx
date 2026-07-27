import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, Input, ScreenContainer } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useAskAssistantMutation } from '../../api/aiApi';
import type { AiQaResult } from '../../types/api';

interface Exchange {
  id: string;
  question: string;
  result: AiQaResult;
}

export function AskAssistantScreen() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<Exchange[]>([]);
  const [askAssistant, { isLoading, error }] = useAskAssistantMutation();

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    try {
      const result = await askAssistant(trimmed).unwrap();
      setHistory((prev) => [{ id: `${Date.now()}`, question: trimmed, result }, ...prev]);
      setQuestion('');
    } catch {
      // surfaced via `error`
    }
  };

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.composer}>
            <ComposerHeader />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nothing asked yet"
            subtitle="Try: “What did we decide about the Q3 roadmap?” — answers are drawn from transcripts across all your teams' meetings."
          />
        }
        renderItem={({ item }) => <ExchangeCard exchange={item} />}
      />

      <View style={styles.inputBar}>
        <Input
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask about any past meeting…"
          style={styles.input}
        />
        {error && <Text style={styles.error}>Something went wrong. Please try again.</Text>}
        <Button title="Ask" onPress={handleAsk} loading={isLoading} disabled={!question.trim()} />
      </View>
    </ScreenContainer>
  );
}

function ComposerHeader() {
  return (
    <>
      <Text style={typography.h1}>Ask AI</Text>
      <Text style={styles.subtitle}>
        Ask a question across every meeting you have access to — not just one.
      </Text>
    </>
  );
}

function ExchangeCard({ exchange }: { exchange: Exchange }) {
  return (
    <Card style={styles.card}>
      <Text style={typography.bodyBold}>{exchange.question}</Text>
      <Text style={styles.answer}>{exchange.result.answer}</Text>
      {exchange.result.sources.length > 0 && (
        <View style={styles.sources}>
          <Text style={typography.caption}>Sources</Text>
          {exchange.result.sources.map((source, index) => (
            <Text key={`${exchange.id}-${index}`} style={styles.sourceLine} numberOfLines={2}>
              • {source.meetingTitle}: “{source.excerpt}”
            </Text>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, flexGrow: 1 },
  composer: { marginBottom: spacing.lg },
  subtitle: { ...typography.caption, marginTop: spacing.xs },
  card: { marginBottom: spacing.md },
  answer: { ...typography.body, marginTop: spacing.sm },
  sources: { marginTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
  sourceLine: { ...typography.small, marginTop: spacing.xs },
  inputBar: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: { marginBottom: spacing.sm },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
});
