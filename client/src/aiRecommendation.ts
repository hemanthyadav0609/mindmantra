// @ts-nocheck
import { average, getAdaptiveDifficulty, getRecent, normalizeProfile } from './centralEngine';

export function generateAIRecommendation({ history = [], profile = {} }: any = {}): any {
  const normalizedProfile = normalizeProfile(profile);
  const recent = getRecent(history, 5);
  const memory = recent.filter((item) => item.game === 'memory');
  const attention = recent.filter((item) => item.game === 'attention');
  const memoryAccuracy = average(memory.map((item) => item.accuracy));
  const attentionAccuracy = average(attention.map((item) => item.accuracy));
  const focus = normalizedProfile.goals.includes('Focus') || normalizedProfile.goals.includes('Attention')
    ? 'attention'
    : normalizedProfile.goals.includes('Memory')
      ? 'memory'
      : memoryAccuracy <= attentionAccuracy ? 'memory' : 'attention';
  const focusLabel = focus === 'memory' ? 'Memory' : 'Attention';
  const difficulty = getAdaptiveDifficulty(recent, normalizedProfile.difficulty);
  const duration = difficulty === 'Hard' ? 12 : difficulty === 'Easy' ? 8 : 10;
  const weakerAccuracy = focus === 'memory' ? memoryAccuracy : attentionAccuracy;
  const comparison = memoryAccuracy && attentionAccuracy
    ? `Your recent ${focusLabel.toLowerCase()} accuracy is ${Math.abs(memoryAccuracy - attentionAccuracy)} points below your other recent sessions.`
    : `Your recent sessions suggest a gentle ${focusLabel.toLowerCase()} practice would be useful today.`;
  return {
    focus,
    focusLabel,
    game: focus === 'memory' ? 'memory' : 'attention',
    difficulty,
    duration,
    reason: `${comparison} A short ${focusLabel} Game at ${difficulty} difficulty is a good next step.`,
    insight: weakerAccuracy ? `Recent ${focusLabel.toLowerCase()} accuracy: ${weakerAccuracy}%` : 'Complete a few sessions to make this recommendation more personal.',
    status: 'wellness-support',
    metrics: { memoryAccuracy, attentionAccuracy, sessionsAnalyzed: recent.length },
  };
}

export function getRecommendationSummary(recommendation: any) {
  return recommendation?.reason || 'Try a short, comfortable practice session today.';
}

export function getFocusDescription(focus: any) {
  return focus === 'memory' ? 'Recall patterns, details, and everyday information.' : 'Build calm, sustained attention and faster responses.';
}
