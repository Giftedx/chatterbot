// Manual Jest mock for activation engine

export const autonomousActivationEngine = {
  addPolicy: jest.fn(),
  decideActivations: jest.fn(async (context) => {
    // Produce base decisions with a few key capabilities based on context
    const decisions = [];
    // Always consider core intelligence
    decisions.push({
      capabilityId: 'core-intelligence',
      action: 'activate',
      confidence: 0.9,
      reasoning: 'Core always on',
      expectedBenefit: 0.8,
      estimatedCost: 0.2,
      priority: 1.0,
    });

    // Advanced reasoning for complex/expert
    if (context.qualityRequirements.accuracy === 'high' || context.routingIntelligence.reasoningLevel) {
      decisions.push({
        capabilityId: 'advanced-reasoning',
        action: 'activate',
        confidence: 0.8,
        reasoning: 'Complex reasoning required',
        expectedBenefit: 0.75,
        estimatedCost: 0.4,
        priority: 0.9,
      });
    }

    // Multimodal if needed
    if (context.messageAnalysis.needsMultimodal) {
      decisions.push({
        capabilityId: 'multimodal-analysis',
        action: 'activate',
        confidence: 0.7,
        reasoning: 'Multimodal content detected',
        expectedBenefit: 0.6,
        estimatedCost: 0.6,
        priority: 0.6,
      });
    }

    return decisions;
  }),
  executeActivations: jest.fn(async () => {}),
};
