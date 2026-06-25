/**
 * Tests for ScoreBoard component.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ScoreBoard from '@/components/Quiz/ScoreBoard';
import confetti from 'canvas-confetti';

expect.extend(toHaveNoViolations);

jest.mock('canvas-confetti', () => jest.fn());

jest.mock('@/components/ui/TranslatedText', () => ({
  __esModule: true,
  default: ({ text, as: Component = 'span', className }: { text: string; as?: React.ElementType; className?: string }) => (
    <Component className={className}>{text}</Component>
  ),
}));

const mockResults = [
  { questionId: 'q1', selectedIndex: 1, isCorrect: true, timeTakenSeconds: 10 },
  { questionId: 'q2', selectedIndex: 2, isCorrect: false, timeTakenSeconds: 20 },
];

describe('ScoreBoard', () => {
  const onRetake = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ScoreBoard
        score={8}
        total={10}
        results={mockResults}
        knowledgeLevel="intermediate"
        performanceInsight="Great job!"
        countryName="India"
        onRetake={onRetake}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders score details correctly', () => {
    render(
      <ScoreBoard
        score={8}
        total={10}
        results={mockResults}
        knowledgeLevel="intermediate"
        performanceInsight="Great job!"
        countryName="India"
        onRetake={onRetake}
      />
    );

    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Great job!')).toBeInTheDocument();
    expect(screen.getAllByText('India')[0]).toBeInTheDocument();
  });

  it('calls onRetake when retake button is clicked', () => {
    render(
      <ScoreBoard
        score={8}
        total={10}
        results={mockResults}
        knowledgeLevel="intermediate"
        performanceInsight="Great job!"
        countryName="India"
        onRetake={onRetake}
      />
    );

    const button = screen.getByRole('button', { name: /retake the quiz/i });
    fireEvent.click(button);
    expect(onRetake).toHaveBeenCalledTimes(1);
  });

  it('triggers confetti on 100% score', () => {
    render(
      <ScoreBoard
        score={10}
        total={10}
        results={mockResults}
        knowledgeLevel="advanced"
        performanceInsight="Perfect!"
        countryName="India"
        onRetake={onRetake}
      />
    );

    expect(confetti).toHaveBeenCalledTimes(1);
    expect(confetti).toHaveBeenCalledWith({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ffffff'],
    });
  });

  it('does not trigger confetti on score below 100%', () => {
    render(
      <ScoreBoard
        score={9}
        total={10}
        results={mockResults}
        knowledgeLevel="intermediate"
        performanceInsight="Close!"
        countryName="India"
        onRetake={onRetake}
      />
    );

    expect(confetti).not.toHaveBeenCalled();
  });
});
